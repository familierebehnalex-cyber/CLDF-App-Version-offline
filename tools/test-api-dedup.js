#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const audit=JSON.parse(fs.readFileSync(path.join(ROOT,'DUBLETTENPRUEFUNG-v4.7.4.json'),'utf8'));
const index=JSON.parse(fs.readFileSync(path.join(ROOT,'data/song-api-index.json'),'utf8'));
const keys=index.entries.map(e=>e.key);
assert.equal(new Set(keys).size,keys.length,'Doppelte Song-Schlüssel im Endindex.');
assert.equal(audit.newRawCatalogEntries,3237);
assert.equal(audit.duplicateRowsCollapsedWithinNew,223);
assert.equal(audit.overlapKeysWithExistingApp,255);
assert.equal(audit.finalUniqueSongApiEntries,4011);
assert.equal(audit.finalJinglesExcludedFromPlayableCatalog,21);
assert.equal(audit.suspiciousApiIdConflictsNotMerged,5);
for(const conflict of audit.suspiciousApiIdConflictDetails){
  assert.ok(conflict.apiSongId);
  assert.ok(Array.isArray(conflict.variants)&&conflict.variants.length>=2);
}
console.log(JSON.stringify({passed:true,finalEntries:keys.length,duplicatesCollapsed:audit.duplicateRowsCollapsedWithinNew,existingOverlaps:audit.overlapKeysWithExistingApp,jinglesExcluded:audit.finalJinglesExcludedFromPlayableCatalog,conflictsKeptSeparate:audit.suspiciousApiIdConflictsNotMerged},null,2));
