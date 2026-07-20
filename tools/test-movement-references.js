'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'data', 'video-movement-references-index.json'), 'utf8'));
const dataJs = fs.readFileSync(path.join(root, 'assets', 'data.js'), 'utf8');
const ids = new Set([...dataJs.matchAll(/"id":"([^"]+)"/g)].map((match) => match[1]));
let references = [];
for (const pack of index.packs || []) {
  const payload = JSON.parse(fs.readFileSync(path.join(root, 'data', pack.file), 'utf8'));
  if (!Array.isArray(payload.references) || payload.references.length !== pack.count) throw new Error(`Ungültiges Paket ${pack.file}`);
  references.push(...payload.references);
}
if (references.length !== index.count) throw new Error(`Referenzanzahl falsch: ${references.length} statt ${index.count}`);
const missing = references.filter((reference) => !ids.has(reference.danceId));
if (missing.length) throw new Error(`${missing.length} Tanz-IDs fehlen in data.js`);
const invalid = references.filter((reference) => reference?.signature?.version !== 2 || !Array.isArray(reference.signature.featureFrames));
if (invalid.length) throw new Error(`${invalid.length} ungültige Bewegungssignaturen`);
const duplicateIds = references.length - new Set(references.map((reference) => reference.id)).size;
if (duplicateIds) throw new Error(`${duplicateIds} doppelte Referenz-IDs`);
console.log(JSON.stringify({ references: references.length, dances: new Set(references.map((r) => r.danceId)).size, packs: index.packs.length, status: 'OK' }, null, 2));
