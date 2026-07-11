'use strict';

const crypto = require('node:crypto');

const BASE_URL = 'https://www.get-in-line.de/dances/';

function decodeHtml(buffer, contentType = '') {
  const header = String(contentType || '').toLowerCase();
  const explicit = /charset\s*=\s*([^;\s]+)/i.exec(header)?.[1]?.replace(/["']/g, '');
  const tryDecode = (encoding) => {
    try { return new TextDecoder(encoding, { fatal: false }).decode(buffer); }
    catch { return null; }
  };
  if (explicit) {
    const decoded = tryDecode(explicit);
    if (decoded) return decoded;
  }
  const utf8 = tryDecode('utf-8') || Buffer.from(buffer).toString('utf8');
  const replacements = (utf8.match(/\uFFFD/g) || []).length;
  if (replacements <= 2) return utf8;
  return tryDecode('windows-1252') || utf8;
}

function decodeEntities(value) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
    ndash: '–', mdash: '—', hellip: '…', copy: '©', frac12: '½', frac14: '¼', frac34: '¾',
  };
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (all, key) => Object.prototype.hasOwnProperty.call(named, key) ? named[key] : all);
}

function htmlToText(html) {
  return decodeEntities(String(html || ''))
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/td|\/th|\/h[1-6]|hr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clean(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '')
    .trim();
}

function section(text, startLabel, endLabels) {
  const start = text.toLowerCase().indexOf(startLabel.toLowerCase());
  if (start < 0) return '';
  const contentStart = start + startLabel.length;
  let end = text.length;
  for (const label of endLabels) {
    const idx = text.toLowerCase().indexOf(label.toLowerCase(), contentStart);
    if (idx >= 0 && idx < end) end = idx;
  }
  return text.slice(contentStart, end).trim();
}

function extractTitle(text, html = '') {
  const og = /<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1]
    || /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i.exec(html)?.[1];
  if (og) return clean(decodeEntities(og).replace(/\s*[|–-]\s*Get In Line.*$/i, ''));
  const before = text.split(/Choreographie\s*:/i)[0];
  const lines = before.split('\n').map(clean).filter(Boolean).filter((line) => !/^(Get In Line|Menü|Home|Tanzarchiv|Email|Sprache|English|Suche nach|Drucken)$/i.test(line));
  if (lines.length) return lines[lines.length - 1];
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  return clean(decodeEntities(titleTag || '').replace(/\s*[|–-]\s*Get In Line.*$/i, '')) || 'Unbenannter Tanz';
}

function parseDescription(description) {
  const raw = clean(description);
  const countsMatch = /\b(\d+)\s*count\b/i.exec(raw);
  const wallsMatch = /\b(\d+)\s*wall\b/i.exec(raw);
  const lineDanceMatch = /(?:^|,|;)\s*([^,;]+?)\s+line\s+dance\b/i.exec(raw);
  let level = clean(lineDanceMatch?.[1] || '');
  level = level.replace(/^\d+\s*wall\s*,?\s*/i, '').replace(/^\d+\s*count\s*,?\s*/i, '').trim();
  const countExtras = (labelPattern) => [...raw.matchAll(new RegExp(`\\b(\\d+)\\s+(?:${labelPattern})\\b`, 'gi'))].map((m) => Number(m[1]));
  const restartMatches = countExtras('restart(?:s)?');
  const tagMatches = countExtras('tag(?:s)?(?:\\/restart)?');
  const bridgeMatches = countExtras('bridge(?:s)?');
  const breakMatches = countExtras('break(?:s)?');
  const extras = clean(raw.split(';').slice(1).join(';'));
  const countsText = countsMatch ? `${countsMatch[1]} count` : (/\bphrased\b/i.test(raw) ? 'Phrased' : 'Zu prüfen');
  const wallsText = wallsMatch ? `${wallsMatch[1]} wall` : (/\bcontra\b/i.test(raw) ? 'Contra' : /\bcircle\b/i.test(raw) ? 'Circle' : 'Zu prüfen');
  return {
    raw,
    counts: countsMatch ? Number(countsMatch[1]) : null,
    countsText,
    walls: wallsMatch ? Number(wallsMatch[1]) : null,
    wallsText,
    level: level || 'Zu prüfen',
    restarts: restartMatches.length ? Math.max(...restartMatches) : 0,
    tags: tagMatches.length ? tagMatches.reduce((sum, value) => sum + value, 0) : 0,
    bridges: bridgeMatches.length ? bridgeMatches.reduce((sum, value) => sum + value, 0) : 0,
    breaks: breakMatches.length ? breakMatches.reduce((sum, value) => sum + value, 0) : 0,
    ending: /\b(?:ending|end)\b/i.test(extras),
    tagInfo: extras || 'Keine Angaben',
  };
}

function parseMusic(musicBlock) {
  const raw = String(musicBlock || '')
    .replace(/\n{2,}/g, '\n')
    .split('\n')
    .map(clean)
    .filter(Boolean)
    .filter((line) => !/^(oder|and|or)$/i.test(line))
    .join('\n');

  const music = [];
  for (const line of raw.split('\n')) {
    const normalizedLine = clean(line.replace(/^oder\s+/i, ''));
    const match = /^(.*?)\s+von\s+(.+)$/i.exec(normalizedLine);
    if (match) {
      music.push({ title: clean(match[1]), artist: clean(match[2]) });
    }
  }
  if (!music.length && raw) {
    const parts = raw.split(/\s+(?:oder|and|or)\s+/i);
    for (const part of parts) {
      const match = /^(.*?)\s+von\s+(.+)$/i.exec(clean(part));
      if (match) music.push({ title: clean(match[1]), artist: clean(match[2]) });
    }
  }
  return {
    raw: clean(raw.replace(/\n/g, ' · ')),
    music: music.length ? music : [{ title: clean(raw) || 'Zu prüfen', artist: 'Zu prüfen' }],
  };
}

function parseDate(text, label) {
  const match = new RegExp(`${label}\\s*:\\s*(\\d{1,2}\\.\\d{1,2}\\.\\d{4})`, 'i').exec(text);
  if (!match) return '';
  const [day, month, year] = match[1].split('.');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function stableId(sourceUrl) {
  return `gil-${crypto.createHash('sha1').update(String(sourceUrl)).digest('hex').slice(0, 16)}`;
}

function parseDancePage(html, sourceUrl) {
  const text = htmlToText(html);
  const title = extractTitle(text, html);
  const choreographer = clean(section(text, 'Choreographie:', ['Beschreibung:', 'Musik:', 'Hinweis:']).split('\n')[0]);
  const descriptionBlock = section(text, 'Beschreibung:', ['Musik:', 'Hinweis:', 'S1:', 'Wiederholung bis zum Ende']);
  const description = parseDescription(descriptionBlock);
  const musicBlock = section(text, 'Musik:', ['Hinweis:', '\nS1:', '\nS2:', 'Wiederholung bis zum Ende', 'Aufnahme:']);
  const music = parseMusic(musicBlock);
  const published = parseDate(text, 'Aufnahme');
  const updated = parseDate(text, 'Stand');
  return {
    id: stableId(sourceUrl),
    title: title || 'Unbenannter Tanz',
    choreographer: choreographer || 'Zu prüfen',
    counts: description.counts,
    countsText: description.countsText,
    walls: description.walls,
    wallsText: description.wallsText,
    level: description.level,
    restarts: description.restarts,
    tags: description.tags,
    bridges: description.bridges,
    breaks: description.breaks,
    ending: description.ending,
    tagInfo: description.tagInfo,
    music: music.music,
    musicRaw: music.raw,
    publishedYear: published ? Number(published.slice(0, 4)) : null,
    publishedAt: published,
    updatedAt: updated,
    source: 'Get-in-Line',
    sourceUrl,
    sheetUrl: sourceUrl,
    steps: 'Original-Tanzsheet bei Get-in-Line',
    status: 'Get-in-Line',
    coreMetadataVerified: Boolean(title && choreographer && description.raw && music.raw),
    dataQuality: 'Metadaten aus Get-in-Line-Tanzsheet',
    externalCatalog: true,
    sourceDescription: description.raw,
  };
}

function parseDirectoryIndex(html, baseUrl = BASE_URL) {
  const links = new Set();
  const regex = /href\s*=\s*["']([^"']+\.html?)["']/gi;
  let match;
  while ((match = regex.exec(String(html || '')))) {
    const href = decodeEntities(match[1]);
    if (/^(?:\.\.\/|\/|https?:\/\/)/i.test(href) && !href.includes('/dances/')) continue;
    try {
      const url = new URL(href, baseUrl);
      if (!/\/dances\/[^/]+\.html?$/i.test(url.pathname)) continue;
      links.add(url.href);
    } catch { /* ungültigen Link ignorieren */ }
  }
  return [...links].sort((a, b) => a.localeCompare(b, 'en'));
}

module.exports = {
  BASE_URL,
  clean,
  decodeHtml,
  htmlToText,
  parseDancePage,
  parseDescription,
  parseDirectoryIndex,
  parseMusic,
  stableId,
};
