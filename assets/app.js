'use strict';

(() => {
  const DATA = window.CLDF_DATA || { dances: [], motionCatalog: [], specialRhythms: [], appVersion: '4.7.3', databaseVersion: 'unbekannt' };
  const GETINLINE_DATA = window.GETINLINE_DATA || { dances: [], count: 0, generatedAt: null };
  const VM = window.CLDFVideoMotion;
  const STEP_PATTERN_DB = window.CLDF_STEP_SHEET_PATTERNS || { patterns: [] };
  const STEP_PATTERNS = Array.isArray(STEP_PATTERN_DB.patterns) ? STEP_PATTERN_DB.patterns : [];
  const AUDIO = window.CLDFAudioEngine;
  const STORE = window.CLDFLocalStore;
  const FINGERPRINT_DB = window.CLDF_AUDIO_FINGERPRINTS || { entries: [] };
  const SONG_META = window.CLDF_SONG_METADATA || { entries: [] };
  const RADIO_API_DATA = window.CLDF_RADIO_API_DATA || { stations: [], entries: [], count: 0, stationCount: 0 };
  const RADIO_ENTRIES = Array.isArray(RADIO_API_DATA.entries) ? RADIO_API_DATA.entries : [];
  const RADIO_LIVE_API = window.CLDFRadioLiveAPI || null;
  const SONG_API_INDEX = window.CLDF_SONG_API_INDEX || { entries: [], stations: [], entryCount: 0, apiEndpointCount: 0 };
  const SONG_API_ENTRIES = Array.isArray(SONG_API_INDEX.entries) ? SONG_API_INDEX.entries : [];
  const APP_VERSION = '4.7.3';
  const DATABASE_VERSION = DATA.databaseVersion || 'unbekannt';
  const CLDF_DANCES = Array.isArray(DATA.dances) ? DATA.dances : [];
  let GETINLINE_DANCES = Array.isArray(GETINLINE_DATA.dances) ? GETINLINE_DATA.dances : [];
  let BASE_DANCES = [...CLDF_DANCES, ...GETINLINE_DANCES];
  let BASE_IDS = new Set(BASE_DANCES.map((dance) => dance.id));
  const MOTIONS = Array.isArray(DATA.motionCatalog) ? DATA.motionCatalog : [];
  const SPECIAL_RHYTHMS = Array.isArray(DATA.specialRhythms) ? DATA.specialRhythms : [];
  const SYSTEM_MOTIONS = ['Nicht motionspezifisch / Mixed', 'Zu prüfen'];
  const PAGE_SIZE = 30;
  const RECORD_SECONDS = 12;
  const OFFLINE_MODE = true;

  const STORAGE = {
    overrides: 'cldf.v2.overrides',
    customDances: 'cldf.v2.customDances',
    favorites: 'cldf.v2.favorites',
    practice: 'cldf.v2.practice',
    history: 'cldf.v2.history',
    splashSeen: 'cldf.v2.splashSeen',
    onboardingSeen: 'cldf.v2.onboardingSeen',
    settings: 'cldf.v2.settings',
    motionReferences: 'cldf.v2.motionReferences',
    radioLiveEntries: 'cldf.v2.radioLiveApiEntries',
    radioLiveStatus: 'cldf.v2.radioLiveApiStatus',
  };


  const storage = {
    get(key) {
      try {
        return window.localStorage ? window.localStorage.getItem(key) : null;
      } catch (error) {
        console.warn(`Lokaler Speicher ist für ${key} nicht verfügbar.`, error);
        return null;
      }
    },
    set(key, value) {
      try {
        if (!window.localStorage) return false;
        window.localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn(`Lokaler Speicher ist für ${key} nicht verfügbar.`, error);
        return false;
      }
    },
    remove(key) {
      try {
        if (window.localStorage) window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Lokaler Speicher ist für ${key} nicht verfügbar.`, error);
      }
    },
  };

  const state = {
    dances: [],
    overrides: readJson(STORAGE.overrides, {}),
    customDances: readJson(STORAGE.customDances, []),
    favorites: new Set(readJson(STORAGE.favorites, [])),
    practice: new Set(readJson(STORAGE.practice, [])),
    history: readJson(STORAGE.history, []),
    settings: { searchPage: PAGE_SIZE, ...readJson(STORAGE.settings, {}) },
    filteredDances: [],
    searchLimit: PAGE_SIZE,
    previousView: 'home',
    mediaRecorder: null,
    mediaStream: null,
    mediaChunks: [],
    recordingStarted: 0,
    recordingTimer: null,
    tapTimes: [],
    tapBpm: null,
    tapPossibleBpms: [],
    microphonePermission: 'unknown',
    microphonePermissionStatus: null,
    motionReferences: readJson(STORAGE.motionReferences, []),
    videoBusy: false,
    liveVideoController: null,
    onlineServiceReady: false,
    onlineServiceMessage: 'Noch nicht geprüft',
    audioFingerprints: [],
    fingerprintBusy: false,
    getInLineFromStore: false,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function readJson(key, fallback) {
    try {
      const raw = storage.get(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(`Konnte ${key} nicht lesen.`, error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      if (!storage.set(key, JSON.stringify(value))) return false;
      return true;
    } catch (error) {
      console.warn(`Konnte ${key} nicht speichern.`, error);
      return false;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
  }

  function normalize(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('de')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function compactKey(value = '') {
    return normalize(value).replace(/\s+/g, ' ');
  }

  function slugify(value = '') {
    return normalize(value).replace(/\s+/g, '-').replace(/^-|-$/g, '') || `tanz-${Date.now()}`;
  }

  function uniqueId(prefix = 'id') {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function numberOrNull(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function valueOrCheck(value, fallback = 'Zu prüfen') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function canonicalMotion(value) {
    const key = compactKey(value);
    if (!key || key === 'zu prufen') return 'Zu prüfen';
    if (key.includes('mixed') || key.includes('nicht motionspezifisch')) return 'Nicht motionspezifisch / Mixed';
    for (const motion of MOTIONS) {
      const names = [motion.name, ...(motion.aliases || [])].map(compactKey);
      if (names.includes(key)) return motion.name;
    }
    return String(value).trim() || 'Zu prüfen';
  }

  function allRhythms() {
    return [...new Set([
      ...MOTIONS.flatMap((motion) => (motion.rhythms || []).map((rhythm) => rhythm.name)),
      ...SPECIAL_RHYTHMS.map((rhythm) => rhythm.name),
      ...state.dances.map((dance) => dance.rhythm).filter(Boolean),
    ])].sort((a, b) => a.localeCompare(b, 'de'));
  }

  function toast(message, duration = 2800) {
    const element = $('#toast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), duration);
  }

  function openDialog(html, options = {}) {
    const dialog = $('#appDialog');
    $('#dialogContent').innerHTML = html;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    if (options.focusSelector) setTimeout(() => $(options.focusSelector, dialog)?.focus(), 20);
    return dialog;
  }

  function closeDialog() {
    const dialog = $('#appDialog');
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function persistPersonalLists() {
    writeJson(STORAGE.favorites, [...state.favorites]);
    writeJson(STORAGE.practice, [...state.practice]);
  }

  function persistDanceChanges() {
    writeJson(STORAGE.overrides, state.overrides);
    writeJson(STORAGE.customDances, state.customDances);
  }

  function rebuildDanceState() {
    const getInLineByKey = new Map();
    for (const dance of GETINLINE_DANCES) {
      const key = `${compactKey(dance.title)}|${compactKey(dance.choreographer)}`;
      if (key !== '|' && !getInLineByKey.has(key)) getInLineByKey.set(key, dance);
    }
    const mergedGetInLineIds = new Set();
    const cldfBase = CLDF_DANCES.map((dance) => {
      const override = state.overrides[dance.id];
      const raw = { ...clone(dance), ...(override ? clone(override) : {}) };
      const key = `${compactKey(raw.title)}|${compactKey(raw.choreographer)}`;
      const getInLine = getInLineByKey.get(key);
      if (getInLine) {
        mergedGetInLineIds.add(getInLine.id);
        raw.sheetUrl = raw.sheetUrl || getInLine.sheetUrl || getInLine.sourceUrl;
        raw.getInLineMatch = true;
        raw.verificationSources = [...new Set([...(raw.verificationSources || []), 'Get-in-Line Tanzsheet'])];
      }
      return normalizeDance(raw, dance.id);
    });
    const getInLineBase = GETINLINE_DANCES
      .filter((dance) => !mergedGetInLineIds.has(dance.id))
      .map((dance) => normalizeDance(clone(dance), dance.id));
    const base = [...cldfBase, ...getInLineBase];
    const custom = state.customDances.map((dance) => normalizeDance(clone(dance), dance.id || uniqueId('custom')));
    state.dances = [...base, ...custom].sort((a, b) => a.title.localeCompare(b.title, 'de'));
    const validIds = new Set(state.dances.map((dance) => dance.id));
    state.favorites = new Set([...state.favorites].filter((id) => validIds.has(id)));
    state.practice = new Set([...state.practice].filter((id) => validIds.has(id)));
    persistPersonalLists();
  }

  function normalizeDance(dance, fallbackId) {
    const normalized = { ...dance };
    normalized.id = String(dance.id || fallbackId || uniqueId('dance'));
    normalized.title = valueOrCheck(dance.title, 'Unbenannter Tanz');
    normalized.choreographer = valueOrCheck(dance.choreographer);
    normalized.counts = numberOrNull(dance.counts);
    normalized.countsText = dance.countsText || (normalized.counts !== null ? String(normalized.counts) : 'Zu prüfen');
    normalized.walls = numberOrNull(dance.walls);
    normalized.wallsText = dance.wallsText || (normalized.walls !== null ? String(normalized.walls) : 'Zu prüfen');
    normalized.level = valueOrCheck(dance.level);
    normalized.restarts = dance.restarts ?? null;
    normalized.tags = dance.tags ?? null;
    normalized.tagInfo = dance.tagInfo || '';
    normalized.bridges = dance.bridges ?? null;
    normalized.breaks = dance.breaks ?? null;
    normalized.ending = dance.ending ?? null;
    normalized.motion = canonicalMotion(dance.motion);
    normalized.rhythm = valueOrCheck(dance.rhythm);
    normalized.meter = valueOrCheck(dance.meter);
    normalized.bpmMin = numberOrNull(dance.bpmMin);
    normalized.bpmMax = numberOrNull(dance.bpmMax);
    normalized.knownBpms = Array.isArray(dance.knownBpms) ? dance.knownBpms.map(numberOrNull).filter(Number.isFinite) : [];
    normalized.music = Array.isArray(dance.music) && dance.music.length
      ? dance.music.map((item) => ({ title: valueOrCheck(item.title), artist: valueOrCheck(item.artist) }))
      : [{ title: 'Zu prüfen', artist: 'Zu prüfen' }];
    normalized.teacher = valueOrCheck(dance.teacher);
    normalized.publishedYear = numberOrNull(dance.publishedYear);
    normalized.introCounts = numberOrNull(dance.introCounts);
    normalized.source = dance.source || 'CLDF';
    normalized.sourceGroup = dance.sourceGroup || ((dance.externalCatalog || normalized.source === 'Get-in-Line') ? 'Get-in-Line' : 'CLDF');
    normalized.sourceUrl = safeUrl(dance.sourceUrl || dance.sheetUrl || '');
    normalized.sheetUrl = safeUrl(dance.sheetUrl || dance.sourceUrl || '');
    normalized.externalCatalog = Boolean(dance.externalCatalog || normalized.source === 'Get-in-Line');
    normalized.sourceDescription = dance.sourceDescription || '';
    normalized.videoUrl = safeUrl(dance.videoUrl || '');
    normalized.steps = dance.steps || 'Teach & Demo im CLDF-Video';
    normalized.status = dance.status || 'Zu prüfen';
    normalized.note = dance.note || '';
    normalized.verificationSources = Array.isArray(dance.verificationSources) ? dance.verificationSources : [];
    normalized.coreMetadataVerified = Boolean(dance.coreMetadataVerified);
    normalized.classificationVerified = Boolean(dance.classificationVerified);
    normalized.bpmVerified = Boolean(dance.bpmVerified);
    normalized.dataQuality = dance.dataQuality || qualityLabel(normalized);
    normalized.recognitionAliases = Array.isArray(dance.recognitionAliases) ? dance.recognitionAliases : [];
    return normalized;
  }

  function qualityLabel(dance) {
    if (dance.coreMetadataVerified && dance.classificationVerified && dance.bpmVerified) return 'Kerndaten, Motion und BPM geprüft';
    if (dance.coreMetadataVerified && dance.classificationVerified) return 'Kerndaten und Motion geprüft';
    if (dance.coreMetadataVerified) return 'Kerndaten geprüft; Motion/Rhythmus offen';
    return 'Noch zu prüfen';
  }

  function musicText(dance) {
    return (dance.music || []).map((item) => `${item.title} – ${item.artist}`).join(' · ');
  }

  function searchText(dance) {
    return normalize([
      dance.title,
      dance.choreographer,
      dance.level,
      canonicalMotion(dance.motion),
      dance.rhythm,
      dance.meter,
      musicText(dance),
      dance.teacher,
      dance.source,
      dance.sourceGroup,
      dance.tagInfo,
      dance.sourceDescription,
      ...(dance.recognitionAliases || []),
    ].join(' '));
  }

  function showView(name, options = {}) {
    const next = $(`#view-${name}`);
    if (!next) return;
    if (name !== 'result') state.previousView = name;
    $$('.view').forEach((view) => view.classList.toggle('active', view === next));
    $$('.bottom-nav button').forEach((button) => button.classList.toggle('active', button.dataset.view === name));
    if (!options.keepScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (options.focus) setTimeout(() => $(options.focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    location.hash = name === 'home' ? '' : name;
  }

  function statusBadge(dance, score = null) {
    if (score !== null) return `<span class="badge score">${Math.round(score)} %</span>`;
    if (dance.externalCatalog) return '<span class="badge source-badge">Get-in-Line</span>';
    if (dance.status === 'bestätigt') return '<span class="badge confirmed">Bestätigt</span>';
    if (dance.status === 'teilweise bestätigt') return '<span class="badge partial">Teilweise</span>';
    return '<span class="badge">Zu prüfen</span>';
  }

  function danceCard(dance, score = null) {
    const favorite = state.favorites.has(dance.id);
    const practice = state.practice.has(dance.id);
    const motion = canonicalMotion(dance.motion);
    return `
      <article class="dance-card" data-dance-id="${escapeHtml(dance.id)}">
        <div class="dance-card-top">
          <div>
            <h2 class="dance-title">${escapeHtml(dance.title)}</h2>
            <p class="dance-sub">${escapeHtml(dance.choreographer)}</p>
          </div>
          ${statusBadge(dance, score)}
        </div>
        <p class="dance-sub">${escapeHtml(musicText(dance))}</p>
        <div class="meta-grid">
          <div><small>Level</small><strong>${escapeHtml(dance.level || '–')}</strong></div>
          <div><small>Counts</small><strong>${escapeHtml(dance.countsText || dance.counts || '–')}</strong></div>
          <div><small>Walls</small><strong>${escapeHtml(dance.wallsText || dance.walls || '–')}</strong></div>
          ${dance.externalCatalog
            ? `<div><small>Tags/Restarts</small><strong title="${escapeHtml(dance.tagInfo || '')}">${escapeHtml(dance.tagInfo || `${dance.tags ?? 0} Tags · ${dance.restarts ?? 0} Restarts`)}</strong></div>`
            : `<div><small>Motion</small><strong title="${escapeHtml(motion)}">${escapeHtml(motion)}</strong></div>`}
        </div>
        <div class="card-actions">
          <button type="button" data-action="details">Details</button>
          <button type="button" data-action="favorite" class="${favorite ? 'active' : ''}">${favorite ? '★ Meine Tänze' : '☆ Meine Tänze'}</button>
          <button type="button" data-action="practice" class="${practice ? 'active' : ''}">${practice ? '✓ Übungsliste' : '＋ Üben'}</button>
        </div>
      </article>`;
  }

  function bindDanceCards(container) {
    $$('.dance-card', container).forEach((card) => {
      const dance = state.dances.find((item) => item.id === card.dataset.danceId);
      if (!dance) return;
      $$('[data-action]', card).forEach((button) => {
        button.addEventListener('click', () => {
          if (button.dataset.action === 'details') openDanceDetails(dance.id);
          if (button.dataset.action === 'favorite') {
            state.favorites.has(dance.id) ? state.favorites.delete(dance.id) : state.favorites.add(dance.id);
            persistPersonalLists();
            renderAll();
            toast('„Meine Tänze“ aktualisiert.');
          }
          if (button.dataset.action === 'practice') {
            state.practice.has(dance.id) ? state.practice.delete(dance.id) : state.practice.add(dance.id);
            persistPersonalLists();
            renderAll();
            toast('Übungsliste aktualisiert.');
          }
        });
      });
    });
  }

  function renderDanceList(container, dances, emptyText, scores = null) {
    if (!container) return;
    container.innerHTML = dances.length
      ? dances.map((dance) => danceCard(dance, scores?.get(dance.id) ?? null)).join('')
      : `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
    bindDanceCards(container);
  }

  function sortDances(dances, mode) {
    const qualityScore = (dance) => Number(dance.coreMetadataVerified) + Number(dance.classificationVerified) + Number(dance.bpmVerified);
    return [...dances].sort((a, b) => {
      if (mode === 'year-desc') return (b.publishedYear || 0) - (a.publishedYear || 0) || a.title.localeCompare(b.title, 'de');
      if (mode === 'level') return a.level.localeCompare(b.level, 'de') || a.title.localeCompare(b.title, 'de');
      if (mode === 'quality') return qualityScore(b) - qualityScore(a) || a.title.localeCompare(b.title, 'de');
      return a.title.localeCompare(b.title, 'de');
    });
  }

  function updateFilters() {
    const preserve = {
      source: $('#sourceFilter')?.value || '',
      level: $('#levelFilter')?.value || '',
      motion: $('#motionFilter')?.value || '',
      rhythm: $('#rhythmFilter')?.value || '',
    };
    const levels = [...new Set(state.dances.map((dance) => dance.level).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    const motions = [...new Set([...MOTIONS.map((motion) => motion.name), ...SYSTEM_MOTIONS, ...state.dances.map((dance) => canonicalMotion(dance.motion))])];
    const rhythms = allRhythms();
    $('#sourceFilter').innerHTML = '<option value="">Alle Quellen</option><option value="CLDF">CLDF</option><option value="Get-in-Line">Get-in-Line</option>';
    $('#levelFilter').innerHTML = '<option value="">Alle Level</option>' + levels.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    $('#motionFilter').innerHTML = '<option value="">Alle Motions</option>' + motions.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    $('#rhythmFilter').innerHTML = '<option value="">Alle Rhythmen</option>' + rhythms.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    $('#sourceFilter').value = preserve.source;
    $('#levelFilter').value = preserve.level;
    $('#motionFilter').value = preserve.motion;
    $('#rhythmFilter').value = preserve.rhythm;
  }

  function getFilteredDances() {
    const query = normalize($('#searchInput').value);
    const source = $('#sourceFilter').value;
    const level = $('#levelFilter').value;
    const motion = $('#motionFilter').value;
    const rhythm = $('#rhythmFilter').value;
    const quality = $('#qualityFilter').value;
    const sort = $('#sortFilter').value;
    const filtered = state.dances.filter((dance) => {
      if (query && !searchText(dance).includes(query)) return false;
      if (source && dance.sourceGroup !== source) return false;
      if (level && dance.level !== level) return false;
      if (motion && canonicalMotion(dance.motion) !== motion) return false;
      if (rhythm && dance.rhythm !== rhythm) return false;
      if (quality === 'core' && !dance.coreMetadataVerified) return false;
      if (quality === 'classification' && !dance.classificationVerified) return false;
      if (quality === 'open' && dance.coreMetadataVerified && dance.classificationVerified && dance.bpmVerified) return false;
      return true;
    });
    return sortDances(filtered, sort);
  }

  function renderSearch(resetLimit = false) {
    if (resetLimit) state.searchLimit = PAGE_SIZE;
    state.filteredDances = getFilteredDances();
    const visible = state.filteredDances.slice(0, state.searchLimit);
    renderDanceList($('#danceList'), visible, 'Keine passenden Tänze gefunden.');
    $('#searchCount').textContent = `${state.filteredDances.length}`;
    const more = state.filteredDances.length > visible.length;
    $('#loadMoreBtn').classList.toggle('hidden', !more);
    if (more) $('#loadMoreBtn').textContent = `Weitere Tänze anzeigen (${state.filteredDances.length - visible.length})`;
  }

  function renderPersonalLists() {
    const favorites = state.dances.filter((dance) => state.favorites.has(dance.id));
    const practice = state.dances.filter((dance) => state.practice.has(dance.id));
    $('#favoriteCount').textContent = `${favorites.length}`;
    $('#practiceCount').textContent = `${practice.length}`;
    renderDanceList($('#favoriteList'), favorites, 'Noch keine Tänze gespeichert.');
    renderDanceList($('#practiceList'), practice, 'Die Übungsliste ist noch leer.');
  }

  function qualityStats() {
    const total = state.dances.length;
    const cldf = state.dances.filter((dance) => !dance.externalCatalog).length;
    const getinline = state.dances.filter((dance) => dance.externalCatalog).length;
    const core = state.dances.filter((dance) => dance.coreMetadataVerified).length;
    const classification = state.dances.filter((dance) => dance.classificationVerified).length;
    const bpm = state.dances.filter((dance) => dance.bpmVerified).length;
    const music = state.dances.filter((dance) => (dance.music || []).some((item) => compactKey(item.title) !== 'zu prufen')).length;
    const videos = state.dances.filter((dance) => dance.videoUrl).length;
    return { total, cldf, getinline, core, classification, bpm, music, videos };
  }

  function renderQuality() {
    const stats = qualityStats();
    $('#danceCount').textContent = `${stats.total} Tänze`;
    $('#qualityCount').textContent = `${stats.core} geprüft`;
    $('#databaseVersionBadge').textContent = `v${APP_VERSION}`;
    $('#qualityStats').innerHTML = [
      ['Gesamtkatalog', stats.total],
      ['CLDF-Tänze', stats.cldf],
      ['Get-in-Line', stats.getinline],
      ['Kerndaten vorhanden', `${stats.core}/${stats.total}`],
      ['Motion geprüft', `${stats.classification}/${stats.total}`],
      ['BPM geprüft', `${stats.bpm}/${stats.total}`],
      ['Musik zugeordnet', `${stats.music}/${stats.total}`],
      ['CLDF-Video', `${stats.videos}/${stats.total}`],
    ].map(([label, value]) => `<div class="quality-stat"><strong>${escapeHtml(value)}</strong><small>${escapeHtml(label)}</small></div>`).join('');
  }

  function renderMotionCatalog() {
    $('#motionCatalog').innerHTML = MOTIONS.map((motion) => `
      <details class="motion-card">
        <summary><span>${escapeHtml(motion.name)}</span></summary>
        <div class="motion-body">
          <p>${escapeHtml(motion.description || '')}</p>
          <ul class="rhythm-list">
            ${(motion.rhythms || []).map((rhythm) => {
              const bpm = rhythm.bpmMin && rhythm.bpmMax
                ? `${rhythm.bpmMin}${rhythm.bpmMax !== rhythm.bpmMin ? `–${rhythm.bpmMax}` : ''} BPM`
                : 'BPM variabel';
              return `<li><strong>${escapeHtml(rhythm.name)}</strong><span>${escapeHtml(bpm)}</span></li>`;
            }).join('')}
          </ul>
        </div>
      </details>`).join('');
  }

  function renderHistory() {
    const list = $('#historyList');
    if (!state.history.length) {
      list.innerHTML = '<div class="empty-state">Noch keine Erkennung durchgeführt.</div>';
      $('#clearHistoryBtn').classList.add('hidden');
      return;
    }
    $('#clearHistoryBtn').classList.remove('hidden');
    list.innerHTML = state.history.slice(0, 12).map((item, index) => {
      const exact = item.type === 'song';
      const video = item.type === 'video';
      const title = exact || video ? item.title : `${item.bpm || '–'} BPM`;
      const subtitle = exact ? item.artist : video ? `Video-Beta · ${Math.round(item.score || 0)} %` : 'Tempoanalyse';
      return `<button class="history-item" type="button" data-history-index="${index}">
        <span class="history-icon">${exact ? (item.video ? '🎥' : '♫') : video ? '🎥' : '↯'}</span>
        <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}</small></span>
        <time>${escapeHtml(formatRelativeTime(item.createdAt))}</time>
      </button>`;
    }).join('');
    $$('[data-history-index]', list).forEach((button) => button.addEventListener('click', () => openHistoryItem(state.history[Number(button.dataset.historyIndex)])));
  }

  function formatRelativeTime(value) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return '';
    const minutes = Math.round((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'jetzt';
    if (minutes < 60) return `vor ${minutes} Min.`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(new Date(timestamp));
  }

  function addHistory(item) {
    state.history.unshift({ ...item, createdAt: new Date().toISOString() });
    state.history = state.history.slice(0, 30);
    writeJson(STORAGE.history, state.history);
    renderHistory();
  }

  function openHistoryItem(item) {
    if (!item) return;
    if (item.type === 'song') {
      const song = getSongCatalog().get(item.songKey);
      if (song) showCatalogSongResult(song, item.confidence || 100, item.video ? 'Video aus Verlauf' : 'Aus Verlauf', { bpm: item.bpm, confidence: item.tempoConfidence || 0 }, false);
      else toast('Dieses Lied ist nicht mehr in der Datenbank.');
    } else if (item.type === 'video') {
      const dance = state.dances.find((candidate) => candidate.id === item.danceId);
      if (dance) openDanceDetails(dance.id);
      else toast('Dieser Tanz ist nicht mehr in der Datenbank.');
    } else {
      showAnalysisResult({ bpm: item.bpm, confidence: item.tempoConfidence || 0 }, false);
    }
  }

  function renderAll() {
    updateFilters();
    renderSearch(false);
    renderPersonalLists();
    renderQuality();
    renderHistory();
    renderMotionReferenceCatalog();
  }

  function openDanceDetails(danceId) {
    const dance = state.dances.find((item) => item.id === danceId);
    if (!dance) return;
    const bpm = dance.bpmMin ? `${dance.bpmMin}${dance.bpmMax && dance.bpmMax !== dance.bpmMin ? `–${dance.bpmMax}` : ''} BPM` : 'Zu prüfen';
    const tempoVariants = (dance.knownBpms || []).filter((value, index, values) => Number.isFinite(value) && values.indexOf(value) === index);
    const tempoVariantText = tempoVariants.length > 1 ? `${tempoVariants.join(' / ')} BPM` : '—';
    const bpmStatus = dance.bpmVerified ? 'geprüft' : 'vorläufig';
    const actionLinks = [
      dance.videoUrl ? `<a class="primary-btn" href="${escapeHtml(dance.videoUrl)}" target="_blank" rel="noopener">CLDF-Video öffnen</a>` : '',
      dance.sheetUrl ? `<a class="${dance.externalCatalog ? 'primary-btn' : 'secondary-btn'}" href="${escapeHtml(dance.sheetUrl)}" target="_blank" rel="noopener noreferrer">Tanzsheet öffnen</a>` : '',
      dance.sourceUrl && dance.sourceUrl !== dance.videoUrl && dance.sourceUrl !== dance.sheetUrl ? `<a class="secondary-btn" href="${escapeHtml(dance.sourceUrl)}" target="_blank" rel="noopener noreferrer">Quelle öffnen</a>` : '',
    ].filter(Boolean).join('');
    openDialog(`
      <div class="dialog-hero">
        <p class="eyebrow">${escapeHtml(dance.status)}</p>
        <h2>${escapeHtml(dance.title)}</h2>
        <p>${escapeHtml(dance.choreographer)}</p>
      </div>
      <p><strong>Musik:</strong> ${escapeHtml(musicText(dance))}</p>
      <div class="detail-grid">
        ${detailItem('Quelle', dance.source)}
        ${detailItem('Level', dance.level)}
        ${detailItem('Counts', dance.countsText || dance.counts || 'Zu prüfen')}
        ${detailItem('Walls', dance.wallsText || dance.walls || 'Zu prüfen')}
        ${detailItem('Motion', canonicalMotion(dance.motion))}
        ${detailItem('Rhythmus', dance.rhythm)}
        ${detailItem('Takt', dance.meter)}
        ${detailItem('Tempo', bpm)}
        ${detailItem('Tempo-Varianten', tempoVariantText)}
        ${detailItem('BPM-Status', bpmStatus)}
        ${detailItem('Teacher', dance.teacher)}
        ${detailItem('Restarts', dance.restarts ?? 'Zu prüfen')}
        ${detailItem('Tags', dance.tags ?? 'Zu prüfen')}
        ${dance.tagInfo ? detailItem('Tags/Restarts laut Sheet', dance.tagInfo) : ''}
        ${detailItem('Bridges', dance.bridges ?? 'Zu prüfen')}
        ${detailItem('Breaks', dance.breaks ?? 'Zu prüfen')}
        ${detailItem('Ending', dance.ending === null || dance.ending === undefined ? 'Zu prüfen' : (dance.ending ? 'Ja' : 'Nein'))}
        ${detailItem('Intro', dance.introCounts ?? 'Zu prüfen')}
      </div>
      ${dance.note ? `<div class="detail-notes">${escapeHtml(dance.note)}</div>` : ''}
      <div class="dialog-actions">
        ${actionLinks}
        ${dance.externalCatalog ? '' : '<button id="editDanceBtn" class="secondary-btn" type="button">Tanz bearbeiten</button>'}
      </div>`, { focusSelector: dance.externalCatalog ? '.dialog-actions a' : '#editDanceBtn' });
    $('#editDanceBtn')?.addEventListener('click', () => openDanceEditor(dance.id));
  }

  function detailItem(label, value) {
    return `<div class="detail-item"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value ?? 'Zu prüfen')}</strong></div>`;
  }

  function openDanceEditor(danceId = null) {
    const existing = danceId ? state.dances.find((item) => item.id === danceId) : null;
    const dance = existing ? clone(existing) : normalizeDance({
      id: uniqueId('custom'), title: '', choreographer: '', level: '', motion: 'Zu prüfen', rhythm: 'Zu prüfen', meter: 'Zu prüfen', music: [{ title: '', artist: '' }], status: 'Zu prüfen', source: 'Eigener Eintrag', coreMetadataVerified: false, classificationVerified: false, bpmVerified: false,
    });
    const music = dance.music?.[0] || { title: '', artist: '' };
    const motionOptions = [...MOTIONS.map((motion) => motion.name), ...SYSTEM_MOTIONS];
    const rhythmOptions = allRhythms();
    openDialog(`
      <div class="dialog-hero"><p class="eyebrow">Datenverwaltung</p><h2>${existing ? 'Tanz bearbeiten' : 'Tanz hinzufügen'}</h2><p>Änderungen werden nur auf diesem Gerät gespeichert.</p></div>
      <form id="danceEditForm" class="edit-form">
        <div class="edit-grid">
          ${field('Titel', 'title', dance.title === 'Unbenannter Tanz' ? '' : dance.title, 'text', true)}
          ${field('Choreograf', 'choreographer', dance.choreographer === 'Zu prüfen' ? '' : dance.choreographer)}
          ${field('Lied', 'musicTitle', music.title === 'Zu prüfen' ? '' : music.title)}
          ${field('Interpret', 'musicArtist', music.artist === 'Zu prüfen' ? '' : music.artist)}
          ${field('Level', 'level', dance.level === 'Zu prüfen' ? '' : dance.level)}
          ${field('Counts', 'counts', dance.counts ?? '', 'number')}
          ${field('Walls', 'walls', dance.walls ?? '', 'number')}
          ${selectField('Motion', 'motion', motionOptions, canonicalMotion(dance.motion))}
          ${selectField('Rhythmus', 'rhythm', rhythmOptions, dance.rhythm, true)}
          ${field('Taktart', 'meter', dance.meter === 'Zu prüfen' ? '' : dance.meter, 'text', false, 'z. B. 4/4 oder 3/4')}
          ${field('BPM von', 'bpmMin', dance.bpmMin ?? '', 'number')}
          ${field('BPM bis', 'bpmMax', dance.bpmMax ?? '', 'number')}
          ${field('Restarts', 'restarts', dance.restarts ?? '', 'number')}
          ${field('Tags', 'tags', dance.tags ?? '', 'number')}
          ${field('Bridges', 'bridges', dance.bridges ?? '', 'number')}
          ${field('Intro-Counts', 'introCounts', dance.introCounts ?? '', 'number')}
          ${field('Teacher', 'teacher', dance.teacher === 'Zu prüfen' ? '' : dance.teacher)}
          ${field('Jahr', 'publishedYear', dance.publishedYear ?? '', 'number')}
          ${field('CLDF-Video-URL', 'videoUrl', dance.videoUrl || '', 'url', false, 'https://…', 'full')}
          ${selectField('Status', 'status', ['bestätigt', 'teilweise bestätigt', 'Zu prüfen'], dance.status)}
          <label><span>Prüfstatus</span><select name="verification"><option value="none" ${!dance.coreMetadataVerified ? 'selected' : ''}>Noch nicht geprüft</option><option value="core" ${dance.coreMetadataVerified && !dance.classificationVerified ? 'selected' : ''}>Kerndaten geprüft</option><option value="classification" ${dance.classificationVerified && !dance.bpmVerified ? 'selected' : ''}>Kerndaten + Motion geprüft</option><option value="all" ${dance.bpmVerified ? 'selected' : ''}>Alles inkl. BPM geprüft</option></select></label>
          <label class="full"><span>Notiz</span><textarea name="note">${escapeHtml(dance.note || '')}</textarea></label>
        </div>
        <div class="dialog-actions">
          <button class="primary-btn" type="submit">Speichern</button>
          ${existing && !BASE_IDS.has(existing.id) ? '<button id="deleteCustomDanceBtn" class="danger-btn" type="button">Tanz löschen</button>' : '<button id="removeOverrideBtn" class="danger-btn" type="button">Eigene Änderung entfernen</button>'}
        </div>
      </form>`, { focusSelector: '[name="title"]' });

    $('#danceEditForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const saved = buildDanceFromForm(dance, form);
      saveDance(saved);
      closeDialog();
      renderAll();
      toast('Tanz gespeichert.');
    });
    $('#deleteCustomDanceBtn')?.addEventListener('click', () => {
      if (!confirm('Diesen eigenen Tanz wirklich löschen?')) return;
      state.customDances = state.customDances.filter((item) => item.id !== dance.id);
      state.favorites.delete(dance.id);
      state.practice.delete(dance.id);
      persistDanceChanges();
      persistPersonalLists();
      rebuildDanceState();
      closeDialog();
      renderAll();
      toast('Eigener Tanz gelöscht.');
    });
    $('#removeOverrideBtn')?.addEventListener('click', () => {
      if (!existing || !state.overrides[existing.id]) return toast('Für diesen Tanz gibt es keine eigene Änderung.');
      if (!confirm('Eigene Änderungen entfernen und den mitgelieferten Stand wiederherstellen?')) return;
      delete state.overrides[existing.id];
      persistDanceChanges();
      rebuildDanceState();
      closeDialog();
      renderAll();
      toast('Mitgelieferter Datenstand wiederhergestellt.');
    });
  }

  function field(label, name, value, type = 'text', required = false, placeholder = '', className = '') {
    return `<label class="${className}"><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" ${required ? 'required' : ''} placeholder="${escapeHtml(placeholder)}"></label>`;
  }

  function selectField(label, name, options, selected, allowCustom = false) {
    const values = [...new Set([...(options || []), selected].filter(Boolean))];
    const optionHtml = values.map((value) => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('');
    if (!allowCustom) return `<label><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}">${optionHtml}</select></label>`;
    return `<label><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" list="rhythmOptions" value="${escapeHtml(selected === 'Zu prüfen' ? '' : selected)}"><datalist id="rhythmOptions">${values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join('')}</datalist></label>`;
  }

  function buildDanceFromForm(original, form) {
    const verification = form.get('verification');
    const core = ['core', 'classification', 'all'].includes(verification);
    const classification = ['classification', 'all'].includes(verification);
    const bpmVerified = verification === 'all';
    const title = valueOrCheck(form.get('title'), 'Unbenannter Tanz');
    const id = original.id || uniqueId(slugify(title));
    const dance = normalizeDance({
      ...original,
      id,
      title,
      choreographer: valueOrCheck(form.get('choreographer')),
      music: [{ title: valueOrCheck(form.get('musicTitle')), artist: valueOrCheck(form.get('musicArtist')) }],
      level: valueOrCheck(form.get('level')),
      counts: numberOrNull(form.get('counts')),
      walls: numberOrNull(form.get('walls')),
      motion: canonicalMotion(form.get('motion')),
      rhythm: valueOrCheck(form.get('rhythm')),
      meter: valueOrCheck(form.get('meter')),
      bpmMin: numberOrNull(form.get('bpmMin')),
      bpmMax: numberOrNull(form.get('bpmMax')),
      restarts: numberOrNull(form.get('restarts')),
      tags: numberOrNull(form.get('tags')),
      bridges: numberOrNull(form.get('bridges')),
      introCounts: numberOrNull(form.get('introCounts')),
      teacher: valueOrCheck(form.get('teacher')),
      publishedYear: numberOrNull(form.get('publishedYear')),
      videoUrl: safeUrl(form.get('videoUrl')),
      sourceUrl: safeUrl(form.get('videoUrl')) || original.sourceUrl,
      status: form.get('status') || 'Zu prüfen',
      note: String(form.get('note') || '').trim(),
      source: BASE_IDS.has(id) ? `${original.source || 'CLDF'} · lokal bearbeitet` : 'Eigener CLDF-Eintrag',
      coreMetadataVerified: core,
      classificationVerified: classification,
      bpmVerified,
      recognitionAliases: [title, form.get('choreographer'), form.get('musicTitle'), form.get('musicArtist')].filter(Boolean),
    }, id);
    dance.dataQuality = qualityLabel(dance);
    return dance;
  }

  function saveDance(dance) {
    if (BASE_IDS.has(dance.id)) state.overrides[dance.id] = clone(dance);
    else {
      const index = state.customDances.findIndex((item) => item.id === dance.id);
      if (index >= 0) state.customDances[index] = clone(dance);
      else state.customDances.push(clone(dance));
    }
    persistDanceChanges();
    rebuildDanceState();
  }

  function validateDanceImport(payload) {
    const list = Array.isArray(payload) ? payload : payload?.dances;
    if (!Array.isArray(list)) throw new Error('Die Datei enthält keine Tanzliste.');
    if (list.length > 5000) throw new Error('Die Datei enthält zu viele Einträge.');
    return list.map((dance, index) => {
      if (!dance || typeof dance !== 'object') throw new Error(`Eintrag ${index + 1} ist ungültig.`);
      if (!String(dance.title || '').trim()) throw new Error(`Eintrag ${index + 1} hat keinen Tanznamen.`);
      return normalizeDance(dance, dance.id || uniqueId(slugify(dance.title)));
    });
  }

  async function importDanceDatabase(file) {
    const payload = JSON.parse(await file.text());
    const list = validateDanceImport(payload);
    let updated = 0;
    let added = 0;
    for (const dance of list) {
      if (BASE_IDS.has(dance.id)) {
        state.overrides[dance.id] = clone(dance);
        updated += 1;
      } else {
        const index = state.customDances.findIndex((item) => item.id === dance.id);
        if (index >= 0) state.customDances[index] = clone(dance);
        else state.customDances.push(clone(dance));
        added += 1;
      }
    }
    persistDanceChanges();
    rebuildDanceState();
    renderAll();
    toast(`${updated} Einträge aktualisiert, ${added} hinzugefügt.`);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function exportDances() {
    const payload = {
      format: 'CLDF-DANCE-DATABASE',
      version: 2,
      appVersion: APP_VERSION,
      databaseVersion: DATABASE_VERSION,
      exportedAt: new Date().toISOString(),
      dances: state.dances.filter((dance) => !dance.externalCatalog),
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'CLDF-Tanzdatenbank.json');
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const headers = ['Tanz', 'Choreograf', 'Lied', 'Interpret', 'Level', 'Counts', 'Walls', 'Restarts', 'Tags', 'Tags/Restarts laut Sheet', 'Motion', 'Rhythmus', 'Takt', 'BPM von', 'BPM bis', 'Teacher', 'Jahr', 'Quelle', 'Tanzsheet', 'Video'];
    const rows = state.dances.map((dance) => {
      const song = dance.music?.[0] || {};
      return [dance.title, dance.choreographer, song.title, song.artist, dance.level, dance.countsText || dance.counts, dance.wallsText || dance.walls, dance.restarts, dance.tags, dance.tagInfo, canonicalMotion(dance.motion), dance.rhythm, dance.meter, dance.bpmMin, dance.bpmMax, dance.teacher, dance.publishedYear, dance.sourceGroup, dance.sheetUrl, dance.videoUrl];
    });
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'CLDF-Tanzdatenbank.csv');
  }

  let songApiLookupCache = null;

  function getSongApiLookup() {
    if (songApiLookupCache) return songApiLookupCache;
    const exact = new Map();
    const byTitle = new Map();
    const byApiId = new Map();
    for (const entry of SONG_API_ENTRIES) {
      if (!entry?.title) continue;
      const key = songIdentity(entry.title, entry.artist || '');
      exact.set(key, entry);
      const titleKey = compactKey(entry.title);
      if (!byTitle.has(titleKey)) byTitle.set(titleKey, []);
      byTitle.get(titleKey).push(entry);
      for (const apiId of entry.apiSongIds || []) {
        const id = String(apiId || '').trim();
        if (id) byApiId.set(id, entry);
      }
    }
    songApiLookupCache = { exact, byTitle, byApiId };
    return songApiLookupCache;
  }

  function findSongApiEntry(title = '', artist = '') {
    if (!title) return null;
    const lookup = getSongApiLookup();
    const exact = lookup.exact.get(songIdentity(title, artist));
    if (exact) return exact;
    const titleMatches = lookup.byTitle.get(compactKey(title)) || [];
    if (titleMatches.length === 1) return titleMatches[0];
    if (!titleMatches.length) return null;
    const ranked = titleMatches.map((entry) => ({
      entry,
      score: artist && entry.artist ? tokenScore(artist, entry.artist) : 0,
    })).sort((left, right) => right.score - left.score);
    return ranked[0]?.score >= 70 ? ranked[0].entry : null;
  }

  function mergeSongApiEntry(song, apiEntry, danceIdsByTitle) {
    if (!song || !apiEntry) return song;
    song.apiDataAvailable = true;
    song.apiSongIds = [...new Set([...(song.apiSongIds || []), ...(apiEntry.apiSongIds || []).map(String)])];
    song.apiStations = [...new Set([...(song.apiStations || []), ...(apiEntry.stations || []).map((station) => station.displayName || station.name).filter(Boolean)])];
    song.apiStationKeys = [...new Set([...(song.apiStationKeys || []), ...(apiEntry.stations || []).map((station) => station.name).filter(Boolean)])];
    song.apiEndpointCount = [...new Set((apiEntry.stations || []).flatMap((station) => Object.values(station.apiUrls || {})).filter(Boolean))].length;
    song.apiAlbums = [...new Set([...(song.apiAlbums || []), ...(apiEntry.albums || [])])];
    song.apiGenres = [...new Set([...(song.apiGenres || []), ...(apiEntry.genres || [])])];
    song.apiReleaseYears = [...new Set([...(song.apiReleaseYears || []), ...(apiEntry.releaseYears || [])])];
    song.apiCandidateDances = [...new Set([...(song.apiCandidateDances || []), ...(apiEntry.candidateDances || []), ...(apiEntry.radioDances || [])])];
    song.apiExactDanceCandidates = [...new Set([...(song.apiExactDanceCandidates || []), ...(apiEntry.exactDanceCandidates || [])])];
    song.apiPlayCount = Number(song.apiPlayCount || 0) + Number(apiEntry.playCount || 0);
    song.apiLastPlayedAt = [song.apiLastPlayedAt, apiEntry.lastPlayedAt].filter(Boolean).sort().at(-1) || '';
    song.apiSources = [...(song.apiSources || []), ...(apiEntry.stations || []).map((station) => ({
      name: station.name || '',
      displayName: station.displayName || station.name || '',
      apiSongIds: (station.apiSongIds || []).map(String),
      sourceEndpoints: station.sourceEndpoints || [],
      apiUrls: station.apiUrls || {},
    }))];
    const exactCandidates = [...new Set([...(apiEntry.exactDanceCandidates || []), ...(apiEntry.candidateDances || []).filter((danceTitle) => danceIdsByTitle.has(compactKey(danceTitle)))])];
    for (const danceTitle of exactCandidates) {
      for (const danceId of danceIdsByTitle.get(compactKey(danceTitle)) || []) {
        if (!song.danceIds.includes(danceId)) song.danceIds.push(danceId);
      }
    }
    if (!song.sources.includes('Song-API-Sammlung')) song.sources.push('Song-API-Sammlung');
    return song;
  }

  function songApiInlineHtml(song) {
    const ids = [...new Set((song?.apiSongIds || []).map(String).filter(Boolean))];
    const stations = [...new Set((song?.apiStations || []).filter(Boolean))];
    if (!song?.apiDataAvailable && !ids.length) return '';
    const details = [];
    if (stations.length) details.push(stations.slice(0, 3).join(', '));
    if (ids.length) details.push(`Song-ID${ids.length === 1 ? '' : 's'} ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? ' …' : ''}`);
    const metadata = [
      ...(song.apiAlbums || []).slice(0, 1),
      ...(song.apiGenres || []).slice(0, 1),
      ...(song.apiReleaseYears || []).slice(0, 1),
    ].filter(Boolean);
    if (metadata.length) details.push(metadata.join(' · '));
    return `<div class="song-api-inline"><span class="song-api-badge">API-Daten vorhanden</span><small>${escapeHtml(details.join(' · ') || 'Liedbezogene API-Zuordnung geladen')}</small></div>`;
  }

  function songResultHtml(song, confidenceLabel) {
    return `<strong>${escapeHtml(song?.title || '')}</strong><small>${escapeHtml(song?.artist || 'Interpret nicht angegeben')}</small><span class="song-confidence">${escapeHtml(confidenceLabel)}</span>${songApiInlineHtml(song)}`;
  }

  function getSongCatalog() {
    const songs = new Map();
    const danceIdsByTitle = new Map();
    for (const dance of state.dances) {
      const danceTitleKey = compactKey(dance.title);
      if (danceTitleKey) {
        if (!danceIdsByTitle.has(danceTitleKey)) danceIdsByTitle.set(danceTitleKey, []);
        danceIdsByTitle.get(danceTitleKey).push(dance.id);
      }
      for (const music of dance.music || []) {
        if (!music.title || compactKey(music.title) === 'zu prufen') continue;
        const songKey = songIdentity(music.title, music.artist || '');
        if (!songs.has(songKey)) songs.set(songKey, { songKey, title: music.title, artist: music.artist || '', danceIds: [], sources: [] });
        const song = songs.get(songKey);
        if (!song.danceIds.includes(dance.id)) song.danceIds.push(dance.id);
        if (!song.sources.includes(dance.sourceGroup || dance.source || 'CLDF')) song.sources.push(dance.sourceGroup || dance.source || 'CLDF');
      }
    }

    const songsByTitle = new Map();
    for (const song of songs.values()) {
      const key = compactKey(song.title);
      if (!songsByTitle.has(key)) songsByTitle.set(key, []);
      songsByTitle.get(key).push(song);
    }

    const liveEntries = RADIO_LIVE_API?.getEntries?.() || [];
    const radioEntries = [...RADIO_ENTRIES, ...(Array.isArray(liveEntries) ? liveEntries : [])];
    for (const entry of radioEntries) {
      if (!entry?.title || entry.isJingle) continue;
      const exactKey = songIdentity(entry.title, entry.artist || '');
      const titleMatches = songsByTitle.get(compactKey(entry.title)) || [];
      let song = songs.get(exactKey);
      if (!song && titleMatches.length === 1 && (!titleMatches[0].artist || !entry.artist)) song = titleMatches[0];
      if (!song) {
        song = { songKey: exactKey, title: entry.title, artist: entry.artist || '', danceIds: [], sources: [] };
        songs.set(exactKey, song);
        const titleKey = compactKey(entry.title);
        if (!songsByTitle.has(titleKey)) songsByTitle.set(titleKey, []);
        songsByTitle.get(titleKey).push(song);
      }
      song.radioStations = [...new Set([...(song.radioStations || []), ...(entry.stations || [])])];
      song.apiDataAvailable = true;
      song.apiSongIds = [...new Set([...(song.apiSongIds || []), ...(entry.apiSongIds || []).map(String)])];
      song.apiStations = [...new Set([...(song.apiStations || []), ...(entry.stations || []).map((stationKey) => RADIO_API_DATA.stations?.find((station) => station.name === stationKey)?.displayName || stationKey).filter(Boolean)])];
      song.apiGenres = [...new Set([...(song.apiGenres || []), ...(entry.genres || [])])];
      song.apiReleaseYears = [...new Set([...(song.apiReleaseYears || []), ...(entry.releaseYears || [])])];
      song.radioCandidateDances = [...new Set([...(song.radioCandidateDances || []), ...(entry.candidateDances || [])])];
      const exactFromLiveSuggestions = (entry.candidateDances || []).filter((danceTitle) => danceIdsByTitle.has(compactKey(danceTitle)));
      song.radioExactDanceCandidates = [...new Set([...(song.radioExactDanceCandidates || []), ...(entry.exactDanceCandidates || []), ...exactFromLiveSuggestions])];
      song.radioPlayCount = Number(song.radioPlayCount || 0) + Number(entry.playCount || 0);
      song.radioLastPlayedAt = [song.radioLastPlayedAt, entry.lastPlayedAt].filter(Boolean).sort().at(-1) || '';
      if (!song.sources.includes('laut.fm-Radio-API')) song.sources.push('laut.fm-Radio-API');
      for (const danceTitle of song.radioExactDanceCandidates) {
        for (const danceId of danceIdsByTitle.get(compactKey(danceTitle)) || []) {
          if (!song.danceIds.includes(danceId)) song.danceIds.push(danceId);
        }
      }
    }

    for (const apiEntry of SONG_API_ENTRIES) {
      if (!apiEntry?.title) continue;
      const exactKey = songIdentity(apiEntry.title, apiEntry.artist || '');
      const titleMatches = songsByTitle.get(compactKey(apiEntry.title)) || [];
      let song = songs.get(exactKey);
      if (!song && titleMatches.length === 1 && (!titleMatches[0].artist || !apiEntry.artist || tokenScore(titleMatches[0].artist, apiEntry.artist) >= 70)) song = titleMatches[0];
      if (!song) {
        song = { songKey: exactKey, title: apiEntry.title, artist: apiEntry.artist || '', danceIds: [], sources: [] };
        songs.set(exactKey, song);
        const titleKey = compactKey(apiEntry.title);
        if (!songsByTitle.has(titleKey)) songsByTitle.set(titleKey, []);
        songsByTitle.get(titleKey).push(song);
      }
      mergeSongApiEntry(song, apiEntry, danceIdsByTitle);
    }
    return songs;
  }

  function songIdentity(title = '', artist = '') {
    return `${compactKey(title)}|${compactKey(artist)}`;
  }

  function tokenScore(a, b) {
    const left = normalize(a);
    const right = normalize(b);
    if (!left || !right) return 0;
    if (left === right) return 100;
    if (left.includes(right) || right.includes(left)) return 88;
    const leftTokens = new Set(left.split(' ').filter((token) => token.length > 1));
    const rightTokens = new Set(right.split(' ').filter((token) => token.length > 1));
    const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
    const union = new Set([...leftTokens, ...rightTokens]).size || 1;
    return Math.round((intersection / union) * 100);
  }

  function findSongsByText(text) {
    const catalog = [...getSongCatalog().values()];
    return catalog.map((song) => {
      const score = Math.max(
        tokenScore(text, song.title),
        tokenScore(text, `${song.title} ${song.artist}`),
        tokenScore(text, `${song.artist} ${song.title}`),
      );
      return { song, score };
    }).filter((item) => item.score > 30).sort((a, b) => b.score - a.score);
  }

  function matchOnlineSongToCatalog(recognition) {
    if (!recognition?.title) return null;
    const catalogMap = getSongCatalog();
    const apiEntry = findSongApiEntry(recognition.title, recognition.artist || '');
    if (apiEntry) {
      const exactSong = catalogMap.get(songIdentity(apiEntry.title, apiEntry.artist || ''));
      if (exactSong) return { song: exactSong, titleScore: 100, artistScore: 100, score: 100, apiMatched: true, apiEntry };
      const titleOnly = [...catalogMap.values()].filter((song) => compactKey(song.title) === compactKey(apiEntry.title));
      if (titleOnly.length === 1) return { song: titleOnly[0], titleScore: 100, artistScore: 100, score: 100, apiMatched: true, apiEntry };
    }
    const catalog = [...catalogMap.values()];
    const ranked = catalog.map((song) => {
      const titleScore = tokenScore(recognition.title, song.title);
      const artistScore = recognition.artist && song.artist ? tokenScore(recognition.artist, song.artist) : 60;
      const combined = Math.round(titleScore * .78 + artistScore * .22);
      return { song, titleScore, artistScore, score: combined };
    }).sort((left, right) => right.score - left.score || right.titleScore - left.titleScore);
    const best = ranked[0];
    if (!best) return null;
    const titleExact = compactKey(recognition.title) === compactKey(best.song.title);
    const acceptable = titleExact
      ? best.artistScore >= 28 || !recognition.artist || !best.song.artist
      : best.titleScore >= 82 && best.score >= 72;
    return acceptable ? best : null;
  }

  function allFingerprintEntries() {
    const embedded = Array.isArray(FINGERPRINT_DB.entries) ? FINGERPRINT_DB.entries : [];
    return [...embedded, ...(state.audioFingerprints || [])];
  }

  async function recognizeSongOffline(blob) {
    if (blob?.name) {
      const name = String(blob.name).replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ');
      const candidate = findSongsByText(name)[0];
      if (candidate?.score >= 92) return { title: candidate.song.title, artist: candidate.song.artist || '', source: 'Dateiname', confidence: candidate.score };
    }
    const entries = allFingerprintEntries();
    if (!AUDIO || !entries.length) return null;
    const audio = await AUDIO.decodeBlob(blob);
    const fingerprint = await AUDIO.extractFingerprint(audio, {
      maxSeconds: Math.min(30, audio.duration || 30),
      onProgress: (percent, text) => setTaskProgress(true, 'Lied wird lokal erkannt', text, 52 + percent * .28),
    });
    const match = await AUDIO.matchFingerprint(fingerprint, entries, {
      onProgress: (percent) => setTaskProgress(true, 'Lied wird lokal erkannt', `Vergleich mit ${entries.length} Referenz${entries.length === 1 ? '' : 'en'} …`, 80 + percent * .16),
    });
    if (!match?.accepted) return null;
    return {
      title: match.entry.title || '',
      artist: match.entry.artist || '',
      source: 'Lokaler Audio-Fingerabdruck',
      fingerprintScore: match.score,
      confidence: match.confidence,
      fingerprintVotes: match.votes,
    };
  }

  function cleanMediaFilename(name = '') {
    return String(name)
      .replace(/\.[^.]+$/, '')
      .replace(/[_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\d{1,3}[ ._-]+/, '')
      .trim();
  }

  function filenameFallbackSong(fileName = '') {
    const clean = cleanMediaFilename(fileName);
    const parts = clean.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) return { artist: parts[0], title: parts.slice(1).join(' - '), songKey: songIdentity(parts.slice(1).join(' - '), parts[0]) };
    return { artist: '', title: clean || 'Unbenanntes Lied', songKey: songIdentity(clean || 'Unbenanntes Lied', '') };
  }

  function chooseSongForFingerprint(file, candidates = []) {
    return new Promise((resolve) => {
      const fallback = filenameFallbackSong(file.name);
      const catalog = [...getSongCatalog().values()].sort((a, b) => a.title.localeCompare(b.title, 'de'));
      const preferred = candidates[0]?.song?.songKey || '';
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        closeDialog();
        resolve(value);
      };
      openDialog(`
        <div class="dialog-hero"><p class="eyebrow">Musikbibliothek</p><h2>Lied zuordnen</h2><p>${escapeHtml(file.name)}</p></div>
        <p class="reference-picker-note">Wähle das Lied aus der App-Datenbank. Ist es noch nicht vorhanden, kann der Dateiname übernommen werden.</p>
        <div class="song-picker">
          <input id="fingerprintSongSearch" type="search" placeholder="Lied oder Interpret …" value="${escapeHtml(cleanMediaFilename(file.name))}">
          <select id="fingerprintSongSelect" size="10"></select>
          <div class="dialog-actions">
            <button id="fingerprintUseFilename" class="secondary-btn" type="button">Dateiname verwenden</button>
            <button id="fingerprintSkipFile" class="secondary-btn" type="button">Überspringen</button>
            <button id="fingerprintAssignSong" class="primary-btn" type="button">Zuordnen</button>
          </div>
        </div>`, { focusSelector: '#fingerprintSongSearch' });
      const input = $('#fingerprintSongSearch');
      const select = $('#fingerprintSongSelect');
      const render = () => {
        const query = normalize(input.value);
        const ranked = query ? findSongsByText(query).slice(0, 150).map((item) => item.song) : catalog.slice(0, 150);
        select.innerHTML = ranked.map((song) => `<option value="${escapeHtml(song.songKey)}" ${song.songKey === preferred ? 'selected' : ''}>${escapeHtml(song.title)}${song.artist ? ` – ${escapeHtml(song.artist)}` : ''}</option>`).join('');
        if (!select.value && select.options.length) select.selectedIndex = 0;
      };
      input.addEventListener('input', render);
      $('#fingerprintAssignSong').addEventListener('click', () => {
        const song = getSongCatalog().get(select.value);
        if (!song) return toast('Bitte ein Lied auswählen.');
        finish(song);
      });
      $('#fingerprintUseFilename').addEventListener('click', () => finish(fallback));
      $('#fingerprintSkipFile').addEventListener('click', () => finish(null));
      $('#appDialog').addEventListener('close', () => { if (!settled) { settled = true; resolve(null); } }, { once: true });
      render();
    });
  }

  async function resolveFingerprintSong(file) {
    const clean = cleanMediaFilename(file.name);
    const candidates = findSongsByText(clean).slice(0, 5);
    const best = candidates[0];
    const second = candidates[1];
    if (best && best.score >= 91 && (!second || best.score - second.score >= 5 || best.score >= 98)) return best.song;
    return await chooseSongForFingerprint(file, candidates);
  }

  function renderAudioFingerprintCatalog() {
    const entries = state.audioFingerprints || [];
    const count = allFingerprintEntries().length;
    const badge = $('#audioFingerprintCount');
    if (badge) badge.textContent = `${count} Lied${count === 1 ? '' : 'er'}`;
    const status = $('#audioFingerprintStatus');
    status?.classList.toggle('good', count > 0);
    status?.classList.toggle('warning', count === 0);
    if ($('#audioFingerprintStatusTitle')) $('#audioFingerprintStatusTitle').textContent = count ? 'Offline-Titelerkennung bereit' : 'Noch keine Referenzmusik';
    if ($('#audioFingerprintStatusText')) $('#audioFingerprintStatusText').textContent = count
      ? `${count} akustische Referenz${count === 1 ? '' : 'en'} sind lokal gespeichert. Die Musikdateien selbst wurden nicht gespeichert.`
      : 'Lies deine rechtmäßig vorhandenen Musikdateien einmal ein. Danach kann die Mikrofonerkennung diese Aufnahmen offline wiedererkennen.';
    const list = $('#audioFingerprintList');
    if (!list) return;
    list.innerHTML = entries.slice().sort((a, b) => a.title.localeCompare(b.title, 'de')).slice(0, 80).map((entry) => `
      <div class="catalog-item">
        <div><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.artist || 'Interpret nicht angegeben')} · ${Math.round(entry.duration || 0)} s · ${entry.hashes?.length || 0} Merkmale</small></div>
        <button class="text-button" type="button" data-delete-fingerprint="${escapeHtml(entry.id)}">Entfernen</button>
      </div>`).join('') || '<div class="empty-state">Noch keine eigene Referenzmusik eingelesen.</div>';
    $$('[data-delete-fingerprint]', list).forEach((button) => button.addEventListener('click', async () => {
      if (!STORE) return;
      await STORE.deleteFingerprint(button.dataset.deleteFingerprint);
      state.audioFingerprints = state.audioFingerprints.filter((entry) => entry.id !== button.dataset.deleteFingerprint);
      renderAudioFingerprintCatalog();
      await checkOnlineService(false);
      toast('Audio-Referenz entfernt.');
    }));
  }

  async function processAudioFingerprintFiles(fileList) {
    if (!STORE || !AUDIO) return toast('Der lokale Audio-Speicher ist in diesem Browser nicht verfügbar.', 4500);
    if (state.fingerprintBusy) return toast('Es werden bereits Musikdateien eingelesen.');
    const files = [...fileList].filter((file) => String(file.type || '').startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(file.name || ''));
    if (!files.length) return toast('Bitte unterstützte Musikdateien auswählen.');
    state.fingerprintBusy = true;
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const song = await resolveFingerprintSong(file);
        if (!song) { skipped += 1; continue; }
        try {
          setTaskProgress(true, `Musik wird eingelesen (${index + 1}/${files.length})`, `${song.title}${song.artist ? ` – ${song.artist}` : ''}`, 2);
          const audio = await AUDIO.decodeBlob(file);
          const fingerprint = await AUDIO.extractFingerprint(audio, {
            maxSeconds: 8 * 60,
            onProgress: (percent, text) => setTaskProgress(true, `Musik wird eingelesen (${index + 1}/${files.length})`, `${song.title} · ${text}`, percent),
          });
          const songKey = song.songKey || songIdentity(song.title, song.artist || '');
          const existing = state.audioFingerprints.find((entry) => entry.songKey === songKey && entry.fileName === file.name);
          const entry = {
            id: existing?.id || uniqueId('audio-ref'),
            title: song.title,
            artist: song.artist || '',
            songKey,
            fileName: file.name,
            fileSize: file.size || 0,
            duration: fingerprint.duration,
            bpm: fingerprint.bpm,
            algorithm: fingerprint.algorithm,
            sampleRate: fingerprint.sampleRate,
            frameSize: fingerprint.frameSize,
            hopSize: fingerprint.hopSize,
            hashes: fingerprint.hashes,
            times: fingerprint.times,
            createdAt: new Date().toISOString(),
          };
          await STORE.putFingerprint(entry);
          const previousIndex = state.audioFingerprints.findIndex((item) => item.id === entry.id);
          if (previousIndex >= 0) state.audioFingerprints[previousIndex] = entry;
          else state.audioFingerprints.push(entry);
          imported += 1;
          renderAudioFingerprintCatalog();
        } catch (error) {
          console.error(error);
          failed += 1;
          toast(`${file.name}: ${error.message || 'konnte nicht eingelesen werden'}`, 5000);
        }
      }
    } finally {
      state.fingerprintBusy = false;
      setTaskProgress(false);
    }
    renderAudioFingerprintCatalog();
    await checkOnlineService(false);
    toast(`${imported} Audio-Referenz${imported === 1 ? '' : 'en'} gespeichert${skipped ? ` · ${skipped} übersprungen` : ''}${failed ? ` · ${failed} fehlgeschlagen` : ''}.`, 5000);
  }

  async function exportAudioFingerprints() {
    if (!STORE) return toast('Lokaler Speicher nicht verfügbar.');
    const payload = await STORE.exportFingerprints();
    downloadBlob(new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'CLDF-Audio-Fingerprints.json');
  }

  async function importAudioFingerprints(file) {
    if (!STORE) throw new Error('Lokaler Speicher nicht verfügbar.');
    const payload = JSON.parse(await file.text());
    const count = await STORE.importFingerprints(payload);
    state.audioFingerprints = await STORE.getAllFingerprints();
    renderAudioFingerprintCatalog();
    await checkOnlineService(false);
    toast(`${count} Audio-Referenz${count === 1 ? '' : 'en'} eingespielt.`);
  }

  async function clearAudioFingerprints() {
    if (!state.audioFingerprints.length) return toast('Die eigene Musikbibliothek ist bereits leer.');
    if (!confirm('Alle lokal erzeugten Audio-Fingerprints löschen? Die Musikdateien selbst sind nicht in der App gespeichert.')) return;
    await STORE.clearFingerprints();
    state.audioFingerprints = [];
    renderAudioFingerprintCatalog();
    await checkOnlineService(false);
    toast('Audio-Fingerprints gelöscht.');
  }

  function validateGetInLineCatalog(payload) {
    const list = Array.isArray(payload) ? payload : payload?.dances;
    if (!Array.isArray(list)) throw new Error('Die Datei enthält keinen Get-in-Line-Katalog.');
    if (list.length > 30000) throw new Error('Der Get-in-Line-Katalog ist ungewöhnlich groß.');
    const dances = list.map((dance, index) => {
      if (!dance || typeof dance !== 'object' || !String(dance.title || '').trim()) throw new Error(`Get-in-Line-Eintrag ${index + 1} ist ungültig.`);
      const sheetUrl = safeUrl(dance.sheetUrl || dance.sourceUrl || '');
      return {
        id: String(dance.id || `gil-import-${index}-${slugify(dance.title)}`),
        title: String(dance.title).trim(),
        choreographer: valueOrCheck(dance.choreographer),
        level: valueOrCheck(dance.level),
        counts: numberOrNull(dance.counts),
        countsText: dance.countsText || (numberOrNull(dance.counts) !== null ? `${Number(dance.counts)} count` : 'Zu prüfen'),
        walls: numberOrNull(dance.walls),
        wallsText: dance.wallsText || (numberOrNull(dance.walls) !== null ? `${Number(dance.walls)} wall` : 'Zu prüfen'),
        restarts: numberOrNull(dance.restarts) ?? 0,
        tags: numberOrNull(dance.tags) ?? 0,
        bridges: numberOrNull(dance.bridges) ?? 0,
        breaks: numberOrNull(dance.breaks) ?? 0,
        ending: Boolean(dance.ending),
        tagInfo: String(dance.tagInfo || ''),
        music: Array.isArray(dance.music) ? dance.music.map((item) => ({ title: valueOrCheck(item?.title), artist: valueOrCheck(item?.artist) })) : [],
        musicRaw: String(dance.musicRaw || ''),
        motion: dance.motion || 'Zu prüfen',
        rhythm: dance.rhythm || 'Zu prüfen',
        meter: dance.meter || 'Zu prüfen',
        knownBpms: Array.isArray(dance.knownBpms) ? dance.knownBpms.map(Number).filter(Number.isFinite) : [],
        publishedYear: numberOrNull(dance.publishedYear),
        publishedAt: dance.publishedAt || '',
        updatedAt: dance.updatedAt || '',
        source: 'Get-in-Line',
        sourceGroup: 'Get-in-Line',
        sourceUrl: sheetUrl,
        sheetUrl,
        externalCatalog: true,
        status: 'Get-in-Line',
        coreMetadataVerified: Boolean(dance.coreMetadataVerified ?? true),
        classificationVerified: Boolean(dance.classificationVerified),
        bpmVerified: Boolean(dance.bpmVerified),
        dataQuality: 'Metadaten aus Get-in-Line-Tanzsheet',
        recognitionAliases: [dance.title, dance.choreographer, ...(Array.isArray(dance.music) ? dance.music.flatMap((item) => [item?.title, item?.artist]) : [])].filter(Boolean),
      };
    });
    const metaByTitle = new Map();
    for (const entry of SONG_META.entries || []) {
      const key = compactKey(entry.title);
      if (!metaByTitle.has(key)) metaByTitle.set(key, []);
      metaByTitle.get(key).push(entry);
    }
    for (const dance of dances) {
      const bpms = new Set(dance.knownBpms || []);
      const motions = new Set();
      const rhythms = new Set();
      const meters = new Set();
      for (const music of dance.music || []) {
        const candidates = metaByTitle.get(compactKey(music.title)) || [];
        const match = candidates.find((entry) => !compactKey(music.artist) || !compactKey(entry.artist) || compactKey(entry.artist) === compactKey(music.artist)) || candidates[0];
        if (!match) continue;
        if (compactKey(music.artist) === 'zu prufen' && match.artist) music.artist = match.artist;
        for (const bpm of match.bpm || []) if (Number.isFinite(Number(bpm))) bpms.add(Number(bpm));
        for (const motion of match.motion || []) if (motion && compactKey(motion) !== 'zu prufen') motions.add(motion);
        for (const rhythm of match.rhythm || []) if (rhythm && compactKey(rhythm) !== 'zu prufen') rhythms.add(rhythm);
        for (const meter of match.meter || []) if (meter && compactKey(meter) !== 'zu prufen') meters.add(meter);
      }
      dance.knownBpms = [...bpms].sort((a, b) => a - b);
      if (dance.knownBpms.length) {
        dance.bpmMin = Math.min(...dance.knownBpms);
        dance.bpmMax = Math.max(...dance.knownBpms);
      }
      if (motions.size === 1) dance.motion = [...motions][0];
      if (rhythms.size === 1) dance.rhythm = [...rhythms][0];
      if (meters.size === 1) dance.meter = [...meters][0];
    }
    return {
      appVersion: payload?.appVersion || APP_VERSION,
      source: 'Get-in-Line',
      generatedAt: payload?.generatedAt || new Date().toISOString(),
      count: dances.length,
      dances,
    };
  }

  function refreshBaseCatalogs() {
    BASE_DANCES = [...CLDF_DANCES, ...GETINLINE_DANCES];
    BASE_IDS = new Set(BASE_DANCES.map((dance) => dance.id));
  }

  function updateGetInLineStatus() {
    const count = GETINLINE_DANCES.length;
    if ($('#getinlineCatalogCount')) $('#getinlineCatalogCount').textContent = `${count} Tänze`;
    $('#getinlineCatalogStatus')?.classList.toggle('good', count > 0);
    $('#getinlineCatalogStatus')?.classList.toggle('warning', count === 0);
    if ($('#getinlineCatalogStatusTitle')) $('#getinlineCatalogStatusTitle').textContent = count ? 'Get-in-Line-Katalog bereit' : 'Get-in-Line-Katalog noch leer';
    if ($('#getinlineCatalogStatusText')) $('#getinlineCatalogStatusText').textContent = count
      ? `${count} Metadatensätze mit den direkten Tanzsheet-Links sind lokal geladen.`
      : 'Mit dem mitgelieferten Aktualisierer wird der vollständige Metadatenkatalog erzeugt und anschließend hier eingespielt oder fest eingebettet.';
  }

  function applyGetInLineCatalog(payload, options = {}) {
    const validated = validateGetInLineCatalog(payload);
    GETINLINE_DANCES = validated.dances;
    state.getInLineFromStore = Boolean(options.fromStore);
    refreshBaseCatalogs();
    rebuildDanceState();
    renderAll();
    updateGetInLineStatus();
    return validated;
  }

  async function importGetInLineCatalog(file) {
    if (!STORE) throw new Error('Lokaler Speicher nicht verfügbar.');
    setTaskProgress(true, 'Get-in-Line-Katalog wird eingespielt', 'Datei wird geprüft und lokal gespeichert.', 20);
    try {
      const payload = JSON.parse(await file.text());
      const validated = validateGetInLineCatalog(payload);
      setTaskProgress(true, 'Get-in-Line-Katalog wird eingespielt', `${validated.dances.length} Tänze werden gespeichert.`, 60);
      await STORE.putCatalog('getinline', validated);
      applyGetInLineCatalog(validated, { fromStore: true });
      toast(`${validated.dances.length} Get-in-Line-Tänze lokal eingespielt.`, 5000);
    } finally {
      setTaskProgress(false);
    }
  }

  function exportGetInLineCatalog() {
    if (!GETINLINE_DANCES.length) return toast('Noch kein Get-in-Line-Katalog vorhanden.');
    const payload = { format: 'CLDF-GETINLINE-CATALOG', version: 1, generatedAt: new Date().toISOString(), count: GETINLINE_DANCES.length, dances: GETINLINE_DANCES };
    downloadBlob(new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'getinline-dances.json');
  }

  async function clearGetInLineCatalog() {
    if (!GETINLINE_DANCES.length) return toast('Der Get-in-Line-Katalog ist bereits leer.');
    if (!confirm('Den lokal eingespielten Get-in-Line-Katalog von diesem Gerät entfernen?')) return;
    if (STORE) await STORE.deleteCatalog('getinline');
    GETINLINE_DANCES = Array.isArray(GETINLINE_DATA.dances) ? GETINLINE_DATA.dances : [];
    state.getInLineFromStore = false;
    refreshBaseCatalogs();
    rebuildDanceState();
    renderAll();
    updateGetInLineStatus();
    toast('Lokaler Get-in-Line-Katalog entfernt.');
  }

  async function loadLargeLocalData() {
    if (!STORE) return;
    try {
      await STORE.open();
      state.audioFingerprints = await STORE.getAllFingerprints();
      const persistedCatalog = await STORE.getCatalog('getinline');
      if (persistedCatalog?.dances?.length && persistedCatalog.dances.length >= GETINLINE_DANCES.length) {
        const validated = validateGetInLineCatalog(persistedCatalog);
        GETINLINE_DANCES = validated.dances;
        state.getInLineFromStore = true;
        refreshBaseCatalogs();
      }
    } catch (error) {
      console.warn('Großer lokaler Speicher konnte nicht geladen werden.', error);
      toast('Der große lokale Datenspeicher ist nicht verfügbar. Die Grundfunktionen bleiben nutzbar.', 5000);
    }
  }

  function updateOnlineStatus() {
    const pill = $('#connectionPill');
    const banner = $('#offlineBanner');
    if (pill) {
      pill.textContent = 'Offline bereit';
      pill.title = 'Tanzdaten, Liedzuordnungen und Analyse sind lokal gespeichert';
      pill.classList.remove('error'); pill.classList.add('good');
    }
    banner?.classList.add('hidden');
    ['recordBtn', 'audioFile', 'captureAudioFile', 'captureDanceVideo', 'danceVideoFile'].forEach((id) => {
      const element = $(`#${id}`); if (element) element.disabled = false;
    });
    return true;
  }

  async function checkOnlineService(showMessage = true) {
    const fingerprintCount = allFingerprintEntries().length;
    state.onlineServiceReady = true;
    state.onlineServiceMessage = fingerprintCount
      ? `Musik-Erkennung bereit · ${fingerprintCount} Audio-Fingerprint${fingerprintCount === 1 ? '' : 's'} · ${SONG_API_ENTRIES.length} Song-API-Zuordnungen geladen.`
      : `Musik-Erkennung bereit · ${SONG_API_ENTRIES.length} Song-API-Zuordnungen, Liedliste, BPM, Motion und Rhythmus sind lokal verfügbar; für die exakte Audio-Titelerkennung bitte einmal eigene Musikdateien einlesen.`;
    const card = $('#onlineServiceStatus');
    const title = $('#onlineServiceStatusTitle');
    const text = $('#onlineServiceStatusText');
    card?.classList.add('good'); card?.classList.remove('warning');
    if (title) title.textContent = 'Musik-Erkennung bereit';
    if (text) text.textContent = state.onlineServiceMessage;
    if (showMessage) toast(state.onlineServiceMessage, 4500);
    return true;
  }

  function openManualSongPicker() {
    const songs = [...getSongCatalog().values()].sort((a, b) => a.title.localeCompare(b.title, 'de'));
    openDialog(`
      <div class="dialog-hero"><p class="eyebrow">Manuelle Auswahl</p><h2>Lied auswählen</h2><p>Durchsucht alle lokal gespeicherten Liedzuordnungen. Einträge ohne feste Tanzzuordnung werden entsprechend gekennzeichnet.</p></div>
      <div class="song-picker">
        <input id="songPickerSearch" type="search" placeholder="Lied oder Interpret …" autocomplete="off">
        <div id="songPickerList" class="song-picker-list"></div>
      </div>`, { focusSelector: '#songPickerSearch' });
    const render = () => {
      const query = normalize($('#songPickerSearch').value);
      const filtered = songs.filter((song) => !query || normalize(`${song.title} ${song.artist}`).includes(query)).slice(0, 120);
      $('#songPickerList').innerHTML = filtered.map((song) => `<button class="song-choice" type="button" data-song-key="${escapeHtml(song.songKey)}"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.artist || 'Interpret nicht angegeben')} · ${song.danceIds.length ? `${song.danceIds.length} Tanz${song.danceIds.length === 1 ? '' : 'e'}` : 'Noch kein fester Tanz'}${song.apiDataAvailable ? ' · API' : ''}</small></button>`).join('') || '<div class="empty-state">Kein Lied gefunden.</div>';
      $$('[data-song-key]', $('#songPickerList')).forEach((button) => button.addEventListener('click', () => {
        closeDialog();
        const song = getSongCatalog().get(button.dataset.songKey);
        if (song) showCatalogSongResult(song, 100, 'Manuell ausgewählt', { bpm: NaN, confidence: 0 });
      }));
    };
    $('#songPickerSearch').addEventListener('input', render);
    render();
  }

  function bpmDistance(bpm, min, max) {
    if (!Number.isFinite(bpm) || !Number.isFinite(min) || !Number.isFinite(max)) return null;
    const candidates = [bpm, bpm / 2, bpm * 2];
    let best = Infinity;
    for (const candidate of candidates) {
      if (candidate < min) best = Math.min(best, min - candidate);
      else if (candidate > max) best = Math.min(best, candidate - max);
      else best = 0;
    }
    return best;
  }

  function makePossibleBpms(values) {
    const source = (Array.isArray(values) ? values : [values]).map(Number).filter(Number.isFinite);
    const anchor = source[0] || 120;
    const set = new Set();
    for (const bpm of source) {
      for (const candidate of [bpm, bpm / 2, bpm * 2]) {
        const rounded = Math.round(candidate);
        if (rounded >= 55 && rounded <= 220) set.add(rounded);
      }
    }
    return [...set].sort((left, right) => Math.abs(left - anchor) - Math.abs(right - anchor)).slice(0, 8);
  }

  function tempoValues(tempo) {
    const values = Array.isArray(tempo?.possibleBpms) ? tempo.possibleBpms : [];
    if (Number.isFinite(tempo?.bpm)) values.unshift(Math.round(tempo.bpm));
    return makePossibleBpms(values);
  }

  function suggestMotionCandidates(bpms) {
    const values = Array.isArray(bpms) ? bpms : [bpms];
    const keyed = new Map();
    for (const bpm of values) {
      if (!Number.isFinite(bpm)) continue;
      for (const motion of MOTIONS) {
        for (const rhythm of motion.rhythms || []) {
          if (!rhythm.bpmMin || !rhythm.bpmMax) continue;
          const distance = bpmDistance(bpm, rhythm.bpmMin, rhythm.bpmMax);
          if (distance !== null && distance <= 18) {
            const key = `${motion.name}|${rhythm.name}`;
            const candidate = { motion: motion.name, rhythm: rhythm.name, distance, bpm, bpmMin: rhythm.bpmMin, bpmMax: rhythm.bpmMax };
            if (!keyed.has(key) || keyed.get(key).distance > distance) keyed.set(key, candidate);
          }
        }
      }
    }
    return [...keyed.values()].sort((a, b) => a.distance - b.distance).slice(0, 6);
  }

  function scoreDance(dance, bpms, candidates) {
    const values = Array.isArray(bpms) ? bpms : [bpms];
    let best = null;
    for (const bpm of values) {
      if (!Number.isFinite(bpm)) continue;
      let score = 0;
      let evidence = 0;
      let distance = null;
      if (dance.knownBpms?.length) {
        const nearest = dance.knownBpms.map((known) => Math.abs(bpm - known)).sort((a, b) => a - b)[0];
        if (nearest <= 2) score += 92;
        else if (nearest <= 5) score += 78;
        else if (nearest <= 10) score += 58;
        else if (nearest <= 18) score += 32;
        if (nearest <= 18) evidence += 1;
        distance = nearest;
      }
      if (dance.bpmMin && dance.bpmMax) {
        const rangeDistance = bpmDistance(bpm, dance.bpmMin, dance.bpmMax);
        score = Math.max(score, Math.max(0, 75 - rangeDistance * 4));
        evidence += 1;
        distance = distance === null ? rangeDistance : Math.min(distance, rangeDistance);
      }
      if (dance.classificationVerified) {
        const matching = candidates.find((candidate) => candidate.bpm === bpm && candidate.motion === canonicalMotion(dance.motion) && compactKey(candidate.rhythm) === compactKey(dance.rhythm));
        if (matching) score += Math.max(10, 28 - matching.distance);
        evidence += 1;
      }
      if (!evidence) continue;
      const result = { score: Math.min(99, Math.max(1, Math.round(score))), bpm, distance: distance ?? 99 };
      if (!best || result.score > best.score || (result.score === best.score && result.distance < best.distance)) best = result;
    }
    return best;
  }

  function primaryDanceScore(dance, bpm, recognitionScore = 0) {
    let score = Number(recognitionScore) || 0;
    score += Number(dance.coreMetadataVerified) * 8;
    score += Number(dance.classificationVerified) * 5;
    score += Number(dance.bpmVerified) * 4;
    if (Number.isFinite(bpm) && dance.bpmMin && dance.bpmMax) {
      const distance = bpmDistance(bpm, dance.bpmMin, dance.bpmMax);
      score += Math.max(0, 30 - (distance || 0) * 2);
    }
    return score;
  }

  function choosePrimaryDance(dances, bpm, scores = null, preferredDanceId = '') {
    if (!dances.length) return null;
    const preferred = preferredDanceId ? dances.find((dance) => dance.id === preferredDanceId) : null;
    if (preferred) return preferred;
    return [...dances].sort((left, right) => {
      const rightScore = primaryDanceScore(right, bpm, scores?.get(right.id) || 0);
      const leftScore = primaryDanceScore(left, bpm, scores?.get(left.id) || 0);
      return rightScore - leftScore || left.title.localeCompare(right.title, 'de');
    })[0];
  }

  function renderPrimaryDanceResult(dance, options = {}) {
    const container = $('#primaryDanceResult');
    if (!dance) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }
    const exact = options.mode === 'exact';
    const video = options.mode === 'video';
    const score = Number.isFinite(options.score) ? Math.round(options.score) : null;
    const motion = canonicalMotion(dance.motion);
    const explanation = exact
      ? `Dieses Lied ist in der Tanzdatenbank diesem Tanz zugeordnet${score !== null ? ` · ${score} % Lied-Übereinstimmung` : ''}${options.videoConfirmed ? ' · Körper- und Schrittanalyse passt zum Tanz.' : ''}.`
      : video
        ? `MediaPipe hat Körper und Schritte ausgewertet${score !== null ? ` · Beta-Vergleich ${score} %` : ''}. Der Treffer kann aus einer eigenen Referenz, einem Sheet-Schrittmuster oder beidem stammen und ersetzt keine sichere Liedzuordnung.`
        : `Dieser Tanz passt anhand des gemessenen Tempos am besten. Das Lied selbst wurde nicht sicher erkannt${score !== null ? ` · Vorschlagswert ${score} %` : ''}.`;
    container.innerHTML = `
      <div class="primary-dance-kicker">${exact ? '✓ Erkannter Tanz' : video ? '🎥 Video-Tanzerkennung · Beta' : '↯ Bester Tempo-Vorschlag'}</div>
      <div class="primary-dance-head">
        <div>
          <h2>${escapeHtml(dance.title)}</h2>
          <p>${escapeHtml(dance.choreographer)}</p>
        </div>
        <span class="primary-dance-badge ${exact ? 'exact' : 'suggestion'}">${exact ? (options.videoConfirmed ? 'Lied + Video bestätigt' : 'Sicher zugeordnet') : video ? 'Video-Beta' : 'Vorschlag'}</span>
      </div>
      <p class="primary-dance-song"><strong>Musik:</strong> ${escapeHtml(musicText(dance))}</p>
      <div class="primary-dance-meta">
        <div><small>Level</small><strong>${escapeHtml(dance.level || 'Zu prüfen')}</strong></div>
        <div><small>Counts</small><strong>${escapeHtml(dance.counts ?? '–')}</strong></div>
        <div><small>Walls</small><strong>${escapeHtml(dance.walls ?? '–')}</strong></div>
        <div><small>Motion</small><strong>${escapeHtml(motion)}</strong></div>
      </div>
      <p class="primary-dance-explanation">${escapeHtml(explanation)}</p>
      <div class="primary-dance-actions">
        <button id="openPrimaryDanceBtn" class="primary-btn" type="button">Tanzdetails anzeigen</button>
        ${dance.videoUrl ? `<a class="secondary-btn" href="${escapeHtml(dance.videoUrl)}" target="_blank" rel="noopener">CLDF-Video öffnen</a>` : ''}
      </div>`;
    container.classList.remove('hidden');
    $('#openPrimaryDanceBtn').addEventListener('click', () => openDanceDetails(dance.id));
  }

  function renderAdditionalMatches(dances, heading, emptyText, scores = null) {
    const headingBlock = $('#matchHeading').closest('.section-heading');
    const hasMatches = dances.length > 0;
    headingBlock.classList.toggle('hidden', !hasMatches);
    $('#matchList').classList.toggle('hidden', !hasMatches);
    $('#matchHeading').textContent = heading;
    if (hasMatches) renderDanceList($('#matchList'), dances, emptyText, scores);
    else $('#matchList').innerHTML = '';
  }

  function renderVideoMotionSummary(signature = null, match = null, options = {}) {
    const container = $('#videoMotionResult');
    if (!container) return;
    if (!signature) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }
    const descriptors = VM?.describeSignature ? VM.describeSignature(signature) : [];
    const matchedDance = match?.reference?.danceId ? state.dances.find((dance) => dance.id === match.reference.danceId) : null;
    const isSheet = match?.reference?.type === 'sheet-pattern';
    const sourceName = isSheet ? 'Sheet-Schrittmuster' : 'Bewegungsreferenz';
    const status = options.conflict
      ? `Die Körperbewegung ähnelt „${matchedDance?.title || match?.reference?.danceTitle || 'einem anderen Tanz'}“, aber das erkannte Lied und seine feste Tanzzuordnung haben Vorrang.`
      : matchedDance
        ? `Bestes lokales ${sourceName}: ${matchedDance.title} · ${Math.round(match.score || 0)} % Beta-Übereinstimmung.`
        : (state.motionReferences.length || STEP_PATTERNS.length)
          ? 'Kein Körper- oder Schrittmuster war eindeutig genug für eine belastbare Beta-Zuordnung.'
          : 'Noch keine lokalen Bewegungsreferenzen oder Sheet-Muster gespeichert.';
    container.innerHTML = `
      <strong>🎥 MediaPipe Körper- und Schrittanalyse${options.confirmed ? ' bestätigt den Liedtreffer' : ' · Beta'}</strong>
      <small>${escapeHtml(status)}</small>
      <div class="chip-row">${descriptors.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>`;
    container.classList.remove('hidden');
  }

  function combineVideoMatches(referenceMatches = [], sheetMatches = []) {
    const byDance = new Map();
    for (const item of referenceMatches) {
      const danceId = item?.reference?.danceId;
      if (!danceId) continue;
      byDance.set(danceId, {
        ...item,
        reference: { ...item.reference, type: item.reference.type || 'video-reference' },
        sources: ['video-reference'],
      });
    }
    for (const item of sheetMatches) {
      const danceId = item?.reference?.danceId;
      if (!danceId) continue;
      const existing = byDance.get(danceId);
      if (!existing) {
        byDance.set(danceId, { ...item, sources: ['sheet-pattern'] });
        continue;
      }
      const best = existing.score >= item.score ? existing : item;
      const combinedScore = Math.min(100, Math.max(existing.score, item.score) + Math.round(Math.min(existing.score, item.score) * 0.08));
      byDance.set(danceId, {
        ...best,
        score: combinedScore,
        confidence: Math.max(existing.confidence || 0, item.confidence || 0),
        sources: ['video-reference', 'sheet-pattern'],
        details: { ...(existing.details || {}), ...(item.details || {}), combined: true },
        reference: { ...best.reference, type: 'combined' },
      });
    }
    return [...byDance.values()].sort((left, right) => right.score - left.score || (right.confidence || 0) - (left.confidence || 0));
  }

  function acceptedMotionMatch(matches = []) {
    const best = matches[0];
    const second = matches[1];
    if (!best) return null;
    const separation = best.score - (second?.score || 0);
    const isSheetOnly = best.reference?.type === 'sheet-pattern';
    const minimum = isSheetOnly ? 68 : 70;
    return best.score >= minimum && (separation >= 5 || best.score >= 84) ? best : null;
  }

  function showExactSongResult(song, confidence, source, tempo = {}, addToHistory = true, options = {}) {
    const dances = song.danceIds.map((id) => state.dances.find((dance) => dance.id === id)).filter(Boolean);
    const scoreMap = new Map(dances.map((dance) => [dance.id, confidence]));
    const motionMatch = options.motionMatch || null;
    const motionDanceId = motionMatch?.reference?.danceId || '';
    const motionConfirmsSongDance = Boolean(motionDanceId && dances.some((dance) => dance.id === motionDanceId) && motionMatch.score >= 68);
    const motionConflicts = Boolean(motionDanceId && !dances.some((dance) => dance.id === motionDanceId) && motionMatch.score >= 70);
    // Ein erkannter Liedtreffer hat immer Vorrang. BPM darf die Tanzsheet-Zuordnung nicht umsortieren.
    // Eine vorhandene Video-Referenz darf nur zwischen Tänzen wählen, die bereits demselben Lied zugeordnet sind.
    const primaryDance = choosePrimaryDance(dances, NaN, scoreMap, motionConfirmsSongDance ? motionDanceId : '');
    const otherDances = dances.filter((dance) => dance.id !== primaryDance?.id);
    $('#resultModeLabel').textContent = source;
    $('#resultTitle').textContent = 'Lied erkannt';
    $('#songResult').classList.remove('hidden');
    $('#songResult').innerHTML = songResultHtml(song, `${Math.round(confidence)} % Übereinstimmung`);
    $('#tempoResult').classList.toggle('hidden', !Number.isFinite(tempo.bpm));
    $('#bpmValue').textContent = Number.isFinite(tempo.bpm) ? Math.round(tempo.bpm) : '–';
    $('#analysisSummary').textContent = Number.isFinite(tempo.bpm)
      ? `Tanzsheet-Zuordnung hat Vorrang. Gemessenes Tempo: etwa ${Math.round(tempo.bpm)} BPM; es beeinflusst die Auswahl nicht.`
      : 'Tanzsheet-Zuordnung hat Vorrang. Alle diesem Lied zugeordneten Tänze werden angezeigt.';
    const exactBpms = tempoValues(tempo);
    $('#alternateBpmRow').classList.toggle('hidden', exactBpms.length < 2);
    $('#alternateBpmValue').textContent = exactBpms.join(', ');
    $('#motionChips').innerHTML = '';
    renderVideoMotionSummary(options.videoMotion || null, motionMatch, { confirmed: motionConfirmsSongDance, conflict: motionConflicts });
    renderPrimaryDanceResult(primaryDance, { mode: 'exact', score: confidence, videoConfirmed: motionConfirmsSongDance });
    renderAdditionalMatches(otherDances, 'Weitere Tänze zu diesem Lied', 'Keine weiteren Tänze zugeordnet.', scoreMap);
    showView('result');
    if (addToHistory) addHistory({ type: 'song', songKey: song.songKey, title: song.title, artist: song.artist, confidence, bpm: Number.isFinite(tempo.bpm) ? Math.round(tempo.bpm) : null, tempoConfidence: tempo.confidence || 0, video: Boolean(options.videoMotion) });
  }

  function showCatalogSongResult(song, confidence, source, tempo = {}, addToHistory = true, options = {}) {
    if (Array.isArray(song?.danceIds) && song.danceIds.length) {
      showExactSongResult(song, confidence, source, tempo, addToHistory, options);
      return;
    }
    showAnalysisResult(tempo, addToHistory, `${source} · kein fest zugeordneter Tanz`, {
      ...options,
      recognizedSong: song,
    });
  }

  function showAnalysisResult(tempo, addToHistory = true, source = 'Tempo-basierte Analyse', options = {}) {
    const bpm = Number.isFinite(tempo.bpm) ? Math.round(tempo.bpm) : NaN;
    const possibleBpms = tempoValues(tempo);
    const candidates = suggestMotionCandidates(possibleBpms);
    $('#resultModeLabel').textContent = source;
    const recognizedSong = options.recognizedSong || null;
    $('#resultTitle').textContent = recognizedSong ? 'Lied erkannt – kein fest zugeordneter Tanz' : 'Kein eindeutiger Liedtreffer';
    $('#songResult').classList.toggle('hidden', !recognizedSong);
    if (recognizedSong) $('#songResult').innerHTML = songResultHtml(recognizedSong, recognizedSong.apiDataAvailable ? 'Lokal erkannt · API zugeordnet' : 'Lokal erkannt');
    $('#tempoResult').classList.remove('hidden');
    $('#bpmValue').textContent = Number.isFinite(bpm) ? bpm : '–';
    $('#alternateBpmRow').classList.toggle('hidden', possibleBpms.length < 2);
    $('#alternateBpmValue').textContent = possibleBpms.join(', ');
    $('#analysisSummary').textContent = recognizedSong
      ? (Number.isFinite(bpm)
        ? `Das Lied wurde lokal geprüft, steht aber nicht in den hinterlegten Tanzsheets. Deshalb werden ausschließlich BPM-Vorschläge für etwa ${bpm} BPM angezeigt.`
        : 'Das Lied wurde lokal geprüft, steht aber nicht in den hinterlegten Tanzsheets. Das Tempo konnte leider nicht zuverlässig bestimmt werden.')
      : Number.isFinite(bpm)
        ? `${source}${tempo.confidence ? ` · Messsicherheit ${Math.round(tempo.confidence * 100)} %` : ''}. Das Lied wurde nicht erkannt; die App vergleicht mehrere mögliche Tempi.`
        : 'Das Lied und das Tempo konnten nicht zuverlässig bestimmt werden. Versuche eine lautere Aufnahme oder nutze „Im Takt tippen“.';
    $('#motionChips').innerHTML = candidates.map((candidate) => `<span class="chip">${escapeHtml(candidate.motion)} · ${escapeHtml(candidate.rhythm)} · ${candidate.bpm} BPM</span>`).join('');
    renderVideoMotionSummary(options.videoMotion || null, options.motionMatch || null);
    const scored = state.dances
      .map((dance) => ({ dance, match: scoreDance(dance, possibleBpms, candidates) }))
      .filter((item) => item.match !== null)
      .sort((a, b) => b.match.score - a.match.score || a.match.distance - b.match.distance)
      .slice(0, 10);
    const scores = new Map(scored.map((item) => [item.dance.id, item.match.score]));
    const primaryDance = scored[0]?.dance || null;
    const primaryScore = primaryDance ? scores.get(primaryDance.id) : null;
    renderPrimaryDanceResult(primaryDance, { mode: 'tempo', score: primaryScore });
    renderAdditionalMatches(scored.slice(1).map((item) => item.dance), 'Weitere mögliche Tänze', 'Noch kein weiterer Tanzvorschlag.', scores);
    if (!primaryDance) {
      renderAdditionalMatches([], '', '', scores);
      $('#primaryDanceResult').classList.remove('hidden');
      $('#primaryDanceResult').innerHTML = '<div class="empty-state">Noch kein belastbarer Tanzvorschlag. Tippe das Tempo im Takt oder gib die BPM manuell ein.</div>';
    }
    showView('result');
    if (addToHistory) {
      if (recognizedSong?.songKey) addHistory({ type: 'song', songKey: recognizedSong.songKey, title: recognizedSong.title, artist: recognizedSong.artist || '', confidence: 100, bpm: Number.isFinite(bpm) ? bpm : null, tempoConfidence: tempo.confidence || 0 });
      else addHistory({ type: 'tempo', bpm: Number.isFinite(bpm) ? bpm : null, tempoConfidence: tempo.confidence || 0 });
    }
  }

  function persistMotionReferences() {
    writeJson(STORAGE.motionReferences, state.motionReferences);
  }

  function renderMotionReferenceCatalog() {
    const refs = Array.isArray(state.motionReferences) ? state.motionReferences : [];
    const count = refs.length;
    const uniqueDances = new Set(refs.map((reference) => reference.danceId)).size;
    const countBadge = $('#motionReferenceCount');
    if (!countBadge) return;
    countBadge.textContent = `${count} Referenz${count === 1 ? '' : 'en'} · ${STEP_PATTERNS.length} Sheet-Muster`;
    const status = $('#motionReferenceStatus');
    status.classList.toggle('warning', count === 0 && STEP_PATTERNS.length === 0);
    status.classList.toggle('good', count > 0 || STEP_PATTERNS.length > 0);
    $('#motionReferenceStatusTitle').textContent = count
      ? `${uniqueDances} Tanz${uniqueDances === 1 ? '' : 'e'} mit eigenen Referenzen vorbereitet`
      : STEP_PATTERNS.length
        ? `${STEP_PATTERNS.length} maschinenlesbare Sheet-Muster aktiv`
        : 'Noch keine Bewegungsreferenz';
    $('#motionReferenceStatusText').textContent = count
      ? `${count} lokale MediaPipe-Signatur${count === 1 ? '' : 'en'} gespeichert; zusätzlich sind ${STEP_PATTERNS.length} Sheet-Muster eingebaut.`
      : STEP_PATTERNS.length
        ? 'Grundlegende Schritte werden bereits mit den eingebauten Sheet-Mustern verglichen. Eigene Referenzvideos erhöhen die Genauigkeit.'
        : 'Füge für bekannte Tänze eigene kurze Demo-Videos hinzu. Alles bleibt lokal auf diesem Gerät.';
    const list = $('#motionReferenceList');
    if (!refs.length) {
      list.innerHTML = STEP_PATTERNS.length ? `<div class="empty-state">Noch keine eigene Video-Referenz vorhanden. ${STEP_PATTERNS.length} Sheet-Muster sind bereits aktiv.</div>` : '<div class="empty-state">Noch keine Video-Referenz vorhanden.</div>';
      return;
    }
    list.innerHTML = [...refs]
      .sort((left, right) => (left.danceTitle || '').localeCompare(right.danceTitle || '', 'de'))
      .map((reference) => {
        const signature = reference.signature || {};
        const quality = Math.round((signature.quality || 0) * 100);
        return `<div class="motion-reference-row" data-motion-reference-id="${escapeHtml(reference.id)}">
          <div><strong>${escapeHtml(reference.danceTitle || 'Unbekannter Tanz')}</strong><small>${escapeHtml(reference.fileName || 'Video-Referenz')} · ${Math.round(signature.duration || 0)} s · Qualität ${quality} %${signature.cadenceBpm ? ` · ca. ${signature.cadenceBpm} BPM Bewegung` : ''}</small></div>
          <div class="motion-reference-actions"><span class="motion-reference-score">${quality} %</span><button type="button" data-delete-motion-reference>Entfernen</button></div>
        </div>`;
      }).join('');
    $$('[data-delete-motion-reference]', list).forEach((button) => button.addEventListener('click', () => {
      const id = button.closest('[data-motion-reference-id]')?.dataset.motionReferenceId;
      if (!id || !confirm('Diese Bewegungsreferenz wirklich entfernen?')) return;
      state.motionReferences = state.motionReferences.filter((reference) => reference.id !== id);
      persistMotionReferences();
      renderMotionReferenceCatalog();
      toast('Bewegungsreferenz entfernt.');
    }));
  }

  function motionReferenceCandidates(fileName = '') {
    return state.dances.map((dance) => {
      const score = Math.max(
        tokenScore(fileName, dance.title),
        tokenScore(fileName, `${dance.title} ${dance.choreographer}`),
        tokenScore(fileName, musicText(dance)),
        ...(dance.recognitionAliases || []).map((alias) => tokenScore(fileName, alias)),
      );
      return { dance, score };
    }).sort((left, right) => right.score - left.score || left.dance.title.localeCompare(right.dance.title, 'de'));
  }

  function chooseDanceForMotionReference(fileName, candidates = []) {
    return new Promise((resolve) => {
      const dances = [...state.dances].sort((a, b) => a.title.localeCompare(b.title, 'de'));
      const suggested = candidates[0]?.dance?.id || dances[0]?.id || '';
      let settled = false;
      const finish = (value) => { if (settled) return; settled = true; closeDialog(); resolve(value); };
      openDialog(`
        <div class="dialog-hero"><p class="eyebrow">Bewegungsreferenz · Beta</p><h2>Welcher Tanz ist im Video?</h2><p>${escapeHtml(fileName)}</p></div>
        <p class="reference-picker-note">Bitte den Tanz bewusst zuordnen. Die App speichert nur eine verkleinerte Bewegungssignatur, nicht das Video.</p>
        <div class="song-picker">
          <input id="motionReferenceDanceSearch" type="search" placeholder="Tanz, Lied oder Choreograf …">
          <select id="motionReferenceDanceSelect" size="10">${dances.map((dance) => `<option value="${escapeHtml(dance.id)}" ${dance.id === suggested ? 'selected' : ''}>${escapeHtml(dance.title)} – ${escapeHtml(dance.choreographer)}</option>`).join('')}</select>
          <div class="dialog-actions"><button id="skipMotionReference" class="secondary-btn" type="button">Überspringen</button><button id="assignMotionReference" class="primary-btn" type="button">Zuordnen & analysieren</button></div>
        </div>`, { focusSelector: '#motionReferenceDanceSearch' });
      const select = $('#motionReferenceDanceSelect');
      $('#motionReferenceDanceSearch').addEventListener('input', (event) => {
        const query = normalize(event.target.value);
        [...select.options].forEach((option) => { option.hidden = Boolean(query) && !normalize(option.textContent).includes(query); });
      });
      $('#skipMotionReference').addEventListener('click', () => finish(null), { once: true });
      $('#assignMotionReference').addEventListener('click', () => finish(select.value), { once: true });
      $('#appDialog').addEventListener('close', () => { if (!settled) { settled = true; resolve(null); } }, { once: true });
    });
  }

  async function processMotionReferenceFiles(fileList) {
    if (!VM?.analyzeVideo) return toast('Die Videoanalyse ist in diesem Browser nicht verfügbar.', 4500);
    if (state.videoBusy) return toast('Es läuft bereits eine Videoanalyse.');
    const files = [...fileList].filter(isVideoFile);
    if (!files.length) return toast('Bitte eine unterstützte Videodatei auswählen.');
    state.videoBusy = true;
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const candidates = motionReferenceCandidates(file.name);
        let danceId = candidates[0]?.score >= 86 ? candidates[0].dance.id : null;
        if (!danceId) danceId = await chooseDanceForMotionReference(file.name, candidates);
        if (!danceId) { skipped += 1; continue; }
        const dance = state.dances.find((item) => item.id === danceId);
        if (!dance) { failed += 1; continue; }
        try {
          setTaskProgress(true, `Referenzvideo wird analysiert (${index + 1}/${files.length})`, `${dance.title} · ${file.name}`, 2);
          const signature = await VM.analyzeVideo(file, {
            onProgress: (percent, text) => setTaskProgress(true, `Referenzvideo wird analysiert (${index + 1}/${files.length})`, `${dance.title} · ${text}`, percent),
          });
          state.motionReferences.push({
            id: uniqueId('motion-ref'),
            danceId: dance.id,
            danceTitle: dance.title,
            fileName: file.name,
            createdAt: new Date().toISOString(),
            signature,
          });
          imported += 1;
          persistMotionReferences();
          renderMotionReferenceCatalog();
        } catch (error) {
          console.error(error);
          failed += 1;
          toast(`${dance.title}: ${error.message || 'Video konnte nicht analysiert werden.'}`, 4500);
        }
      }
    } finally {
      state.videoBusy = false;
      setTaskProgress(false);
    }
    toast(`${imported} Bewegungsreferenz${imported === 1 ? '' : 'en'} gespeichert${skipped ? ` · ${skipped} übersprungen` : ''}${failed ? ` · ${failed} fehlgeschlagen` : ''}.`, 4500);
  }

  function exportMotionReferences() {
    const payload = {
      format: 'CLDF-MOTION-REFERENCES',
      version: 1,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      references: state.motionReferences,
    };
    downloadBlob(new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'CLDF-Bewegungsreferenzen.json');
  }

  async function importMotionReferences(file) {
    const payload = JSON.parse(await file.text());
    if (payload?.format !== 'CLDF-MOTION-REFERENCES' || !Array.isArray(payload.references)) throw new Error('Ungültige CLDF-Bewegungsreferenzen.');
    const validIds = new Set(state.dances.map((dance) => dance.id));
    const imported = payload.references.filter((reference) => reference?.signature && validIds.has(reference.danceId));
    if (!imported.length) throw new Error('Keine passende Bewegungsreferenz für diese Tanzdatenbank gefunden.');
    const existing = new Map(state.motionReferences.map((reference) => [reference.id, reference]));
    for (const reference of imported) existing.set(reference.id || uniqueId('motion-ref'), { ...reference, id: reference.id || uniqueId('motion-ref') });
    state.motionReferences = [...existing.values()];
    persistMotionReferences();
    renderMotionReferenceCatalog();
    toast(`${imported.length} Bewegungsreferenz${imported.length === 1 ? '' : 'en'} importiert.`);
  }

  function clearMotionReferences() {
    if (!state.motionReferences.length) return toast('Der Bewegungsreferenz-Katalog ist bereits leer.');
    if (!confirm('Alle lokalen Bewegungsreferenzen löschen?')) return;
    state.motionReferences = [];
    persistMotionReferences();
    renderMotionReferenceCatalog();
    toast('Bewegungsreferenzen gelöscht.');
  }

  function setTaskProgress(visible, title = '', text = '', percent = 0) {
    const panel = $('#fingerprintProgress');
    if (!panel) return;
    panel.classList.toggle('hidden', !visible);
    if (!visible) return;
    $('#fingerprintProgressTitle').textContent = title;
    $('#fingerprintProgressText').textContent = text;
    $('#fingerprintProgressBar').style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  function isVideoFile(file) {
    const name = String(file?.name || '').toLowerCase();
    return String(file?.type || '').startsWith('video/') || /\.(mp4|webm|m4v|mov)$/.test(name);
  }

  async function decodeAudioFile(file) {
    const buffer = await file.arrayBuffer();
    const context = new (window.AudioContext || window.webkitAudioContext)();
    try {
      return await context.decodeAudioData(buffer.slice(0));
    } finally {
      await context.close().catch(() => {});
    }
  }

  async function extractAudioFromVideo(file, onProgress = () => {}) {
    if (!window.MediaRecorder) throw new Error('Video-Audioextraktion wird auf diesem Gerät nicht unterstützt.');
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = false;
    video.src = url;
    video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-5px;top:-5px';
    document.body.appendChild(video);
    const waitFor = (eventName) => new Promise((resolve, reject) => {
      const done = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error(`Videodatei konnte nicht gelesen werden (${eventName}).`)); };
      const cleanup = () => { video.removeEventListener(eventName, done); video.removeEventListener('error', fail); };
      video.addEventListener(eventName, done, { once: true });
      video.addEventListener('error', fail, { once: true });
    });
    let context;
    let timer;
    try {
      await waitFor('loadedmetadata');
      if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Videodauer konnte nicht bestimmt werden.');
      const excerpt = Math.min(75, video.duration);
      const start = Math.max(0, video.duration - excerpt);
      if (start > 0) { video.currentTime = start; await waitFor('seeked'); }
      context = new (window.AudioContext || window.webkitAudioContext)();
      await context.resume();
      const source = context.createMediaElementSource(video);
      const destination = context.createMediaStreamDestination();
      source.connect(destination);
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(destination.stream, preferred ? { mimeType: preferred } : undefined);
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const stopped = new Promise((resolve, reject) => {
        recorder.addEventListener('stop', resolve, { once: true });
        recorder.addEventListener('error', () => reject(new Error('Audio aus dem Video konnte nicht aufgenommen werden.')), { once: true });
      });
      recorder.start(250);
      const started = performance.now();
      timer = setInterval(() => onProgress(Math.min(100, ((performance.now() - started) / 1000 / excerpt) * 100)), 250);
      await video.play();
      await Promise.race([
        new Promise((resolve) => video.addEventListener('ended', resolve, { once: true })),
        new Promise((resolve) => setTimeout(resolve, (excerpt + 1.5) * 1000)),
      ]);
      video.pause();
      if (recorder.state !== 'inactive') recorder.stop();
      await stopped;
      if (!chunks.length) throw new Error('Im Video wurde keine auswertbare Audiospur gefunden.');
      const recorded = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const buffer = await recorded.arrayBuffer();
      onProgress(100);
      return await context.decodeAudioData(buffer.slice(0));
    } finally {
      if (timer) clearInterval(timer);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
      if (context) await context.close().catch(() => {});
    }
  }

  async function extractRecognitionClipBlob(file, maxSeconds = RECORD_SECONDS, onProgress = () => {}) {
    if (!window.MediaRecorder) throw new Error('Der Tonabschnitt kann in diesem Browser nicht für die Offline-Erkennung vorbereitet werden.');
    const url = URL.createObjectURL(file);
    const video = document.createElement(isVideoFile(file) ? 'video' : 'audio');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = false;
    video.src = url;
    video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-5px;top:-5px';
    document.body.appendChild(video);
    const waitFor = (eventName) => new Promise((resolve, reject) => {
      const done = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error('Die Audio- oder Videodatei konnte nicht gelesen werden.')); };
      const cleanup = () => { video.removeEventListener(eventName, done); video.removeEventListener('error', fail); };
      video.addEventListener(eventName, done, { once: true });
      video.addEventListener('error', fail, { once: true });
    });
    let context;
    let timer;
    try {
      await waitFor('loadedmetadata');
      if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Die Dauer der Audio- oder Videodatei konnte nicht bestimmt werden.');
      const excerpt = Math.min(maxSeconds, video.duration);
      const startAt = video.duration > maxSeconds * 2 ? Math.min(30, video.duration * .25) : 0;
      if (startAt > 0) { video.currentTime = startAt; await waitFor('seeked'); }
      context = new (window.AudioContext || window.webkitAudioContext)();
      await context.resume();
      const source = context.createMediaElementSource(video);
      const destination = context.createMediaStreamDestination();
      source.connect(destination);
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(destination.stream, preferred ? { mimeType: preferred } : undefined);
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const stopped = new Promise((resolve, reject) => {
        recorder.addEventListener('stop', resolve, { once: true });
        recorder.addEventListener('error', () => reject(new Error('Der Tonabschnitt konnte nicht aufgenommen werden.')), { once: true });
      });
      recorder.start(250);
      const started = performance.now();
      timer = setInterval(() => onProgress(Math.min(100, ((performance.now() - started) / 1000 / excerpt) * 100)), 200);
      await video.play();
      await Promise.race([
        new Promise((resolve) => video.addEventListener('ended', resolve, { once: true })),
        new Promise((resolve) => setTimeout(resolve, (excerpt + .2) * 1000)),
      ]);
      video.pause();
      if (recorder.state !== 'inactive') recorder.stop();
      await stopped;
      if (!chunks.length) throw new Error('Es wurde kein auswertbarer Tonabschnitt gefunden.');
      onProgress(100);
      return new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
    } finally {
      if (timer) clearInterval(timer);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
      if (context) await context.close().catch(() => {});
    }
  }

  async function decodeMediaFile(file, onProgress = () => {}) {
    try {
      return await decodeAudioFile(file);
    } catch (audioError) {
      if (!isVideoFile(file)) throw audioError;
      return extractAudioFromVideo(file, onProgress);
    }
  }

  function estimateTempo(audioBuffer) {
    const channels = audioBuffer.numberOfChannels;
    const originalRate = audioBuffer.sampleRate;
    const targetRate = 11025;
    const step = Math.max(1, Math.floor(originalRate / targetRate));
    const frameSize = 2048;
    const hop = 512;
    const monoLength = Math.floor(audioBuffer.length / step);
    const mono = new Float32Array(monoLength);
    for (let index = 0; index < monoLength; index += 1) {
      const sourceIndex = index * step;
      let sample = 0;
      for (let channel = 0; channel < channels; channel += 1) sample += audioBuffer.getChannelData(channel)[sourceIndex] || 0;
      mono[index] = sample / channels;
    }
    const envelope = [];
    let previousEnergy = 0;
    for (let start = 0; start + frameSize < mono.length; start += hop) {
      let energy = 0;
      for (let index = start; index < start + frameSize; index += 1) energy += mono[index] * mono[index];
      energy = Math.sqrt(energy / frameSize);
      envelope.push(Math.max(0, energy - previousEnergy));
      previousEnergy = energy;
    }
    if (envelope.length < 40) return { bpm: NaN, confidence: 0, possibleBpms: [] };
    const smooth = envelope.map((_, index) => {
      let sum = 0;
      let count = 0;
      for (let cursor = index - 4; cursor <= index + 4; cursor += 1) {
        if (cursor >= 0 && cursor < envelope.length) { sum += envelope[cursor]; count += 1; }
      }
      return sum / Math.max(1, count);
    });
    const max = Math.max(...smooth, 0.000001);
    const normalized = smooth.map((value) => value / max);
    const mean = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
    const centered = normalized.map((value) => value - mean);
    const envelopeRate = (originalRate / step) / hop;
    const minLag = Math.floor((envelopeRate * 60) / 190);
    const maxLag = Math.ceil((envelopeRate * 60) / 60);
    const candidates = [];
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let score = 0;
      let normA = 0;
      let normB = 0;
      for (let index = 0; index + lag < centered.length; index += 1) {
        const a = centered[index];
        const b = centered[index + lag];
        score += a * b;
        normA += a * a;
        normB += b * b;
      }
      score /= Math.sqrt((normA || 1) * (normB || 1));
      candidates.push({ bpm: (60 * envelopeRate) / lag, score });
    }
    candidates.sort((left, right) => right.score - left.score);
    const distinct = [];
    for (const candidate of candidates) {
      const rounded = Math.round(candidate.bpm);
      if (!distinct.some((item) => Math.abs(item.bpm - rounded) < 4)) distinct.push({ bpm: rounded, score: candidate.score });
      if (distinct.length >= 5) break;
    }
    const positive = distinct.filter((candidate) => candidate.score > 0);
    if (!positive.length) return { bpm: NaN, confidence: 0, possibleBpms: [] };
    const best = positive[0];
    const comparison = positive[Math.min(3, positive.length - 1)]?.score || 0;
    const confidence = Math.max(0, Math.min(1, (best.score - comparison) * 4 + best.score * .55));
    return {
      bpm: best.score > .06 ? best.bpm : NaN,
      confidence,
      possibleBpms: makePossibleBpms(positive.map((candidate) => candidate.bpm)),
    };
  }

  async function identifyAudioBlob(blob, options = {}) {
        let audio;
    let recognitionBlob = blob;
    let tempo = { bpm: NaN, confidence: 0, possibleBpms: [] };
    const mediaLabel = options.mediaLabel || (isVideoFile(blob) ? 'Videoton' : 'Audio');
    let recognitionWarning = null;
    try {
      setTaskProgress(true, `${mediaLabel} wird vorbereitet`, 'Die Aufnahme wird lokal für Tempo und Fingerprint analysiert.', 8);
      try {
        if (isVideoFile(blob) || blob?.name) {
          recognitionBlob = await extractRecognitionClipBlob(blob, RECORD_SECONDS, (percent) => setTaskProgress(true, `${mediaLabel} wird vorbereitet`, 'Ein kurzer Tonabschnitt wird lokal analysiert.', Math.min(38, percent * .38)));
          audio = await decodeAudioFile(recognitionBlob);
        } else {
          audio = await decodeAudioFile(blob);
        }
        tempo = estimateTempo(audio);
      } catch (error) {
        if (isVideoFile(blob)) throw error;
        console.warn('BPM- oder Ausschnittanalyse nicht möglich; die ausgewählte Audiodatei wird direkt erkannt.', error);
        recognitionBlob = blob;
      }

      setTaskProgress(true, 'Lied wird lokal geprüft', 'Audio-Fingerprint und Dateiname werden mit der lokalen Lieddatenbank verglichen.', 55);
      let recognition = null;
      try {
        recognition = await recognizeSongOffline(recognitionBlob);
      } catch (error) {
        recognitionWarning = error;
        console.warn('Lokale Liedprüfung fehlgeschlagen; BPM-Fallback bleibt verfügbar.', error);
      }
      setTaskProgress(true, 'Tanzdatenbank wird abgeglichen', 'Lied und Interpret werden mit den Tanzsheets verglichen.', 88);
      if (recognition) {
        const catalogMatch = matchOnlineSongToCatalog(recognition);
        if (catalogMatch) {
          return {
            song: catalogMatch.song,
            confidence: catalogMatch.score,
            source: catalogMatch.apiMatched ? `${recognition.source || 'Offline-Liederkennung'} · Song-API` : (recognition.source || 'Offline-Liederkennung'),
            tempo,
            recognizedSong: recognition,
            catalogMatch,
          };
        }
        const apiEntry = findSongApiEntry(recognition.title, recognition.artist || '');
        if (apiEntry) {
          recognition.apiDataAvailable = true;
          recognition.apiSongIds = apiEntry.apiSongIds || [];
          recognition.apiStations = (apiEntry.stations || []).map((station) => station.displayName || station.name).filter(Boolean);
          recognition.apiAlbums = apiEntry.albums || [];
          recognition.apiGenres = apiEntry.genres || [];
          recognition.apiReleaseYears = apiEntry.releaseYears || [];
        }
        return { song: null, confidence: 0, source: recognition.source || 'Offline-Liederkennung', tempo, recognizedSong: recognition };
      }
      return { song: null, confidence: 0, source: '', tempo, warning: recognitionWarning };
    } finally {
      if (!options.keepProgress) setTaskProgress(false);
    }
  }

  async function analyseBlob(blob) {
    updateOnlineStatus();
    toast('Audio wird lokal analysiert …');
    try {
      const result = await identifyAudioBlob(blob);
      if (result.song) {
        showCatalogSongResult(result.song, result.confidence, result.source, result.tempo);
        return;
      }
      const source = result.recognizedSong
        ? 'Lied erkannt, aber keinem Tanz zugeordnet'
        : result.warning
          ? 'Lokale Liedprüfung nicht verfügbar · BPM als Reserve'
          : 'Kein lokaler Liedtreffer · BPM als Reserve';
      showAnalysisResult(result.tempo, true, source, { recognizedSong: result.recognizedSong, onlineWarning: result.warning });
      if (result.warning) toast(result.warning.message || 'Lokale Liedprüfung nicht möglich.', 4500);
    } catch (error) {
      console.error(error);
      setTaskProgress(false);
      toast(`Audio konnte nicht analysiert werden: ${error.message || 'unbekannter Fehler'}`, 4500);
    }
  }

  function setVideoRecognitionStatus(mode, title, text) {
    const status = $('#videoRecognitionStatus');
    const copy = $('#videoRecognitionStatusText');
    if (!status || !copy) return;
    status.classList.remove('busy', 'good', 'error');
    if (mode) status.classList.add(mode);
    const heading = status.querySelector('strong');
    if (heading) heading.textContent = title;
    copy.textContent = text;
  }

  function videoMatchSourceLabel(match) {
    const type = match?.reference?.type;
    if (type === 'combined') return 'Referenzvideo + Sheet-Schritte';
    if (type === 'sheet-pattern') return 'Sheet-Schrittvergleich';
    return 'Bewegungsreferenz';
  }

  function showVideoDanceResult(dance, match, signature, tempo = {}, alternatives = [], addToHistory = true) {
    const bpm = Number.isFinite(tempo.bpm) ? Math.round(tempo.bpm) : NaN;
    const sourceLabel = videoMatchSourceLabel(match);
    $('#resultModeLabel').textContent = `${sourceLabel} · Beta`;
    $('#resultTitle').textContent = 'Wahrscheinlicher Tanz im Video';
    $('#songResult').classList.add('hidden');
    $('#tempoResult').classList.remove('hidden');
    $('#bpmValue').textContent = Number.isFinite(bpm) ? bpm : '–';
    const possibleBpms = tempoValues(tempo);
    $('#alternateBpmRow').classList.toggle('hidden', possibleBpms.length < 2);
    $('#alternateBpmValue').textContent = possibleBpms.join(', ');
    $('#analysisSummary').textContent = Number.isFinite(bpm)
      ? `Kein sicherer Liedtreffer. ${sourceLabel} ergibt den besten Beta-Treffer; gemessen wurden zusätzlich etwa ${bpm} BPM.`
      : `Kein sicherer Liedtreffer. ${sourceLabel} ergibt den besten Beta-Treffer. Die Anzeige ist ein Vorschlag und keine sichere Identifikation.`;
    $('#motionChips').innerHTML = (VM?.describeSignature?.(signature) || []).map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('');
    renderVideoMotionSummary(signature, match);
    renderPrimaryDanceResult(dance, { mode: 'video', score: match?.score });
    const otherMatches = alternatives
      .filter((item) => item.reference?.danceId !== dance.id && item.score >= 50)
      .slice(0, 5)
      .map((item) => ({ item, dance: state.dances.find((candidate) => candidate.id === item.reference.danceId) }))
      .filter((entry) => entry.dance);
    const scores = new Map(otherMatches.map((entry) => [entry.dance.id, entry.item.score]));
    renderAdditionalMatches(otherMatches.map((entry) => entry.dance), 'Weitere Video-Möglichkeiten', 'Kein weiterer Körper- oder Schritttreffer war ähnlich genug.', scores);
    showView('result');
    if (addToHistory) addHistory({ type: 'video', danceId: dance.id, title: dance.title, score: match?.score || 0, bpm: Number.isFinite(bpm) ? bpm : null, source: sourceLabel });
  }

  async function finishVideoRecognition(signature, audioResult, audioWarning = null, sourceLabel = 'Tanzvideo') {
    const referenceMatches = VM?.rankReferences ? VM.rankReferences(signature, state.motionReferences) : [];
    const sheetMatches = VM?.rankSheetPatterns ? VM.rankSheetPatterns(signature, STEP_PATTERNS, state.dances) : [];
    const matches = combineVideoMatches(referenceMatches, sheetMatches);
    const accepted = acceptedMotionMatch(matches);
    setTaskProgress(false);

    if (audioResult?.song?.danceIds?.length) {
      const bestForDisplay = accepted || matches[0] || null;
      showExactSongResult(
        audioResult.song,
        audioResult.confidence,
        `${sourceLabel}-Ton · ${audioResult.source}`,
        audioResult.tempo,
        true,
        { videoMotion: signature, motionMatch: bestForDisplay },
      );
      setVideoRecognitionStatus('good', 'Videoanalyse abgeschlossen', 'Das Lied wurde erkannt. Die feste Lied–Tanz-Zuordnung hatte Vorrang; Körper, Schritte und Sheet-Muster wurden zusätzlich geprüft.');
      return;
    }

    if (accepted) {
      const dance = state.dances.find((candidate) => candidate.id === accepted.reference.danceId);
      if (dance) {
        showVideoDanceResult(dance, accepted, signature, audioResult?.tempo || {}, matches);
        setVideoRecognitionStatus('good', 'Videoanalyse abgeschlossen', `${dance.title} wurde durch ${videoMatchSourceLabel(accepted)} als bester Beta-Treffer vorgeschlagen.`);
        return;
      }
    }

    showAnalysisResult(
      audioResult?.tempo || { bpm: NaN, confidence: 0, possibleBpms: [] },
      true,
      'Videoanalyse: kein eindeutiger Lied-, Körper- oder Schritttreffer',
      { videoMotion: signature, motionMatch: matches[0] || null, recognizedSong: audioResult?.song || audioResult?.recognizedSong },
    );
    setVideoRecognitionStatus('', 'Videoanalyse abgeschlossen', (state.motionReferences.length || STEP_PATTERNS.length)
      ? 'Kein eindeutiger Körper- oder Schritttreffer. Deshalb werden nur vorsichtige BPM-Vorschläge angezeigt.'
      : 'Noch keine Referenzen oder Sheet-Muster. Deshalb werden Videoton und BPM als Reserve verwendet.');
    if (audioWarning) toast(`${sourceLabel}-Ton nicht auswertbar: ${audioWarning.message || 'keine Audiospur'}. Körper und Schritte wurden trotzdem geprüft.`, 4500);
  }

  async function analyzeDanceVideo(file) {
    if (!file || !isVideoFile(file)) return toast('Bitte ein unterstütztes Tanzvideo auswählen.', 4500);
    if (!VM?.analyzeVideo) return toast('Die MediaPipe-Videoanalyse ist auf diesem Gerät nicht verfügbar.', 4500);
    if (state.videoBusy) return toast('Es läuft bereits eine Videoanalyse.');
    state.videoBusy = true;
    setVideoRecognitionStatus('busy', 'Video wird ausgewertet', 'Zuerst wird der Videoton lokal geprüft, danach verfolgt MediaPipe Körper und Schritte.');
    let audioResult = { song: null, confidence: 0, source: '', tempo: { bpm: NaN, confidence: 0, possibleBpms: [] } };
    let audioWarning = null;
    try {
      try {
        audioResult = await identifyAudioBlob(file, { mediaLabel: 'Videoton', keepProgress: true });
      } catch (error) {
        audioWarning = error;
        console.warn('Videoton konnte nicht ausgewertet werden.', error);
      }
      setTaskProgress(true, 'MediaPipe analysiert Körper und Schritte', 'Oberkörper und Füße müssen vollständig sichtbar sein.', 2);
      const signature = await VM.analyzeVideo(file, {
        onProgress: (percent, text) => setTaskProgress(true, 'MediaPipe analysiert Körper und Schritte', text, percent),
      });
      await finishVideoRecognition(signature, audioResult, audioWarning, 'Tanzvideo');
    } catch (error) {
      console.error(error);
      setTaskProgress(false);
      setVideoRecognitionStatus('error', 'Videoanalyse fehlgeschlagen', error.message || 'Das Video konnte nicht ausgewertet werden.');
      toast(`Video konnte nicht analysiert werden: ${error.message || 'unbekannter Fehler'}`, 5000);
    } finally {
      state.videoBusy = false;
    }
  }

  function preferredRecorderOptions() {
    if (!window.MediaRecorder) return null;
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const mimeType = types.find((type) => !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(type));
    return mimeType ? { mimeType } : {};
  }

  function drawVideoCoverToCanvas(context, video, targetWidth, targetHeight) {
    const sourceWidth = video.videoWidth || 0;
    const sourceHeight = video.videoHeight || 0;
    if (!sourceWidth || !sourceHeight) return false;
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = targetWidth / targetHeight;
    let sourceX = 0;
    let sourceY = 0;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    if (sourceRatio > targetRatio) {
      cropWidth = sourceHeight * targetRatio;
      sourceX = (sourceWidth - cropWidth) / 2;
    } else if (sourceRatio < targetRatio) {
      cropHeight = sourceWidth / targetRatio;
      sourceY = (sourceHeight - cropHeight) / 2;
    }
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
    return true;
  }

  function createPortraitRecordingPipeline(video, sourceStream) {
    if (!video || !sourceStream || typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    if (typeof canvas.captureStream !== 'function') return null;
    canvas.width = 540;
    canvas.height = 960;
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) return null;
    let frameId = 0;
    let stopped = false;
    const render = () => {
      if (stopped) return;
      drawVideoCoverToCanvas(context, video, canvas.width, canvas.height);
      frameId = requestAnimationFrame(render);
    };
    render();
    const outputStream = canvas.captureStream(24);
    const sourceAudio = sourceStream.getAudioTracks?.()[0];
    let clonedAudio = null;
    if (sourceAudio) {
      try {
        clonedAudio = sourceAudio.clone();
        outputStream.addTrack(clonedAudio);
      } catch (error) {
        console.warn('Ton konnte nicht in den Hochkant-Aufnahmestrom übernommen werden.', error);
      }
    }
    return {
      stream: outputStream,
      stop() {
        stopped = true;
        if (frameId) cancelAnimationFrame(frameId);
        outputStream.getVideoTracks().forEach((track) => track.stop());
        try { clonedAudio?.stop(); } catch {}
      },
    };
  }

  function liveCameraErrorMessage(error) {
    const name = error?.name || '';
    if (!window.isSecureContext) return 'Die Live-Kamera benötigt die HTTPS-Adresse der App. Bitte nicht über eine lokale Datei öffnen.';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'Der Kamerazugriff wurde nicht erlaubt. Öffne die Website-Einstellungen des Browsers und erlaube Kamera und Mikrofon.';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Auf diesem Gerät wurde keine verfügbare Kamera gefunden.';
    if (name === 'NotReadableError' || name === 'TrackStartError') return 'Die Kamera wird möglicherweise bereits von einer anderen App verwendet. Schließe andere Kamera-Apps und versuche es erneut.';
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') return 'Die gewünschte Kameraeinstellung wird nicht unterstützt. Die App versucht beim nächsten Start eine einfachere Einstellung.';
    return error?.message || 'Kamera oder MediaPipe konnten nicht gestartet werden.';
  }

  async function waitForLiveVideo(video, timeout = 12000) {
    if (video.readyState >= 2 && video.videoWidth > 0) return;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error('Die Kamera liefert noch kein Bild. Bitte Browser-Berechtigung prüfen und erneut starten.')); }, timeout);
      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener('loadeddata', ready);
        video.removeEventListener('playing', ready);
        video.removeEventListener('error', failed);
      };
      const ready = () => {
        if (video.videoWidth > 0 && video.readyState >= 2) { cleanup(); resolve(); }
      };
      const failed = () => { cleanup(); reject(new Error('Das Kamerabild konnte nicht geöffnet werden.')); };
      video.addEventListener('loadeddata', ready);
      video.addEventListener('playing', ready);
      video.addEventListener('error', failed, { once: true });
      ready();
    });
  }

  async function startLiveDanceRecognition() {
    if (state.videoBusy) return toast('Es läuft bereits eine Videoanalyse.');
    if (!window.isSecureContext) return toast('Die Live-Kamera funktioniert nur über die HTTPS-Adresse der App.', 5500);
    if (!navigator.mediaDevices?.getUserMedia) return toast('Die Live-Kamera wird von diesem Browser nicht unterstützt.', 5000);
    if (!VM?.analyzeLiveVideo || !VM?.ensurePose) return toast('Die MediaPipe-Dateien fehlen oder wurden nicht geladen. Bitte das Kamera-Fix-Paket vollständig hochladen.', 6500);
    state.videoBusy = true;
    const controller = new AbortController();
    state.liveVideoController = controller;
    let stream = null;
    let recorder = null;
    let recorderStopped = null;
    let portraitRecording = null;
    const chunks = [];
    const dialog = openDialog(`
      <div class="live-dance-panel">
        <p class="eyebrow">MediaPipe · Live-Beta</p>
        <h2>Live-Tanzerkennung</h2>
        <p>Stelle das Handy hochkant und ruhig auf. Die Person muss mit Oberkörper und Füßen vollständig sichtbar sein. Vorschau und Aufnahme werden im Hochformat 9:16 angepasst. Die App wertet die erkannten Schritte bereits während der Aufnahme aus. Die Aufnahme läuft mindestens 30 Sekunden und endet danach automatisch.</p>
        <div class="live-dance-preview">
          <video id="liveDanceVideo" autoplay playsinline muted></video>
          <canvas id="liveDanceCanvas" aria-hidden="true"></canvas>
        </div>
        <div class="progress-track"><span id="liveDanceProgressBar"></span></div>
        <strong id="liveDanceProgressText">Kamera wird gestartet …</strong>
        <div class="live-step-analysis" aria-live="polite">
          <div><span>Erkannte Schritte</span><strong id="liveDanceSteps">Noch keine sicheren Schrittmerkmale</strong></div>
          <div><span>Vorläufiger Tanzvergleich</span><strong id="liveDanceCandidates">Die Auswertung beginnt, sobald genug Körperbilder vorliegen.</strong></div>
        </div>
        <button id="cancelLiveDanceBtn" class="secondary-btn" type="button">Abbrechen</button>
      </div>`, { focusSelector: '#cancelLiveDanceBtn' });
    dialog.classList.add('live-camera-dialog');
    const video = $('#liveDanceVideo', dialog);
    const canvas = $('#liveDanceCanvas', dialog);
    const progressBar = $('#liveDanceProgressBar', dialog);
    const progressText = $('#liveDanceProgressText', dialog);
    const liveSteps = $('#liveDanceSteps', dialog);
    const liveCandidates = $('#liveDanceCandidates', dialog);
    const cleanup = () => {
      try { if (recorder?.state === 'recording') recorder.stop(); } catch {}
      try { portraitRecording?.stop(); } catch {}
      stream?.getTracks().forEach((track) => track.stop());
      state.liveVideoController = null;
      dialog.classList.remove('live-camera-dialog');
    };
    const abort = () => controller.abort();
    $('#cancelLiveDanceBtn', dialog)?.addEventListener('click', () => { abort(); closeDialog(); }, { once: true });
    dialog.addEventListener('close', abort, { once: true });
    try {
      const videoConstraints = {
        facingMode: { ideal: 'environment' },
        width: { ideal: 720, max: 1080 },
        height: { ideal: 1280, max: 1920 },
        aspectRatio: { ideal: 9 / 16 },
        resizeMode: { ideal: 'crop-and-scale' },
      };
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true });
      } catch (firstError) {
        console.warn('Kamera mit Ton konnte nicht geöffnet werden; erneuter Versuch ohne Ton.', firstError);
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
        toast('Die Kamera läuft ohne Ton. Die Körper- und Schritterkennung funktioniert trotzdem.', 4500);
      }
      video.srcObject = stream;
      await video.play();
      await waitForLiveVideo(video);
      if (progressText) progressText.textContent = 'MediaPipe wird geladen …';
      await VM.ensurePose();
      const recorderOptions = preferredRecorderOptions();
      if (recorderOptions) {
        try {
          portraitRecording = createPortraitRecordingPipeline(video, stream);
          const recordingStream = portraitRecording?.stream || stream;
          recorder = new MediaRecorder(recordingStream, recorderOptions);
          recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
          recorderStopped = new Promise((resolve) => { recorder.onstop = resolve; });
          recorder.start(500);
          if (!portraitRecording) console.warn('Dieser Browser unterstützt keine Canvas-Aufnahme; es wird der originale Kamerastrom aufgezeichnet.');
        } catch (recorderError) {
          try { portraitRecording?.stop(); } catch {}
          portraitRecording = null;
          console.warn('Live-Videoton kann auf diesem Gerät nicht aufgenommen werden; Körperanalyse läuft weiter.', recorderError);
          recorder = null;
          recorderStopped = null;
          toast('Die Kamera läuft. Der Videoton kann auf diesem Gerät nicht aufgezeichnet werden; die Schritterkennung funktioniert trotzdem.', 5000);
        }
      }
      setVideoRecognitionStatus('busy', 'Live-Video wird ausgewertet', 'MediaPipe verfolgt jetzt Körper und Schritte.');
      const signature = await VM.analyzeLiveVideo(video, {
        durationSeconds: 30,
        signal: controller.signal,
        partialIntervalMs: 2400,
        onFrame: (results) => VM.drawPose?.(canvas, video, results),
        onPartialSignature: (partialSignature) => {
          const stepLabels = partialSignature.stepTokens
            .slice(-7)
            .map((token) => VM.stepLabels?.[token] || token);
          if (liveSteps) liveSteps.textContent = stepLabels.length
            ? stepLabels.join(' · ')
            : 'Noch keine sicheren Schrittmerkmale';

          const referenceMatches = VM.rankReferences
            ? VM.rankReferences(partialSignature, state.motionReferences)
            : [];
          const sheetMatches = VM.rankSheetPatterns
            ? VM.rankSheetPatterns(partialSignature, STEP_PATTERNS, state.dances)
            : [];
          const provisionalMatches = combineVideoMatches(referenceMatches, sheetMatches).slice(0, 3);
          if (liveCandidates) {
            liveCandidates.innerHTML = provisionalMatches.length
              ? provisionalMatches.map((match) => {
                const dance = state.dances.find((candidate) => candidate.id === match.reference?.danceId);
                return dance ? `<span>${escapeHtml(dance.title)} · ${Math.round(match.score)} %</span>` : '';
              }).filter(Boolean).join('')
              : 'Noch kein passender Tanzvergleich möglich.';
          }
        },
        onProgress: (percent, text) => {
          if (progressBar) progressBar.style.width = `${Math.round(percent)}%`;
          if (progressText) progressText.textContent = `${text} · Schritte werden live verglichen`;
        },
      });
      if (recorder?.state === 'recording') recorder.stop();
      if (recorderStopped) await recorderStopped;
      const recordedBlob = chunks.length ? new Blob(chunks, { type: recorder?.mimeType || 'video/webm' }) : null;
      cleanup();
      closeDialog();
      let audioResult = { song: null, confidence: 0, source: '', tempo: { bpm: NaN, confidence: 0, possibleBpms: [] } };
      let audioWarning = null;
      if (recordedBlob?.size > 1200) {
        try {
          audioResult = await identifyAudioBlob(recordedBlob, { mediaLabel: 'Live-Videoton', keepProgress: true });
        } catch (error) {
          audioWarning = error;
        }
      }
      await finishVideoRecognition(signature, audioResult, audioWarning, 'Live-Kamera');
    } catch (error) {
      cleanup();
      if (dialog.open) closeDialog();
      if (error?.name !== 'AbortError') {
        console.error(error);
        const message = liveCameraErrorMessage(error);
        setVideoRecognitionStatus('error', 'Live-Analyse fehlgeschlagen', message);
        toast(`Live-Analyse fehlgeschlagen: ${message}`, 6500);
      } else {
        setVideoRecognitionStatus('', 'Live-Analyse abgebrochen', 'Du kannst die Kamera jederzeit erneut starten.');
      }
    } finally {
      state.videoBusy = false;
      state.liveVideoController = null;
    }
  }

  function calculateTappedTempo() {
    if (state.tapTimes.length < 4) return null;
    const intervals = [];
    for (let index = 1; index < state.tapTimes.length; index += 1) intervals.push(state.tapTimes[index] - state.tapTimes[index - 1]);
    const recent = intervals.slice(-10);
    const sorted = [...recent].sort((a, b) => a - b);
    const trimmed = sorted.length >= 6 ? sorted.slice(1, -1) : sorted;
    const average = trimmed.reduce((sum, value) => sum + value, 0) / Math.max(1, trimmed.length);
    let bpm = Math.round(60000 / average);
    if (bpm < 55) bpm *= 2;
    if (bpm > 220) bpm = Math.round(bpm / 2);
    return bpm >= 40 && bpm <= 220 ? bpm : null;
  }

  function updateTapTempoUi() {
    const count = state.tapTimes.length;
    const bpm = calculateTappedTempo();
    state.tapBpm = bpm;
    state.tapPossibleBpms = bpm ? makePossibleBpms([bpm]) : [];
    $('#showTapTempoBtn').disabled = !bpm;
    if (!count) $('#tapTempoStatus').textContent = 'Noch nicht getippt.';
    else if (!bpm) $('#tapTempoStatus').textContent = `${count} Tipps · bitte weiter gleichmäßig im Takt tippen.`;
    else $('#tapTempoStatus').textContent = `${count} Tipps · ungefähr ${bpm} BPM · für mehr Genauigkeit weiter tippen.`;
  }

  function handleTapTempo() {
    const now = Date.now();
    if (state.tapTimes.length && now - state.tapTimes.at(-1) > 3000) state.tapTimes = [];
    state.tapTimes.push(now);
    if (state.tapTimes.length > 12) state.tapTimes.shift();
    updateTapTempoUi();
  }

  function resetTapTempo() {
    state.tapTimes = [];
    state.tapBpm = null;
    state.tapPossibleBpms = [];
    updateTapTempoUi();
  }

  function showTappedTempoResults() {
    if (!Number.isFinite(state.tapBpm)) return toast('Bitte mindestens viermal gleichmäßig im Takt tippen.');
    showAnalysisResult({ bpm: state.tapBpm, possibleBpms: state.tapPossibleBpms, confidence: Math.min(.95, .45 + state.tapTimes.length * .05) }, true, 'BPM im Takt getippt');
  }

  function showManualTempoResults() {
    const bpm = Math.round(Number($('#manualBpmInput').value));
    if (!Number.isFinite(bpm) || bpm < 40 || bpm > 220) return toast('Bitte BPM zwischen 40 und 220 eingeben.');
    showAnalysisResult({ bpm, possibleBpms: makePossibleBpms([bpm]), confidence: 1 }, true, 'BPM manuell eingegeben');
  }

  function startRecognitionFlow() {
    updateOnlineStatus();
    requestRecordingStart();
  }

  function supportsLiveMicrophone() {
    return Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  }

  function microphonePlatformHelp() {
    const agent = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(agent)) {
      return 'iPhone/iPad: Einstellungen → Safari → Mikrofon → Erlauben. Danach die CLDF-Webseite neu laden.';
    }
    if (/Android/i.test(agent)) {
      return 'Android: Browser-Menü → Website-Einstellungen → Mikrofon → Zulassen. Falls nötig zusätzlich Android-Einstellungen → Apps → Browser → Berechtigungen → Mikrofon.';
    }
    return 'Browser-Einstellungen → Website-Berechtigungen → Mikrofon → Zulassen.';
  }

  function renderMicrophoneStatus(permission = state.microphonePermission) {
    const card = $('#microphoneStatusCard');
    const title = $('#microphoneStatusTitle');
    const text = $('#microphoneStatusText');
    const button = $('#enableMicrophoneBtn');
    if (!card || !title || !text || !button) return;
    card.classList.remove('good', 'warning', 'error', 'checking');

    if (!supportsLiveMicrophone()) {
      card.classList.add('warning');
      title.textContent = location.protocol === 'file:' ? 'Live-Mikrofon in dieser Datei blockiert' : 'Live-Mikrofon nicht unterstützt';
      text.textContent = 'Nutze „Handyaufnahme verwenden“ oder öffne die App über HTTPS beziehungsweise localhost.';
      button.textContent = 'Hilfe anzeigen';
      button.classList.remove('hidden');
      return;
    }

    if (permission === 'granted') {
      card.classList.add('good');
      title.textContent = 'Mikrofon bereit';
      text.textContent = 'Ein Tipp auf „Lied aufnehmen“ startet sofort die 12-Sekunden-Aufnahme.';
      button.classList.add('hidden');
      return;
    }
    if (permission === 'denied') {
      card.classList.add('error');
      title.textContent = 'Mikrofon blockiert';
      text.textContent = 'Die Berechtigung muss einmal in den Handy- oder Browser-Einstellungen freigegeben werden.';
      button.textContent = 'So geht es';
      button.classList.remove('hidden');
      return;
    }

    card.classList.add(permission === 'prompt' ? 'warning' : 'checking');
    title.textContent = permission === 'prompt' ? 'Mikrofon noch nicht freigegeben' : 'Mikrofonstatus wird geprüft';
    text.textContent = permission === 'prompt' ? 'Einmal freigeben, danach startet die Aufnahme direkt.' : 'Du kannst die Freigabe jetzt mit einem Tipp testen.';
    button.textContent = 'Mikrofon freigeben';
    button.classList.remove('hidden');
  }

  async function refreshMicrophoneStatus() {
    if (!supportsLiveMicrophone()) {
      state.microphonePermission = 'unsupported';
      renderMicrophoneStatus('unsupported');
      return 'unsupported';
    }
    let permission = state.microphonePermission === 'granted' ? 'granted' : 'prompt';
    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' });
        permission = status.state || permission;
        if (state.microphonePermissionStatus !== status) {
          state.microphonePermissionStatus = status;
          status.onchange = () => {
            state.microphonePermission = status.state;
            renderMicrophoneStatus(status.state);
          };
        }
      } catch {
        // Safari und einige WebViews unterstützen die Mikrofonabfrage hier nicht.
      }
    }
    state.microphonePermission = permission;
    renderMicrophoneStatus(permission);
    return permission;
  }

  async function getCompatibleAudioStream() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const track = stream.getAudioTracks?.()[0];
    if (track?.applyConstraints) {
      try {
        await track.applyConstraints({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });
      } catch {
        // Die Aufnahme funktioniert auch, wenn einzelne Musik-Optimierungen nicht unterstützt werden.
      }
    }
    return stream;
  }

  async function enableMicrophoneAccess() {
    if (!supportsLiveMicrophone()) {
      showMicrophoneHelp('unsupported');
      return false;
    }
    try {
      const stream = await getCompatibleAudioStream();
      stream.getTracks().forEach((track) => track.stop());
      state.microphonePermission = 'granted';
      renderMicrophoneStatus('granted');
      toast('Mikrofon ist freigegeben und bereit.');
      return true;
    } catch (error) {
      console.error(error);
      state.microphonePermission = error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'denied' : 'prompt';
      renderMicrophoneStatus(state.microphonePermission);
      showMicrophoneHelp(error?.name || 'error');
      return false;
    }
  }

  async function requestRecordingStart() {
    if (state.mediaRecorder?.state === 'recording') {
      stopRecording();
      return;
    }
    if (!supportsLiveMicrophone()) {
      updateSecurityNotice();
      renderMicrophoneStatus('unsupported');
      showMicrophoneHelp('unsupported');
      return;
    }
    try {
      const stream = await getCompatibleAudioStream();
      state.mediaStream = stream;
      const typeList = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
      const preferred = typeof MediaRecorder.isTypeSupported === 'function'
        ? typeList.find((type) => MediaRecorder.isTypeSupported(type))
        : '';
      let recorder;
      try {
        recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      state.mediaRecorder = recorder;
      state.mediaChunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) state.mediaChunks.push(event.data); };
      recorder.onerror = (event) => {
        console.error('MediaRecorder-Fehler', event.error || event);
        toast('Die Aufnahme wurde unterbrochen. Nutze alternativ „Handyaufnahme verwenden“.', 4500);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        state.mediaStream = null;
        const blob = new Blob(state.mediaChunks, { type: recorder.mimeType || preferred || 'audio/webm' });
        stopRecordingUi();
        if (!blob.size) {
          toast('Die Aufnahme war leer. Bitte erneut versuchen oder „Handyaufnahme verwenden“ nutzen.', 4500);
          return;
        }
        await analyseBlob(blob);
      };
      recorder.start(250);
      state.recordingStarted = Date.now();
      state.microphonePermission = 'granted';
      renderMicrophoneStatus('granted');
      startRecordingUi();
    } catch (error) {
      console.error(error);
      if (state.mediaStream) state.mediaStream.getTracks().forEach((track) => track.stop());
      state.mediaStream = null;
      if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
        state.microphonePermission = 'denied';
        renderMicrophoneStatus('denied');
        showMicrophoneHelp(error.name);
      } else if (error?.name === 'NotFoundError') {
        toast('Auf diesem Gerät wurde kein Mikrofon gefunden. Nutze „Handyaufnahme verwenden“.', 4500);
        showMicrophoneHelp(error.name);
      } else {
        toast('Das Mikrofon konnte nicht gestartet werden. Nutze alternativ „Handyaufnahme verwenden“.', 4500);
        showMicrophoneHelp(error?.name || 'error');
      }
    }
  }

  function startRecordingUi() {
    $('#recordBtn').classList.add('recording');
    $('#recordBtn').setAttribute('aria-pressed', 'true');
    $('#recordLabel').textContent = 'Aufnahme läuft';
    $('#recordHint').textContent = 'Tippen zum Stoppen';
    $('#recordProgress').classList.remove('hidden');
    state.recordingTimer = setInterval(() => {
      const elapsed = (Date.now() - state.recordingStarted) / 1000;
      const percent = Math.min(100, (elapsed / RECORD_SECONDS) * 100);
      $('#progressBar').style.width = `${percent}%`;
      $('#progressText').textContent = `${Math.min(RECORD_SECONDS, Math.floor(elapsed))} / ${RECORD_SECONDS} Sekunden`;
      if (elapsed >= RECORD_SECONDS) stopRecording();
    }, 150);
  }

  function stopRecordingUi() {
    clearInterval(state.recordingTimer);
    state.recordingTimer = null;
    $('#recordBtn').classList.remove('recording');
    $('#recordBtn').setAttribute('aria-pressed', 'false');
    $('#recordLabel').textContent = 'Lied aufnehmen';
    $('#recordHint').textContent = 'Tippen zum Starten';
    $('#progressBar').style.width = '0%';
    $('#recordProgress').classList.add('hidden');
  }

  function stopRecording() {
    if (state.mediaRecorder?.state === 'recording') state.mediaRecorder.stop();
  }

  function showMicrophoneHelp(reason = '') {
    const blocked = state.microphonePermission === 'denied' || reason === 'NotAllowedError' || reason === 'SecurityError';
    const unsupported = !supportsLiveMicrophone() || reason === 'unsupported';
    const headline = blocked ? 'Mikrofon ist blockiert' : unsupported ? 'Live-Mikrofon hier nicht verfügbar' : 'Mikrofonzugriff benötigt';
    const intro = blocked
      ? 'Die App darf das Mikrofon momentan nicht verwenden. Ändere die Berechtigung einmal in den Einstellungen.'
      : unsupported
        ? 'Diese Browser-Ansicht kann keine direkte Live-Aufnahme starten. Die Handyaufnahme funktioniert trotzdem als Ausweichweg.'
        : 'Erlaube den Zugriff einmal. Danach startet die Musikerkennung direkt über die große Aufnahmetaste.';
    openDialog(`
      <div class="onboarding">
        <div class="onboarding-icon">🎙</div>
        <h2>${escapeHtml(headline)}</h2>
        <p>${escapeHtml(intro)}</p>
        <div class="onboarding-steps">
          <div class="onboarding-step"><span>1</span><div><strong>Berechtigung prüfen</strong><br>${escapeHtml(microphonePlatformHelp())}</div></div>
          <div class="onboarding-step"><span>2</span><div><strong>Zur App zurückkehren</strong><br>Dann erneut „Mikrofon freigeben“ oder „Lied aufnehmen“ tippen.</div></div>
          <div class="onboarding-step"><span>3</span><div><strong>Sofortige Alternative</strong><br>„Handyaufnahme verwenden“ öffnet die Aufnahmefunktion des Handys beziehungsweise die Dateiauswahl.</div></div>
        </div>
        <div class="dialog-actions">
          ${!unsupported ? '<button id="retryMicrophoneBtn" class="primary-btn" type="button">Mikrofon erneut freigeben</button>' : ''}
          <button id="fallbackRecordingBtn" class="secondary-btn" type="button">Handyaufnahme verwenden</button>
          ${location.protocol === 'file:' ? '<button id="microphoneInstallHelpBtn" class="text-button" type="button">Installationshilfe</button>' : ''}
        </div>
      </div>`, { focusSelector: unsupported ? '#fallbackRecordingBtn' : '#retryMicrophoneBtn' });
    $('#retryMicrophoneBtn')?.addEventListener('click', async () => { closeDialog(); await enableMicrophoneAccess(); }, { once: true });
    $('#fallbackRecordingBtn')?.addEventListener('click', () => { closeDialog(); $('#captureAudioFile').click(); }, { once: true });
    $('#microphoneInstallHelpBtn')?.addEventListener('click', () => { closeDialog(); showInstallHelp(); }, { once: true });
  }

  function updateSecurityNotice() {
    const notice = $('#securityNotice');
    const text = $('#securityNoticeText');
    if (supportsLiveMicrophone()) {
      notice.classList.add('hidden');
      return;
    }
    notice.classList.remove('hidden');
    if (location.protocol === 'file:') text.textContent = 'Du hast die HTML-Datei direkt geöffnet. Starte die App über STARTEN-AM-PC.bat oder eine HTTPS-Adresse, damit das Mikrofon freigegeben werden kann.';
    else if (!window.isSecureContext) text.textContent = 'Die Seite wurde nicht über eine sichere Verbindung geöffnet. Bitte eine HTTPS-Adresse oder localhost verwenden.';
    else text.textContent = 'Dieser Browser unterstützt die benötigte Mikrofonaufnahme nicht vollständig.';
  }

  async function exportFullBackup() {
    const payload = {
      format: 'CLDF-FULL-BACKUP',
      version: 2,
      appVersion: APP_VERSION,
      databaseVersion: DATABASE_VERSION,
      exportedAt: new Date().toISOString(),
      overrides: state.overrides,
      customDances: state.customDances,
      favorites: [...state.favorites],
      practice: [...state.practice],
      history: state.history,
      settings: state.settings,
      motionReferences: state.motionReferences,
    };
    downloadBlob(new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'CLDF-Komplett-Backup.json');
  }

  async function importFullBackup(file) {
    const payload = JSON.parse(await file.text());
    if (payload?.format !== 'CLDF-FULL-BACKUP') throw new Error('Ungültiges CLDF-Backup.');
    if (!confirm('Das Backup ersetzt eigene Änderungen, Listen und Bewegungsreferenzen. Fortfahren?')) return;
    state.overrides = payload.overrides && typeof payload.overrides === 'object' ? payload.overrides : {};
    state.customDances = Array.isArray(payload.customDances) ? payload.customDances : [];
    state.favorites = new Set(Array.isArray(payload.favorites) ? payload.favorites : []);
    state.practice = new Set(Array.isArray(payload.practice) ? payload.practice : []);
    state.history = Array.isArray(payload.history) ? payload.history : [];
    state.settings = { ...state.settings, ...(payload.settings || {}) };
    state.motionReferences = Array.isArray(payload.motionReferences) ? payload.motionReferences : [];
    persistDanceChanges();
    persistPersonalLists();
    writeJson(STORAGE.history, state.history);
    writeJson(STORAGE.settings, state.settings);
    persistMotionReferences();
    rebuildDanceState();
    renderAll();
    toast('Backup vollständig eingespielt.');
  }

  function resetOwnData() {
    if (!confirm('Eigene Tanzänderungen, neue Tänze, Favoriten, Übungsliste und Verlauf zurücksetzen?')) return;
    state.overrides = {};
    state.customDances = [];
    state.favorites.clear();
    state.practice.clear();
    state.history = [];
    storage.remove(STORAGE.overrides);
    storage.remove(STORAGE.customDances);
    storage.remove(STORAGE.favorites);
    storage.remove(STORAGE.practice);
    storage.remove(STORAGE.history);
    rebuildDanceState();
    renderAll();
    toast('Eigene App-Daten zurückgesetzt.');
  }

  async function deleteAllLocalUserData() {
    const confirmed = confirm('Wirklich alle lokal gespeicherten CLDF-Nutzerdaten löschen? Dazu gehören Favoriten, Verlauf, eigene Tänze, Einstellungen, Audio-Fingerprints, Katalogimporte und Bewegungsreferenzen. Diese Aktion kann nicht rückgängig gemacht werden.');
    if (!confirmed) return;
    try {
      state.mediaStream?.getTracks?.().forEach((track) => track.stop());
      state.liveVideoController?.abort?.();
      Object.values(STORAGE).forEach((key) => storage.remove(key));
      if (STORE?.clearAllData) await STORE.clearAllData();
      else {
        if (STORE?.clearFingerprints) await STORE.clearFingerprints();
        if (STORE?.deleteCatalog) await STORE.deleteCatalog('getinline');
      }
      toast('Alle lokalen Nutzerdaten wurden gelöscht. Die App wird neu geladen.', 4500);
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      console.error(error);
      toast(`Lokale Daten konnten nicht vollständig gelöscht werden: ${error.message || 'Unbekannter Fehler'}`, 6500);
    }
  }

  function renderDiagnostics(items) {
    $('#diagnosticsList').innerHTML = items.map((item) => `<div class="diagnostic-item ${escapeHtml(item.level || '')}"><span class="diagnostic-mark">${item.level === 'error' ? '×' : item.level === 'warn' ? '!' : '✓'}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.text)}</small></div></div>`).join('');
  }

  async function runDiagnostics() {
    const items = [];
    updateOnlineStatus();
    items.push({ title: 'Offline-Daten', text: `Bereit – ${state.dances.length} Tänze, ${GETINLINE_DANCES.length} Get-in-Line-Einträge und lokale Liedzuordnungen geladen.`, level: '' });
    items.push({ title: 'Sichere Umgebung', text: window.isSecureContext ? 'Ja – Mikrofonfreigabe ist möglich.' : 'Nein – für das Mikrofon ist HTTPS oder localhost erforderlich.', level: window.isSecureContext ? '' : 'error' });
    const serviceReady = await checkOnlineService(false);
    items.push({ title: 'Offline-Liederkennung', text: state.onlineServiceMessage, level: serviceReady ? '' : 'error' });
    items.push({ title: 'Audio-Referenzen', text: allFingerprintEntries().length ? `${allFingerprintEntries().length} lokale akustische Referenzen bereit.` : 'Noch keine eigene Musikbibliothek eingelesen; BPM/Motion-Fallback bleibt verfügbar.', level: allFingerprintEntries().length ? '' : 'warn' });
    items.push({ title: 'Get-in-Line-Katalog', text: GETINLINE_DANCES.length ? `${GETINLINE_DANCES.length} Metadatensätze mit Tanzsheet-Links geladen.` : 'Noch leer; Aktualisierer oder Katalogimport verwenden.', level: GETINLINE_DANCES.length ? '' : 'warn' });
    const micPermission = await refreshMicrophoneStatus();
    items.push({ title: 'Mikrofon', text: supportsLiveMicrophone() ? `Live-Aufnahme unterstützt · Berechtigung: ${micPermission === 'granted' ? 'erlaubt' : micPermission === 'denied' ? 'blockiert' : 'noch nicht erteilt'}.` : 'Live-Aufnahme nicht verfügbar; Dateiauswahl bleibt nutzbar.', level: micPermission === 'denied' ? 'error' : supportsLiveMicrophone() ? '' : 'warn' });
    items.push({ title: 'Video-Tanzerkennung', text: VM?.analyzeVideo ? `MediaPipe aktiv · ${state.motionReferences.length} eigene Referenzen · ${STEP_PATTERNS.length} Sheet-Muster.` : 'MediaPipe-Videoanalyse wird von diesem Browser nicht unterstützt.', level: VM?.analyzeVideo ? '' : 'warn' });
    renderDiagnostics(items);
    return items;
  }

  function showOnboarding() {
    openDialog(`
      <div class="onboarding">
        <div class="onboarding-icon">✓</div>
        <p class="eyebrow">CLDF Offline-Einrichtung</p>
        <h2>Vier kurze Schritte</h2>
        <div class="onboarding-steps">
          <div class="onboarding-step"><span>1</span><div><strong>Offline-Daten</strong><br>Tänze, Liedzuordnungen, BPM-, Motion- und Rhythmusregeln sind lokal gespeichert.</div></div>
          <div class="onboarding-step"><span>2</span><div><strong>Eigene Musik einmal einlesen</strong><br>Unter „Mehr → Eigene Musikbibliothek“ werden nur akustische Fingerprints gespeichert, keine Musikdateien.</div></div>
          <div class="onboarding-step"><span>3</span><div><strong>Mikrofon erlauben</strong><br>Die offizielle Handy- oder Browserabfrage erscheint einmal nach deinem Tipp.</div></div>
          <div class="onboarding-step"><span>4</span><div><strong>Lied aufnehmen</strong><br>Die App erkennt eingelesene Aufnahmen offline; ohne sicheren Titel werden BPM, Motion und Rhythmus verwendet.</div></div>
        </div>
        <div class="dialog-actions">
          <button id="onboardingMicBtn" class="primary-btn" type="button">Mikrofon testen</button>
          <button id="onboardingServiceBtn" class="secondary-btn" type="button">Offline-Status prüfen</button>
          <button id="onboardingDoneBtn" class="secondary-btn" type="button">Fertig</button>
        </div>
      </div>`);
    $('#onboardingMicBtn').addEventListener('click', async () => { closeDialog(); await enableMicrophoneAccess(); });
    $('#onboardingServiceBtn').addEventListener('click', async () => { await checkOnlineService(true); });
    $('#onboardingDoneBtn').addEventListener('click', () => { storage.set(STORAGE.onboardingSeen, '1'); closeDialog(); });
  }

  function handleInitialRoute() {
    const route = location.hash.replace('#', '');
    if (route === 'video') {
      showView('home', { keepScroll: true });
      setTimeout(() => $('#videoRecognitionTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      return;
    }
    if (['search', 'favorites', 'practice', 'more'].includes(route)) showView(route, { keepScroll: true });
  }

  function updateViewportMetrics() {
    const viewport = window.visualViewport;
    const bottomOffset = viewport
      ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
      : 0;
    document.documentElement.style.setProperty('--viewport-bottom-offset', `${bottomOffset}px`);

    const navigation = $('.bottom-nav');
    if (navigation) {
      const height = Math.max(76, Math.ceil(navigation.getBoundingClientRect().height));
      document.documentElement.style.setProperty('--actual-nav-height', `${height}px`);
    }
  }

  function bindEvents() {
    $('#enterApp').addEventListener('click', () => {
      $('#splash').style.opacity = '0';
      setTimeout(() => {
        $('#splash').classList.add('hidden');
        $('#app').classList.remove('hidden');
        document.body.classList.add('app-open');
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        updateViewportMetrics();
        if (!storage.get(STORAGE.onboardingSeen)) showOnboarding();
      }, 350);
    });
    $('#brandHome').addEventListener('click', () => showView('home'));
    $$('.bottom-nav button').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
    $$('[data-open-view]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.openView, { focus: button.dataset.focus ? `#${button.dataset.focus}` : null })));
    $('#recordBtn').addEventListener('click', startRecognitionFlow);
    $('#audioFile').addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (file) await analyseBlob(file); event.target.value = ''; });
    $('#captureAudioFile').addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (file) await analyseBlob(file); event.target.value = ''; });
    $('#captureDanceVideo').addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (file) await analyzeDanceVideo(file); event.target.value = ''; });
    $('#danceVideoFile').addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (file) await analyzeDanceVideo(file); event.target.value = ''; });
    $('#liveDanceVideoBtn')?.addEventListener('click', startLiveDanceRecognition);
    $('#enableMicrophoneBtn').addEventListener('click', async () => {
      if (!supportsLiveMicrophone() || state.microphonePermission === 'denied') showMicrophoneHelp(state.microphonePermission);
      else await enableMicrophoneAccess();
    });
    $('#manualSongBtn').addEventListener('click', openManualSongPicker);
    $('#tapTempoBtn').addEventListener('click', handleTapTempo);
    $('#showTapTempoBtn').addEventListener('click', showTappedTempoResults);
    $('#resetTapTempoBtn').addEventListener('click', resetTapTempo);
    $('#manualBpmBtn').addEventListener('click', showManualTempoResults);
    $('#manualBpmInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') showManualTempoResults(); });
    $('#showInstallHelpBtn')?.addEventListener('click', () => showInstallHelp());

    const searchEvents = ['searchInput', 'sourceFilter', 'levelFilter', 'motionFilter', 'rhythmFilter', 'qualityFilter', 'sortFilter'];
    searchEvents.forEach((id) => $(`#${id}`).addEventListener(id === 'searchInput' ? 'input' : 'change', () => renderSearch(true)));
    $('#resetFiltersBtn').addEventListener('click', () => {
      $('#searchInput').value = '';
      $('#sourceFilter').value = '';
      $('#levelFilter').value = '';
      $('#motionFilter').value = '';
      $('#rhythmFilter').value = '';
      $('#qualityFilter').value = '';
      $('#sortFilter').value = 'title';
      renderSearch(true);
    });
    $('#loadMoreBtn').addEventListener('click', () => { state.searchLimit += PAGE_SIZE; renderSearch(false); });

    $('#clearHistoryBtn').addEventListener('click', () => { if (!confirm('Erkennungsverlauf löschen?')) return; state.history = []; writeJson(STORAGE.history, []); renderHistory(); });
    $('#openOnboardingBtn').addEventListener('click', showOnboarding);
    $('#checkOnlineServiceBtn')?.addEventListener('click', () => checkOnlineService(true));
    $('#checkOnlineServiceBtnSettings')?.addEventListener('click', () => checkOnlineService(true));
    $('#audioFingerprintFiles')?.addEventListener('change', async (event) => { if (event.target.files?.length) await processAudioFingerprintFiles(event.target.files); event.target.value = ''; });
    $('#exportFingerprintsBtn')?.addEventListener('click', () => exportAudioFingerprints().catch((error) => toast(error.message, 4500)));
    $('#importFingerprintsBtn')?.addEventListener('click', () => $('#importFingerprintsFile')?.click());
    $('#importFingerprintsFile')?.addEventListener('change', async (event) => { try { if (event.target.files?.[0]) await importAudioFingerprints(event.target.files[0]); } catch (error) { toast(error.message, 5000); } event.target.value = ''; });
    $('#clearFingerprintsBtn')?.addEventListener('click', () => clearAudioFingerprints().catch((error) => toast(error.message, 4500)));
    $('#importGetInLineBtn')?.addEventListener('click', () => $('#importGetInLineFile')?.click());
    $('#importGetInLineFile')?.addEventListener('change', async (event) => { try { if (event.target.files?.[0]) await importGetInLineCatalog(event.target.files[0]); } catch (error) { toast(error.message, 5000); } event.target.value = ''; });
    $('#exportGetInLineBtn')?.addEventListener('click', exportGetInLineCatalog);
    $('#clearGetInLineBtn')?.addEventListener('click', () => clearGetInLineCatalog().catch((error) => toast(error.message, 4500)));
    $('#motionReferenceFiles').addEventListener('change', async (event) => { if (event.target.files?.length) await processMotionReferenceFiles(event.target.files); event.target.value = ''; });
    $('#exportMotionRefsBtn').addEventListener('click', exportMotionReferences);
    $('#importMotionRefsBtn').addEventListener('click', () => $('#importMotionRefsFile').click());
    $('#importMotionRefsFile').addEventListener('change', async (event) => { try { if (event.target.files?.[0]) await importMotionReferences(event.target.files[0]); } catch (error) { toast(error.message, 4500); } event.target.value = ''; });
    $('#clearMotionRefsBtn').addEventListener('click', clearMotionReferences);

    $('#addDanceBtn').addEventListener('click', () => openDanceEditor());
    $('#exportDancesBtn').addEventListener('click', exportDances);
    $('#importDancesBtn').addEventListener('click', () => $('#importDancesFile').click());
    $('#importDancesFile').addEventListener('change', async (event) => { try { if (event.target.files?.[0]) await importDanceDatabase(event.target.files[0]); } catch (error) { toast(error.message, 4500); } event.target.value = ''; });
    $('#exportBackupBtn').addEventListener('click', exportFullBackup);
    $('#importBackupBtn').addEventListener('click', () => $('#importBackupFile').click());
    $('#importBackupFile').addEventListener('change', async (event) => { try { if (event.target.files?.[0]) await importFullBackup(event.target.files[0]); } catch (error) { toast(error.message, 4500); } event.target.value = ''; });
    $('#exportCsvBtn').addEventListener('click', exportCsv);
    $('#resetAppDataBtn').addEventListener('click', resetOwnData);
    $('#deleteAllLocalDataBtn')?.addEventListener('click', () => deleteAllLocalUserData());
    $('#runDiagnosticsBtn').addEventListener('click', () => runDiagnostics());

    $('#backFromResult').addEventListener('click', () => showView(state.previousView || 'home'));
    $('#closeDialog').addEventListener('click', closeDialog);
    $('#appDialog').addEventListener('click', (event) => { if (event.target === $('#appDialog')) closeDialog(); });
    window.addEventListener('hashchange', handleInitialRoute);
    window.addEventListener('online', () => { updateOnlineStatus(); checkOnlineService(false); });
    window.addEventListener('offline', () => updateOnlineStatus());
    window.addEventListener('cldf:radio-live-updated', () => {
      // Die Live-Metadaten bleiben unsichtbar im Hintergrund und erweitern nur den Liedkatalog.
      if ($('#view-search')?.classList.contains('active')) renderSearch(false);
    });
    window.addEventListener('focus', refreshMicrophoneStatus);
    window.addEventListener('resize', updateViewportMetrics, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(updateViewportMetrics, 120), { passive: true });
    window.visualViewport?.addEventListener('resize', updateViewportMetrics, { passive: true });
    window.visualViewport?.addEventListener('scroll', updateViewportMetrics, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        refreshMicrophoneStatus();
        setTimeout(updateViewportMetrics, 80);
      }
    });
  }

  function showInstallHelp() {
    openDialog(`
      <div class="onboarding">
        <div class="onboarding-icon">📲</div>
        <h2>CLDF Offline installieren</h2>
        <div class="onboarding-steps">
          <div class="onboarding-step"><span>1</span><div><strong>Einmal über HTTPS oder localhost öffnen</strong><br>Das ist nur für Installation und Mikrofonfreigabe nötig.</div></div>
          <div class="onboarding-step"><span>2</span><div><strong>Zum Startbildschirm hinzufügen</strong><br>Im Browsermenü „App installieren“ oder „Zum Startbildschirm“ wählen.</div></div>
          <div class="onboarding-step"><span>3</span><div><strong>Danach offline verwenden</strong><br>Tanzdaten, Liedzuordnungen, BPM-Regeln und Analyse bleiben auf dem Gerät. Nur externe Tanzsheet-Links brauchen Internet.</div></div>
        </div>
        <button id="closeInstallHelp" class="primary-btn" type="button">Verstanden</button>
      </div>`, { focusSelector: '#closeInstallHelp' });
    $('#closeInstallHelp').addEventListener('click', closeDialog, { once: true });
  }

  async function init() {
    await loadLargeLocalData();
    rebuildDanceState();
    bindEvents();
    renderMotionCatalog();
    renderAll();
    renderAudioFingerprintCatalog();
    updateGetInLineStatus();
    updateSecurityNotice();
    updateOnlineStatus();
    await refreshMicrophoneStatus();
    await checkOnlineService(false);
    RADIO_LIVE_API?.start?.();
    runDiagnostics();
    handleInitialRoute();
    $('#versionText').textContent = `CLDF v4.7.3 · Offline · ${state.dances.length} lokale Tänze · ${GETINLINE_DANCES.length} Get-in-Line-Tänze · ${SONG_API_ENTRIES.length} Song-API-Zuordnungen · ${allFingerprintEntries().length} Audio-Referenzen · Liedzuordnung zuerst`;
    // Der Startbildschirm bleibt bei jedem neuen App-Start sichtbar,
    // bis der Benutzer bewusst auf „App öffnen“ tippt.
    $('#splash').classList.remove('hidden');
    $('#splash').style.opacity = '1';
    $('#app').classList.add('hidden');
    document.body.classList.remove('app-open');
    updateViewportMetrics();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
