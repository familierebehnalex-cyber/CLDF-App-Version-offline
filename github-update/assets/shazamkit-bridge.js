(() => {
  'use strict';
  if (window.CLDFNativeShazam?.installed) return;

  const state = { installed: true, localOnce: false, busy: false };
  const $ = (s, r = document) => r.querySelector(s);
  const norm = (v = '') => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\([^)]*(remaster|version|edit|mix)[^)]*\)/g, ' ')
    .replace(/\b(feat|ft)\.?\b.*$/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uniq = list => [...new Set(list.map(v => String(v || '').trim()).filter(Boolean))];

  function setStatus(text, busy = state.busy) {
    state.busy = busy;
    const label = $('#recordLabel');
    const hint = $('#recordHint');
    const button = $('#recordBtn');
    if (label) label.textContent = busy ? 'ShazamKit erkennt …' : 'Mit ShazamKit erkennen';
    if (hint) hint.textContent = text || (busy ? 'Bitte kurz warten' : 'Tippen zum Starten');
    if (button) button.setAttribute('aria-pressed', busy ? 'true' : 'false');
  }

  function installUi() {
    const record = $('#recordBtn');
    if (!record || record.dataset.shazamBridge === '1') return;
    record.dataset.shazamBridge = '1';
    setStatus('Musikerkennung bereitgestellt durch ShazamKit', false);

    const privacy = record.parentElement?.querySelector('.permission-privacy-note');
    if (privacy && !$('#cldfShazamNotice')) {
      const note = document.createElement('p');
      note.id = 'cldfShazamNotice';
      note.className = 'permission-privacy-note';
      note.innerHTML = '<strong>Native Android-App:</strong> Musikerkennung über ShazamKit. Die Aufnahme wird in eine nicht umkehrbare Audiosignatur umgewandelt; für den Abgleich mit dem Shazam-Katalog ist Internet erforderlich.';
      privacy.after(note);
    }

    if (!$('#cldfLocalRecognitionBtn')) {
      const local = document.createElement('button');
      local.id = 'cldfLocalRecognitionBtn';
      local.type = 'button';
      local.className = 'text-button';
      local.textContent = 'Stattdessen lokale CLDF-Erkennung verwenden';
      local.addEventListener('click', () => {
        state.localOnce = true;
        record.click();
      });
      record.after(local);
    }
  }

  window.addEventListener('click', event => {
    const target = event.target?.closest?.('#recordBtn');
    if (!target) return;
    if (state.localOnce) {
      state.localOnce = false;
      return;
    }
    if (!window.CLDFAndroid) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (state.busy) window.CLDFAndroid.cancelShazamRecognition();
    else {
      state.busy = true;
      setStatus('Mikrofon wird vorbereitet …', true);
      window.CLDFAndroid.startShazamRecognition();
    }
  }, true);

  function songScore(entry, title, artist) {
    const t = norm(entry?.title || entry?.songTitle || entry?.name);
    const a = norm(entry?.artist || entry?.songArtist || entry?.performer);
    const wantedTitle = norm(title);
    const wantedArtist = norm(artist);
    if (!t || !wantedTitle) return 0;
    let score = t === wantedTitle ? 100 : (t.includes(wantedTitle) || wantedTitle.includes(t) ? 82 : 0);
    if (score && wantedArtist && a) score += a === wantedArtist ? 30 : (a.includes(wantedArtist) || wantedArtist.includes(a) ? 16 : -25);
    return score;
  }

  function extractMappings(entry) {
    const original = [];
    const alternatives = [];
    const add = (value, type = 'alternative') => {
      if (!value) return;
      if (Array.isArray(value)) return value.forEach(v => add(v, type));
      if (typeof value === 'object') {
        const name = value.title || value.dance || value.danceTitle || value.name;
        const kind = norm(value.type || value.mappingType || value.role);
        return add(name, kind.includes('original') ? 'original' : type);
      }
      (type === 'original' ? original : alternatives).push(String(value));
    };
    add(entry?.originalDance, 'original');
    add(entry?.originalDanceName, 'original');
    add(entry?.primaryDance, 'original');
    add(entry?.dance, entry?.mappingType === 'original' ? 'original' : 'alternative');
    add(entry?.dances, 'alternative');
    add(entry?.alternativeDances, 'alternative');
    add(entry?.suggestedDances, 'alternative');
    add(entry?.mappings, 'alternative');
    return { original: uniq(original), alternatives: uniq(alternatives) };
  }

  function findDanceMappings(song) {
    const sources = [
      ...(window.CLDF_SONG_API_INDEX?.entries || []),
      ...(window.CLDF_SONG_METADATA?.entries || []),
      ...(window.CLDF_RADIO_API_DATA?.entries || [])
    ];
    const matched = sources.map(entry => ({ entry, score: songScore(entry, song.title, song.artist) }))
      .filter(x => x.score >= 82).sort((a,b) => b.score - a.score);

    const original = [];
    const alternatives = [];
    for (const { entry } of matched.slice(0, 12)) {
      const map = extractMappings(entry);
      original.push(...map.original);
      alternatives.push(...map.alternatives);
    }

    const dances = window.CLDF_DATA?.dances || [];
    for (const dance of dances) {
      const exactMusic = (dance.music || []).some(m => songScore(m, song.title, song.artist) >= 82);
      if (exactMusic) alternatives.push(dance.title);
    }

    const originalUnique = uniq(original);
    const alternativeUnique = uniq(alternatives).filter(name => !originalUnique.some(o => norm(o) === norm(name)));
    if (!originalUnique.length && alternativeUnique.length) originalUnique.push(alternativeUnique.shift());
    return { original: originalUnique.slice(0, 1), alternatives: alternativeUnique.slice(0, 20) };
  }

  function openDanceSearch(name) {
    const searchNav = document.querySelector('[data-view="search"]');
    searchNav?.click();
    setTimeout(() => {
      const input = $('#searchInput');
      if (!input) return;
      input.value = name;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }, 80);
  }

  function danceCard(name, label) {
    return `<article class="dance-card cldf-shazam-dance-card">
      <div class="dance-card-head"><div><p class="eyebrow">${esc(label)}</p><h3>${esc(name)}</h3></div><span class="status-badge">${esc(label)}</span></div>
      <p>Aus der vorhandenen CLDF-Lied–Tanz-Zuordnung.</p>
      <button type="button" class="secondary-btn" data-cldf-dance-search="${esc(name)}">Tanz in CLDF öffnen</button>
    </article>`;
  }

  function render(song) {
    const mappings = findDanceMappings(song);
    $('#resultModeLabel') && ($('#resultModeLabel').textContent = 'ShazamKit-Musikerkennung');
    $('#resultTitle') && ($('#resultTitle').textContent = 'Erkanntes Lied');

    const songResult = $('#songResult');
    if (songResult) {
      const artwork = song.artworkUrl ? `<img src="${esc(song.artworkUrl)}" alt="" style="width:88px;height:88px;object-fit:cover;border-radius:12px">` : '';
      const link = song.appleMusicUrl || song.webUrl;
      songResult.classList.remove('hidden');
      songResult.innerHTML = `<div style="display:flex;gap:14px;align-items:center">${artwork}<div>
        <p class="eyebrow">Musikerkennung bereitgestellt durch ShazamKit</p>
        <h2>${esc(song.title)}</h2><p>${esc(song.artist || 'Interpret nicht angegeben')}</p>
        ${link ? `<a class="secondary-btn link-btn" href="${esc(link)}" target="_blank" rel="noopener">Titel öffnen</a>` : ''}
      </div></div>`;
    }

    $('#tempoResult')?.classList.add('hidden');
    $('#videoMotionResult')?.classList.add('hidden');
    $('#primaryDanceResult')?.classList.add('hidden');
    const heading = $('#matchHeading');
    if (heading) heading.textContent = mappings.original.length || mappings.alternatives.length
      ? 'Originaltanz und alternative Tänze' : 'Kein Tanz in CLDF zugeordnet';

    const list = $('#matchList');
    if (list) {
      list.innerHTML = [
        ...mappings.original.map(name => danceCard(name, 'Originaltanz')),
        ...mappings.alternatives.map(name => danceCard(name, 'Alternative'))
      ].join('') || `<article class="empty-state"><h3>Lied erkannt, aber noch keine Tanzzuordnung</h3><p>Suche nach Titel oder Interpret in der CLDF-Datenbank.</p><button id="cldfSearchRecognizedSong" class="primary-btn">In CLDF suchen</button></article>`;
    }

    document.querySelectorAll('[data-cldf-dance-search]').forEach(button => button.addEventListener('click', () => openDanceSearch(button.dataset.cldfDanceSearch)));
    $('#cldfSearchRecognizedSong')?.addEventListener('click', () => openDanceSearch(`${song.title} ${song.artist || ''}`));

    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-result'));
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.CLDFNativeShazam = {
    ...state,
    receiveStatus(message) { setStatus(message, true); },
    receiveResult(song) { state.busy = false; setStatus('Lied erkannt', false); render(song); },
    receiveNoMatch() { state.busy = false; setStatus('Kein eindeutiger Treffer – lokale Erkennung ist weiter verfügbar', false); },
    receiveError(message) { state.busy = false; setStatus(message || 'ShazamKit-Fehler', false); }
  };

  const observer = new MutationObserver(installUi);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  installUi();
})();
