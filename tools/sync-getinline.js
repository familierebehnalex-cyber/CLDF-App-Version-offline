#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { BASE_URL, decodeHtml, parseDancePage, parseDirectoryIndex } = require('./getinline-lib');

const ROOT = path.resolve(__dirname, '..');
const JSON_FILE = path.join(ROOT, 'data', 'getinline-dances.json');
const JS_FILE = path.join(ROOT, 'assets', 'getinline-data.js');
const CHECKPOINT_FILE = path.join(ROOT, 'data', 'getinline-sync-checkpoint.json');
const DIRECTORY_URL = process.env.GETINLINE_DIRECTORY_URL || BASE_URL;

function option(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const LIMIT = Math.max(0, Number(option('limit', process.env.GETINLINE_LIMIT || 0)) || 0);
const CONCURRENCY = Math.min(6, Math.max(1, Number(option('concurrency', process.env.GETINLINE_CONCURRENCY || 2)) || 2));
const DELAY_MS = Math.max(100, Number(option('delay', process.env.GETINLINE_DELAY_MS || 350)) || 350);
const FULL = process.argv.includes('--full');
const USER_AGENT = process.env.GETINLINE_USER_AGENT || 'CLDF-App/4.0 (+Metadaten-Synchronisierung; Kontakt über App-Betreiber)';

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function fetchPage(url) {
  if (String(url).startsWith('file://')) {
    const filePath = fileURLToPath(url);
    return fs.readFileSync(filePath, 'utf8');
  }
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.5',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        const retryAfter = Number(response.headers.get('retry-after') || 0);
        const error = new Error(`${response.status} ${response.statusText}`);
        if (response.status === 429 || response.status >= 500) {
          lastError = error;
          await sleep(Math.max(retryAfter * 1000, attempt * 1500));
          continue;
        }
        throw error;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      return decodeHtml(buffer, response.headers.get('content-type') || '');
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await sleep(attempt * 1500);
        continue;
      }
    }
  }
  throw lastError || new Error('Seite konnte nicht geladen werden.');
}

function loadExisting() {
  try {
    const parsed = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    return Array.isArray(parsed.dances) ? parsed.dances : [];
  } catch { return []; }
}

function writeCatalog(dances, errors = []) {
  const payload = {
    format: 'CLDF-GETINLINE-CATALOG',
    formatVersion: 1,
    appVersion: '4.0.0',
    source: 'Get-in-Line',
    sourceHomepage: 'https://www.get-in-line.de/',
    generatedAt: new Date().toISOString(),
    count: dances.length,
    fields: ['title', 'music', 'choreographer', 'level', 'counts', 'walls', 'restarts', 'tags', 'bridges', 'breaks', 'ending', 'sheetUrl'],
    note: 'BPM, Taktart, Motion und Rhythmus werden in der App mit lokalen Lied- und Regel-Daten ergänzt, soweit eindeutig.',
    copyrightNotice: 'Es werden nur Metadaten und Links gespeichert. Die vollständigen Schrittbeschreibungen verbleiben bei Get-in-Line.',
    errors,
    dances,
  };
  fs.writeFileSync(JSON_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(JS_FILE, `window.GETINLINE_DATA = ${JSON.stringify(payload)};\n`, 'utf8');
}

async function main() {
  console.log(`Get-in-Line-Verzeichnis laden: ${DIRECTORY_URL}`);
  const indexHtml = await fetchPage(DIRECTORY_URL);
  let urls = parseDirectoryIndex(indexHtml, DIRECTORY_URL);
  if (LIMIT) urls = urls.slice(0, LIMIT);
  if (!urls.length) throw new Error('Im Get-in-Line-Verzeichnis wurden keine Tanzseiten gefunden.');

  const existing = loadExisting();
  const byUrl = new Map(existing.map((dance) => [dance.sourceUrl, dance]));
  const queue = FULL ? urls : urls.filter((url) => !byUrl.has(url));
  const errors = [];
  let completed = 0;
  let cursor = 0;

  console.log(`${urls.length} Tanzseiten gefunden; ${queue.length} werden abgerufen; ${byUrl.size} sind bereits im Cache.`);

  async function worker(workerId) {
    while (true) {
      const index = cursor++;
      if (index >= queue.length) return;
      const url = queue[index];
      try {
        const html = await fetchPage(url);
        const dance = parseDancePage(html, url);
        if (!dance.title || dance.title === 'Unbenannter Tanz') throw new Error('Titel konnte nicht gelesen werden');
        byUrl.set(url, dance);
      } catch (error) {
        errors.push({ url, error: error.message });
        console.error(`Fehler [${workerId}] ${url}: ${error.message}`);
      } finally {
        completed += 1;
        if (completed % 25 === 0 || completed === queue.length) {
          const dances = [...byUrl.values()].sort((a, b) => a.title.localeCompare(b.title, 'de'));
          writeCatalog(dances, errors);
          fs.writeFileSync(CHECKPOINT_FILE, `${JSON.stringify({ generatedAt: new Date().toISOString(), completed, total: queue.length, catalogCount: dances.length, errors: errors.length }, null, 2)}\n`);
          console.log(`Fortschritt: ${completed}/${queue.length} · Katalog: ${dances.length} · Fehler: ${errors.length}`);
        }
        await sleep(DELAY_MS);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, index) => worker(index + 1)));
  const dances = [...byUrl.values()].sort((a, b) => a.title.localeCompare(b.title, 'de'));
  writeCatalog(dances, errors);
  console.log(`Fertig: ${dances.length} Get-in-Line-Tänze gespeichert. ${errors.length} Seiten konnten nicht verarbeitet werden.`);
}

main().catch((error) => {
  console.error(`Synchronisierung abgebrochen: ${error.message}`);
  process.exitCode = 1;
});
