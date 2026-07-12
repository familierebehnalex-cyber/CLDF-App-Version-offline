'use strict';

(() => {
  const CATALOG = window.CLDF_RADIO_API_DATA || { stations: [] };
  const STORAGE_KEY = 'cldf.v2.radioLiveApiEntries';
  const STATUS_KEY = 'cldf.v2.radioLiveApiStatus';
  const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
  const REQUEST_TIMEOUT_MS = 8000;
  const MAX_ENTRIES = 500;
  let refreshPromise = null;
  let refreshTimer = null;

  const normalize = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage?.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      // Die App funktioniert auch ohne verfügbaren lokalen Speicher.
    }
  }

  function getCachedEntries() {
    const entries = readJson(STORAGE_KEY, []);
    return Array.isArray(entries) ? entries : [];
  }

  function getStatus() {
    return readJson(STATUS_KEY, {
      active: false,
      lastAttemptAt: null,
      lastSuccessAt: null,
      successfulStations: 0,
      failedStations: 0,
      cachedEntries: getCachedEntries().length,
    });
  }

  function isJingle(raw = {}) {
    const type = normalize(raw.type || 'song');
    const title = normalize(raw.title || '');
    if (type && type !== 'song') return true;
    return /\b(jingle|promo|werbung|station id|laut fm)\b/i.test(title);
  }

  function splitLinedanceTitle(rawTitle = '') {
    const parts = String(rawTitle).split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) return { title: String(rawTitle).trim(), candidateDances: [] };
    const title = parts.shift();
    const dance = parts.join(' - ').trim();
    if (!dance || normalize(title) === normalize(dance)) return { title, candidateDances: [] };
    return { title, candidateDances: [dance] };
  }

  function toEntry(raw, station, endpoint) {
    if (!raw || typeof raw !== 'object') return null;
    const rawTitle = String(raw.title || '').trim();
    const artist = String(raw.artist?.name || raw.artist || '').trim();
    if (!rawTitle || isJingle(raw)) return null;

    const parsed = station.name === 'linedance_nahetal'
      ? splitLinedanceTitle(rawTitle)
      : { title: rawTitle, candidateDances: [] };
    const title = parsed.title || rawTitle;
    const startedAt = String(raw.started_at || raw.startedAt || '').trim();
    const id = String(raw.id || '').trim();
    const key = `${normalize(artist)}|${normalize(title)}`;
    if (!normalize(title)) return null;

    return {
      key,
      artist,
      title,
      rawTitles: [rawTitle],
      stations: [station.name],
      genres: [String(raw.genre || '').trim()].filter(Boolean),
      releaseYears: [String(raw.releaseyear || raw.releaseYear || '').trim()].filter(Boolean),
      radioDances: [...parsed.candidateDances],
      databaseDances: [],
      candidateDances: [...parsed.candidateDances],
      exactDanceCandidates: [],
      confidences: parsed.candidateDances.length ? ['Vorschlag aus Sendertext'] : ['keine'],
      matchMethods: parsed.candidateDances.length ? ['Lied – Tanz aus Sendertext'] : ['keine lokale Zuordnung gefunden'],
      parserMethods: parsed.candidateDances.length ? ['linedance-nahetal-title-pattern'] : ['live-api'],
      firstPlayedAt: startedAt,
      lastPlayedAt: startedAt,
      firstCollectedAt: new Date().toISOString(),
      lastCollectedAt: new Date().toISOString(),
      playCount: 1,
      apiSongIds: id ? [id] : [],
      isJingle: false,
      liveApi: true,
      sourceEndpoint: endpoint,
    };
  }

  function extractSongs(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    for (const key of ['songs', 'last_songs', 'items', 'results']) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    if (payload.current_song && typeof payload.current_song === 'object') return [payload.current_song];
    if (payload.title || payload.artist) return [payload];
    return [];
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function mergeEntries(existing, incoming) {
    const merged = new Map();
    for (const entry of [...existing, ...incoming]) {
      if (!entry?.key || !entry?.title) continue;
      const previous = merged.get(entry.key);
      if (!previous) {
        merged.set(entry.key, { ...entry });
        continue;
      }
      merged.set(entry.key, {
        ...previous,
        ...entry,
        rawTitles: [...new Set([...(previous.rawTitles || []), ...(entry.rawTitles || [])])],
        stations: [...new Set([...(previous.stations || []), ...(entry.stations || [])])],
        genres: [...new Set([...(previous.genres || []), ...(entry.genres || [])])],
        releaseYears: [...new Set([...(previous.releaseYears || []), ...(entry.releaseYears || [])])],
        radioDances: [...new Set([...(previous.radioDances || []), ...(entry.radioDances || [])])],
        candidateDances: [...new Set([...(previous.candidateDances || []), ...(entry.candidateDances || [])])],
        apiSongIds: [...new Set([...(previous.apiSongIds || []), ...(entry.apiSongIds || [])])],
        firstPlayedAt: [previous.firstPlayedAt, entry.firstPlayedAt].filter(Boolean).sort()[0] || '',
        lastPlayedAt: [previous.lastPlayedAt, entry.lastPlayedAt].filter(Boolean).sort().at(-1) || '',
        firstCollectedAt: [previous.firstCollectedAt, entry.firstCollectedAt].filter(Boolean).sort()[0] || '',
        lastCollectedAt: [previous.lastCollectedAt, entry.lastCollectedAt].filter(Boolean).sort().at(-1) || '',
        playCount: Number(previous.playCount || 0) + Number(entry.playCount || 0),
      });
    }
    return [...merged.values()]
      .sort((left, right) => String(right.lastPlayedAt || right.lastCollectedAt || '').localeCompare(String(left.lastPlayedAt || left.lastCollectedAt || '')))
      .slice(0, MAX_ENTRIES);
  }

  async function fetchStation(station) {
    const endpoints = [
      ['current_song', station.apiUrls?.current_song],
      ['last_songs', station.apiUrls?.last_songs],
    ].filter(([, url]) => /^https:\/\/api\.laut\.fm\//i.test(String(url || '')));

    const settled = await Promise.allSettled(endpoints.map(async ([endpoint, url]) => {
      const payload = await fetchJson(url);
      return extractSongs(payload).map((song) => toEntry(song, station, endpoint)).filter(Boolean);
    }));
    const entries = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
    if (!entries.length && settled.some((result) => result.status === 'rejected')) throw new Error('Keine Senderdaten abrufbar');
    return entries;
  }

  async function refresh() {
    if (refreshPromise) return refreshPromise;
    if (!window.navigator.onLine) return getCachedEntries();

    refreshPromise = (async () => {
      const stations = (Array.isArray(CATALOG.stations) ? CATALOG.stations : []).filter((station) => station?.active !== false);
      const lastAttemptAt = new Date().toISOString();
      const settled = await Promise.allSettled(stations.map(fetchStation));
      const incoming = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
      const successfulStations = settled.filter((result) => result.status === 'fulfilled').length;
      const failedStations = settled.length - successfulStations;
      const entries = mergeEntries(getCachedEntries(), incoming);
      if (incoming.length) writeJson(STORAGE_KEY, entries);
      const status = {
        active: incoming.length > 0,
        lastAttemptAt,
        lastSuccessAt: incoming.length ? new Date().toISOString() : getStatus().lastSuccessAt,
        successfulStations,
        failedStations,
        receivedEntries: incoming.length,
        cachedEntries: entries.length,
      };
      writeJson(STATUS_KEY, status);
      window.dispatchEvent(new CustomEvent('cldf:radio-live-updated', { detail: { entries, status } }));
      return entries;
    })().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  function start() {
    if (refreshTimer) return;
    setTimeout(() => refresh().catch(() => {}), 500);
    refreshTimer = window.setInterval(() => {
      if (!document.hidden && window.navigator.onLine) refresh().catch(() => {});
    }, REFRESH_INTERVAL_MS);
    window.addEventListener('online', () => refresh().catch(() => {}));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && window.navigator.onLine) {
        const lastAttempt = Date.parse(getStatus().lastAttemptAt || 0);
        if (!lastAttempt || Date.now() - lastAttempt >= REFRESH_INTERVAL_MS) refresh().catch(() => {});
      }
    });
  }

  window.CLDFRadioLiveAPI = {
    start,
    refresh,
    getEntries: getCachedEntries,
    getStatus,
    storageKey: STORAGE_KEY,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
  };
})();
