#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const required = [
  'index.html', 'manifest.webmanifest', 'service-worker.js', 'server.js',
  'assets/app.js', 'assets/audio-engine.js', 'assets/local-store.js', 'assets/styles.css',
  'assets/data.js', 'assets/getinline-data.js', 'assets/image-mappings.js', 'assets/song-metadata.js',
  'data/cldf-data.json', 'data/getinline-dances.json', 'data/bild-lied-tanz-zuordnungen.json', 'data/song-metadata.json',
];
const missing = required.filter((relative) => !fs.existsSync(path.join(ROOT, relative)));
if (missing.length) {
  console.error(`Fehlende Dateien: ${missing.join(', ')}`);
  process.exit(1);
}

for (const relative of ['server.js', 'assets/app.js', 'assets/audio-engine.js', 'assets/local-store.js', 'assets/offline-bootstrap.js', 'service-worker.js', 'tools/sync-getinline.js']) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, relative)], { stdio: 'pipe' });
}

const cldf = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cldf-data.json'), 'utf8'));
const getinline = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/getinline-dances.json'), 'utf8'));
const image = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/bild-lied-tanz-zuordnungen.json'), 'utf8'));
const songs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/song-metadata.json'), 'utf8'));
const fingerprints = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audio-fingerprints.json'), 'utf8'));
const normalize = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const merged = new Set((cldf.dances || []).map((dance) => normalize(dance.title)));
for (const mapping of image.mappings || []) merged.add(normalize(mapping.dance));
for (const dance of getinline.dances || []) merged.add(normalize(dance.title));
const sourceFiles = ['server.js', 'assets/app.js', 'index.html'].map((relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8')).join('\n');
const forbidden = ['AUDD_API_TOKEN', '/api/recognize', 'api.audd.io'].filter((needle) => sourceFiles.includes(needle));
const styles = fs.readFileSync(path.join(ROOT, 'assets/styles.css'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const essentialDomIds = [
  'app', 'recordBtn', 'audioFile', 'searchInput', 'versionText',
  'audioFingerprintFiles', 'audioFingerprintCount', 'audioFingerprintList',
  'importGetInLineBtn', 'importGetInLineFile', 'getinlineCatalogCount',
  'getinlineCatalogStatus', 'appDialog', 'fingerprintProgress'
];
const missingDomIds = essentialDomIds.filter((id) => !new RegExp(`id=[\"']${id}[\"']`).test(html));
if (missingDomIds.length) {
  console.error(`Fehlende wichtige HTML-Elemente: ${missingDomIds.join(', ')}`);
  process.exit(1);
}
execFileSync(process.execPath, [path.join(ROOT, 'tools/test-getinline-parser.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(ROOT, 'tools/test-audio-fingerprint.js')], { stdio: 'pipe' });
const report = {
  appVersion: '4.1.0',
  generatedAt: new Date().toISOString(),
  requiredFilesPresent: true,
  javascriptSyntaxValid: true,
  essentialDomIdsPresent: true,
  getInLineParserTestsPassed: true,
  audioFingerprintSelfTestPassed: true,
  staticOfflineServer: true,
  serviceWorkerPresent: true,
  originalDesignStylesSha256: crypto.createHash('sha256').update(styles).digest('hex'),
  cldfBaseDances: (cldf.dances || []).length,
  imageMappings: image.metadata?.record_count || (image.mappings || []).length,
  imageUniqueDances: image.metadata?.unique_dances || (image.dances || []).length,
  mergedLocalDanceNamesWithoutGetInLine: new Set([
    ...(cldf.dances || []).map((dance) => normalize(dance.title)),
    ...(image.mappings || []).map((mapping) => normalize(mapping.dance)),
  ]).size,
  getInLineEmbeddedCount: (getinline.dances || []).length,
  mergedDanceNamesIncludingGetInLine: merged.size,
  songMetadataEntries: (songs.entries || []).length,
  songsWithArtist: (songs.entries || []).filter((entry) => entry.artist).length,
  songsWithBpm: (songs.entries || []).filter((entry) => Array.isArray(entry.bpm) && entry.bpm.length).length,
  microphoneSeconds: 12,
  audioFingerprintAlgorithm: 'cldf-landmark-v1',
  embeddedAudioFingerprints: (fingerprints.entries || []).length,
  indexedDbAudioLibrary: true,
  indexedDbGetInLineImport: true,
  githubCatalogUpdater: fs.existsSync(path.join(ROOT, '.github/workflows/update-getinline.yml')),
  githubPagesWorkflow: fs.existsSync(path.join(ROOT, '.github/workflows/deploy-pages.yml')),
  serverApiRemoved: forbidden.length === 0,
  forbiddenOnlineRecognitionReferences: forbidden,
};
fs.writeFileSync(path.join(ROOT, 'VALIDIERUNG.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (forbidden.length) process.exit(1);
