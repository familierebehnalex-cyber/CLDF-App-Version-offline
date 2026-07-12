#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/song-api-index.json'), 'utf8'));
const app = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(index.format === 'CLDF-SONG-API-INDEX', 'Falsches Song-API-Format.');
assert(index.appVersion === '4.7.3', 'Falsche App-Version im Song-API-Index.');
assert(Array.isArray(index.entries) && index.entries.length >= 1250, 'Zu wenige liedbezogene API-Einträge.');
assert(index.stationCount === 5, 'Es müssen fünf Senderquellen vorhanden sein.');
assert(index.apiEndpointCount === 35, 'Es müssen 35 bereitgestellte Sender-Endpunkte vorhanden sein.');
assert(index.entries.every((entry) => Array.isArray(entry.apiSongIds) && entry.apiSongIds.length), 'Mindestens ein Lied besitzt keine API-Song-ID.');
assert(index.entries.filter((entry) => (entry.candidateDances || []).length).length >= 250, 'Zu wenige Tanzvorschläge aus der API-Sammlung.');
assert(index.entries.filter((entry) => (entry.exactDanceCandidates || []).length).length >= 60, 'Zu wenige exakte Tanzzuordnungen.');

const lonelyDrum = index.entries.find((entry) => /lonely drum/i.test(entry.title) && /aaron goodvin/i.test(entry.artist));
assert(lonelyDrum, 'Referenzlied „Lonely Drum“ fehlt.');
assert(lonelyDrum.apiSongIds.includes('19470677'), 'API-Song-ID für „Lonely Drum“ fehlt.');
assert(lonelyDrum.exactDanceCandidates.some((dance) => /lonely drum/i.test(dance)), 'Tanzzuordnung für „Lonely Drum“ fehlt.');
const source = lonelyDrum.stations.find((station) => station.name === 'linedance_nahetal');
assert(source, 'Senderquelle für „Lonely Drum“ fehlt.');
assert(source.apiUrls.current_song === 'https://api.laut.fm/station/linedance_nahetal/current_song', 'current_song-Endpunkt fehlt.');
assert(source.apiUrls.last_songs === 'https://api.laut.fm/station/linedance_nahetal/last_songs', 'last_songs-Endpunkt fehlt.');

assert(html.includes('./assets/song-api-index.js'), 'Song-API-Script wird nicht in index.html geladen.');
assert(worker.includes('./assets/song-api-index.js') && worker.includes('./data/song-api-index.json'), 'Song-API-Dateien fehlen im Offline-Cache.');
assert(app.includes('findSongApiEntry') && app.includes('mergeSongApiEntry'), 'Songbezogener API-Abgleich fehlt im App-Code.');
assert(app.includes('API-Daten vorhanden') && app.includes('apiSongIds'), 'Sichtbare API-Kennzeichnung pro Lied fehlt.');
assert(!html.includes('id="radioApiSection"'), 'Die ausgeblendete Senderkatalog-Box ist wieder sichtbar.');

console.log(JSON.stringify({
  passed: true,
  songApiEntries: index.entries.length,
  stations: index.stationCount,
  endpoints: index.apiEndpointCount,
  danceCandidates: index.entries.filter((entry) => (entry.candidateDances || []).length).length,
  exactDanceCandidates: index.entries.filter((entry) => (entry.exactDanceCandidates || []).length).length,
  referenceSong: {
    artist: lonelyDrum.artist,
    title: lonelyDrum.title,
    apiSongIds: lonelyDrum.apiSongIds,
    exactDanceCandidates: lonelyDrum.exactDanceCandidates,
  },
}, null, 2));
