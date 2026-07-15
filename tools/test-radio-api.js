#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path'); const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data/radio-api-catalog.json'),'utf8'));
assert.equal(data.format,'CLDF-RADIO-API-CATALOG');
assert.equal(data.version,3);
assert.equal(data.stationCount,10);
assert.equal(data.stations.length,10);
assert.equal(data.count,data.entries.length);
assert.equal(data.sourceRecordCount,4502);
assert.ok(data.playableSongCount>=3990);
assert.equal(data.jingleCount,21);
assert.ok(data.entriesWithDanceSuggestion>=338);
assert.ok(data.entriesWithExactDanceMatch>=143);
const keys=new Set();
for(const entry of data.entries){
 assert.ok(entry.key&&entry.title,'Jeder Radioeintrag braucht Schlüssel und Titel.');
 assert.ok(!keys.has(entry.key),`Doppelter Radio-Schlüssel: ${entry.key}`); keys.add(entry.key);
 assert.ok(Array.isArray(entry.stations)&&entry.stations.length,`Sender fehlt: ${entry.key}`);
 assert.ok(Array.isArray(entry.apiSongIds)&&entry.apiSongIds.length,`API-Song-ID fehlt: ${entry.key}`);
 assert.ok(Array.isArray(entry.candidateDances)); assert.ok(Array.isArray(entry.exactDanceCandidates));
}
for(const station of data.stations){
 assert.match(station.pageUrl,/^https:\/\//); assert.match(station.streamUrl,/^https:\/\//);
 assert.match(station.apiUrls.current_song,/^https:\/\/api\.laut\.fm\/station\//);
}
const lonely=data.entries.find(e=>/aaron goodvin/i.test(e.artist)&&/^lonely drum$/i.test(e.title));
assert.ok(lonely); assert.ok(lonely.apiSongIds.includes('19470677')); assert.ok(lonely.exactDanceCandidates.includes('Lonely Drum'));
const smoke=data.entries.find(e=>/a thousand horses/i.test(e.artist)&&/^smoke$/i.test(e.title));
assert.ok(smoke); assert.ok(smoke.stations.includes('countrymusic'));
assert.equal(data.entries.filter(e=>e.isJingle).length,data.jingleCount);
console.log(JSON.stringify({stations:data.stationCount,sourceRecords:data.sourceRecordCount,uniqueEntries:data.count,playableSongs:data.playableSongCount,danceSuggestions:data.entriesWithDanceSuggestion,exactDanceMatches:data.entriesWithExactDanceMatch,result:'OK'},null,2));
