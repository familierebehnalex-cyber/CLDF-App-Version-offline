"use strict";
(() => {
  const DATA = window.CLDF_DATA || { dances: [] };
  const IMAGE = window.CLDF_IMAGE_MAPPINGS || { mappings: [] };
  const META = window.CLDF_SONG_METADATA || { entries: [] };
  const normalize = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const slug = (value = '') => normalize(value).replace(/\s+/g, '-') || `tanz-${Date.now()}`;
  const dances = Array.isArray(DATA.dances) ? DATA.dances : [];
  const byTitle = new Map(dances.map((dance) => [normalize(dance.title), dance]));
  const mergeMusic = (dance, title, artist = '') => {
    dance.music = Array.isArray(dance.music) ? dance.music : [];
    const t = normalize(title), a = normalize(artist);
    const existing = dance.music.find((item) => normalize(item.title) === t && (!a || !normalize(item.artist) || normalize(item.artist) === a));
    if (!existing) dance.music.push({ title, artist });
    else if (!existing.artist && artist) existing.artist = artist;
  };
  for (const mapping of IMAGE.mappings || []) {
    const key = normalize(mapping.dance);
    let dance = byTitle.get(key);
    if (!dance) {
      dance = {
        id: `bild-${slug(mapping.dance)}`, title: mapping.dance, choreographer: 'Zu prüfen', counts: null, countsText: 'Zu prüfen',
        walls: null, wallsText: 'Zu prüfen', level: 'Zu prüfen', restarts: null, tags: null, bridges: null, breaks: null,
        ending: null, motion: 'Zu prüfen', rhythm: 'Zu prüfen', meter: 'Zu prüfen', bpmMin: null, bpmMax: null,
        knownBpms: [], music: [], teacher: 'Zu prüfen', source: 'Bild-Zuordnung', sourceGroup: 'CLDF', status: 'Zu prüfen',
        note: 'Lied–Tanz-Zuordnung aus den vom Benutzer bereitgestellten Bildern; abgeschnittene Einträge wurden nicht übernommen.',
        recognitionAliases: [mapping.dance], coreMetadataVerified: false, classificationVerified: false, bpmVerified: false,
      };
      dances.push(dance); byTitle.set(key,dance);
    }
    mergeMusic(dance,mapping.song,mapping.artist || '');
    dance.recognitionAliases = [...new Set([...(dance.recognitionAliases || []),mapping.song,mapping.artist].filter(Boolean))];
  }
  const metaByTitle = new Map();
  for (const entry of META.entries || []) {
    const key = normalize(entry.title);
    if (!metaByTitle.has(key)) metaByTitle.set(key,[]);
    metaByTitle.get(key).push(entry);
  }
  for (const dance of dances) {
    const bpms = new Set((dance.knownBpms || []).map(Number).filter(Number.isFinite));
    for (const music of dance.music || []) {
      const candidates = metaByTitle.get(normalize(music.title)) || [];
      const match = candidates.find((entry) => !normalize(music.artist) || !normalize(entry.artist) || normalize(entry.artist) === normalize(music.artist)) || candidates[0];
      if (!match) continue;
      if (!music.artist && match.artist) music.artist = match.artist;
      for (const bpm of match.bpm || []) if (Number.isFinite(Number(bpm))) bpms.add(Number(bpm));
      if ((!dance.meter || normalize(dance.meter) === 'zu prufen') && match.meter?.length === 1) dance.meter = match.meter[0];
      if ((!dance.motion || normalize(dance.motion) === 'zu prufen') && match.motion?.length === 1) dance.motion = match.motion[0];
      if ((!dance.rhythm || normalize(dance.rhythm) === 'zu prufen') && match.rhythm?.length === 1) dance.rhythm = match.rhythm[0];
    }
    dance.knownBpms = [...bpms].sort((a,b)=>a-b);
    if (!dance.bpmMin && dance.knownBpms.length) dance.bpmMin = Math.min(...dance.knownBpms);
    if (!dance.bpmMax && dance.knownBpms.length) dance.bpmMax = Math.max(...dance.knownBpms);
  }
  DATA.dances = dances;
  DATA.appVersion = '4.5.0';
  DATA.databaseVersion = '2026.07.10-offline-images-audio-meta-v4';
  window.CLDF_DATA = DATA;
})();
