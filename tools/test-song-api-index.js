#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const index=JSON.parse(fs.readFileSync(path.join(ROOT,'data/song-api-index.json'),'utf8'));
const app=fs.readFileSync(path.join(ROOT,'assets/app.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const worker=fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
function assert(c,m){if(!c)throw new Error(m);}
assert(index.format==='CLDF-SONG-API-INDEX','Falsches Song-API-Format.');
assert(index.version===2,'Falsche Indexversion.');
assert(index.appVersion==='4.7.6','Falsche App-Version im Song-API-Index.');
assert(Array.isArray(index.entries)&&index.entries.length===4011,'Unerwartete Anzahl liedbezogener API-Einträge.');
assert(index.stationCount===10,'Es müssen zehn Senderquellen vorhanden sein.');
assert(index.apiEndpointCount===70,'Es müssen 70 bereitgestellte Sender-Endpunkte vorhanden sein.');
assert(index.entries.every(e=>Array.isArray(e.apiSongIds)&&e.apiSongIds.length),'Mindestens ein Lied besitzt keine API-Song-ID.');
assert(index.entries.filter(e=>(e.candidateDances||[]).length).length>=338,'Zu wenige Tanzvorschläge.');
assert(index.entries.filter(e=>(e.exactDanceCandidates||[]).length).length>=143,'Zu wenige exakte Tanzzuordnungen.');
const lonely=index.entries.find(e=>/lonely drum/i.test(e.title)&&/aaron goodvin/i.test(e.artist));
assert(lonely,'Referenzlied Lonely Drum fehlt.'); assert(lonely.apiSongIds.includes('19470677'),'API-ID fehlt.');
assert(lonely.exactDanceCandidates.some(d=>/lonely drum/i.test(d)),'Tanzzuordnung fehlt.');
const newSong=index.entries.find(e=>/^smoke$/i.test(e.title)&&/a thousand horses/i.test(e.artist));
assert(newSong,'Neuer API-Song Smoke fehlt.'); assert(newSong.stations.some(s=>s.name==='countrymusic'),'Neue Senderquelle countrymusic fehlt.');
assert(html.includes('./assets/song-api-index.js'),'Song-API-Script fehlt.');
assert(worker.includes('./assets/song-api-index.js')&&worker.includes('./data/song-api-index.json'),'Song-API-Dateien fehlen im Offline-Cache.');
assert(app.includes('findSongApiEntry')&&app.includes('mergeSongApiEntry'),'Songbezogener API-Abgleich fehlt.');
assert(app.includes('API-Daten vorhanden')&&app.includes('apiSongIds'),'API-Kennzeichnung fehlt.');
assert(!html.includes('id="radioApiSection"'),'Senderkatalog-Box ist wieder sichtbar.');
console.log(JSON.stringify({passed:true,songApiEntries:index.entries.length,stations:index.stationCount,endpoints:index.apiEndpointCount,danceCandidates:index.entriesWithDanceCandidates,exactDanceCandidates:index.entriesWithExactDanceCandidates},null,2));
