#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'assets/radio-live-api.js'), 'utf8');
const store = new Map();
const events = [];
const fetchCalls = [];

const stations = [
  {
    name: 'linedance_nahetal',
    active: true,
    apiUrls: {
      current_song: 'https://api.laut.fm/station/linedance_nahetal/current_song',
      last_songs: 'https://api.laut.fm/station/linedance_nahetal/last_songs',
    },
  },
  {
    name: 'country-fm24',
    active: true,
    apiUrls: {
      current_song: 'https://api.laut.fm/station/country-fm24/current_song',
      last_songs: 'https://api.laut.fm/station/country-fm24/last_songs',
    },
  },
];

const currentPayload = {
  id: 100,
  type: 'song',
  title: 'Lonely Drum - Lonely Drum',
  artist: { name: 'Aaron Goodvin' },
  started_at: '2026-07-12 12:00:00 +0200',
};
const lastPayload = [
  {
    id: 101,
    type: 'song',
    title: 'He Drinks Tequila - You\'re So Naughty',
    artist: { name: 'Sammy Kershaw & Lorrie Morgan' },
    started_at: '2026-07-12 11:56:00 +0200',
  },
  {
    id: 102,
    type: 'jingle',
    title: 'Station Jingle',
    artist: { name: '' },
    started_at: '2026-07-12 11:55:00 +0200',
  },
];

const sandbox = {
  console,
  URL,
  AbortController,
  setTimeout,
  clearTimeout,
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  fetch: async (url) => {
    fetchCalls.push(String(url));
    const body = String(url).endsWith('/last_songs') ? lastPayload : currentPayload;
    return { ok: true, status: 200, json: async () => body };
  },
  document: {
    hidden: false,
    addEventListener() {},
  },
};
sandbox.window = {
  CLDF_RADIO_API_DATA: { stations },
  navigator: { onLine: true },
  localStorage: {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
  },
  dispatchEvent: (event) => events.push(event),
  addEventListener() {},
  setInterval: () => 1,
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'radio-live-api.js' });

(async () => {
  assert.ok(sandbox.window.CLDFRadioLiveAPI, 'Live-API-Modul wurde nicht bereitgestellt.');
  const entries = await sandbox.window.CLDFRadioLiveAPI.refresh();
  assert.equal(fetchCalls.length, 4, 'Für zwei Sender werden je current_song und last_songs erwartet.');
  assert.ok(entries.length >= 2, 'Zu wenige Live-Einträge übernommen.');
  assert.ok(entries.some((entry) => entry.title === 'Lonely Drum' && entry.artist === 'Aaron Goodvin'));
  const tequila = entries.find((entry) => entry.title === 'He Drinks Tequila');
  assert.ok(tequila, 'Linedance-Titel wurde nicht zerlegt.');
  assert.ok(tequila.candidateDances.includes("You're So Naughty"));
  assert.ok(!entries.some((entry) => /jingle/i.test(entry.title)), 'Jingle wurde fälschlich übernommen.');
  assert.ok(store.has('cldf.v2.radioLiveApiEntries'), 'Offline-Fallback wurde nicht gespeichert.');
  assert.equal(events.at(-1)?.type, 'cldf:radio-live-updated');
  const status = sandbox.window.CLDFRadioLiveAPI.getStatus();
  assert.equal(status.successfulStations, 2);
  assert.equal(status.failedStations, 0);
  assert.ok(status.lastSuccessAt);
  console.log(JSON.stringify({ fetchCalls: fetchCalls.length, cachedEntries: entries.length, result: 'OK' }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
