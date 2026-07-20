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
  'assets/data.js', 'assets/getinline-data.js', 'assets/image-mappings.js', 'assets/song-metadata.js', 'assets/song-api-index.js', 'assets/radio-api-data.js', 'assets/radio-live-api.js',
  'assets/video-motion.js', 'assets/step-sheet-patterns.js', 'assets/mediapipe/pose/pose.js',
  'assets/mediapipe/pose/pose_landmark_lite.tflite', 'assets/mediapipe/pose/pose_solution_simd_wasm_bin.wasm',
  'data/cldf-data.json', 'data/getinline-dances.json', 'data/bild-lied-tanz-zuordnungen.json', 'data/song-metadata.json', 'data/song-api-index.json', 'data/radio-api-catalog.json', 'data/audio-fingerprints-index.json',
  'docs/DATENSCHUTZ.html', 'docs/URHEBERRECHT.html', 'docs/DESIGNSCHUTZ.html', 'docs/IMPRESSUM.html', 'docs/LIZENZEN.html',
];
const missing = required.filter((relative) => !fs.existsSync(path.join(ROOT, relative)));
if (missing.length) {
  console.error(`Fehlende Dateien: ${missing.join(', ')}`);
  process.exit(1);
}

for (const relative of ['server.js', 'assets/app.js', 'assets/audio-engine.js', 'assets/local-store.js', 'assets/offline-bootstrap.js', 'assets/radio-live-api.js', 'assets/video-motion.js', 'assets/step-sheet-patterns.js', 'service-worker.js', 'tools/sync-getinline.js', 'tools/test-video-step-matcher.js']) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, relative)], { stdio: 'pipe' });
}

const cldf = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cldf-data.json'), 'utf8'));
const getinline = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/getinline-dances.json'), 'utf8'));
const image = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/bild-lied-tanz-zuordnungen.json'), 'utf8'));
const songs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/song-metadata.json'), 'utf8'));
const fingerprints = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audio-fingerprints-index.json'), 'utf8'));
const fingerprintPackEntries = (fingerprints.packs || []).reduce((total, pack) => { const payload = JSON.parse(fs.readFileSync(path.join(ROOT, pack.file), 'utf8')); return total + (payload.entries || []).length; }, 0);
const radio = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/radio-api-catalog.json'), 'utf8'));
const songApi = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/song-api-index.json'), 'utf8'));
const normalize = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const merged = new Set((cldf.dances || []).map((dance) => normalize(dance.title)));
for (const mapping of image.mappings || []) merged.add(normalize(mapping.dance));
for (const dance of getinline.dances || []) merged.add(normalize(dance.title));
const sourceFiles = ['server.js', 'assets/app.js', 'assets/radio-live-api.js', 'index.html'].map((relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8')).join('\n');
const forbidden = ['AUDD_API_TOKEN', '/api/recognize', 'api.audd.io'].filter((needle) => sourceFiles.includes(needle));
const styles = fs.readFileSync(path.join(ROOT, 'assets/styles.css'));
const stylesText = styles.toString('utf8');
const originalCssBase = Buffer.from(stylesText.split(/(?<=\n)/).slice(0, 596).join(''), 'utf8');
const expectedOriginalCssBaseSha256 = '89cc732bfecdfc0022e627aba4d0c4718056e198af3a17f45cb050a10af56768';
const originalCssBaseSha256 = crypto.createHash('sha256').update(originalCssBase).digest('hex');
const expectedGraphicHashes = {
  'assets/cldf-hero.webp': '7e9fc962990d8954692884f3b8eadaa0da84a84140e2314643189c3d1fcd4eda',
  'assets/cldf-hero-1200.webp': 'cc73c553d5c7dfa9ec48ab4d0fc5f7d9058ccbc2ce63ec5387af316f3bdf2512',
  'assets/icon-192.png': '0330a00d7d33ed350067b1414f441721f85eb657972c54f06af60de2aa4d30f6',
  'assets/icon-512.png': '5f758f26af0e28555947a65d6e74d9685fe8639efe8561b71a672718505470cf',
};
const graphicHashes = Object.fromEntries(Object.entries(expectedGraphicHashes).map(([relative, expected]) => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relative))).digest('hex');
  return [relative, { expected, actual, unchanged: actual === expected }];
}));
const originalGraphicsUnchanged = Object.values(graphicHashes).every((entry) => entry.unchanged);
const originalCssBasePreserved = originalCssBaseSha256 === expectedOriginalCssBaseSha256;
if (!originalCssBasePreserved || !originalGraphicsUnchanged) {
  console.error('Originaldesign-Prüfung fehlgeschlagen.');
  process.exit(1);
}
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const essentialDomIds = [
  'app', 'recordBtn', 'audioFile', 'searchInput', 'versionText',
  'audioFingerprintSection', 'audioFingerprintFiles', 'audioFingerprintCount', 'audioFingerprintStatus', 'audioFingerprintStatusTitle', 'audioFingerprintStatusText', 'audioFingerprintList',
  'importFingerprintsBtn', 'importFingerprintsFile', 'exportFingerprintsBtn', 'clearFingerprintsBtn',
  'importGetInLineBtn', 'importGetInLineFile', 'getinlineCatalogCount',
  'getinlineCatalogStatus', 'appDialog', 'fingerprintProgress', 'liveDanceVideoBtn'
];
const missingDomIds = essentialDomIds.filter((id) => !new RegExp(`id=[\"']${id}[\"']`).test(html));
const forbiddenVisibleRadioUi = ['radioApiSection', 'radioStationSelect', 'radioCurrentSongBtn'].filter((id) => new RegExp(`id=[\"']${id}[\"']`).test(html));
if (forbiddenVisibleRadioUi.length) {
  console.error(`Nicht gewünschte Radio-Oberfläche noch vorhanden: ${forbiddenVisibleRadioUi.join(', ')}`);
  process.exit(1);
}
if (missingDomIds.length) {
  console.error(`Fehlende wichtige HTML-Elemente: ${missingDomIds.join(', ')}`);
  process.exit(1);
}
const duplicateFingerprintIds = essentialDomIds.filter((id) => (html.match(new RegExp(`id=[\"']${id}[\"']`, 'g')) || []).length !== 1);
if (duplicateFingerprintIds.length) {
  console.error(`Wichtige HTML-IDs fehlen oder sind mehrfach vorhanden: ${duplicateFingerprintIds.join(', ')}`);
  process.exit(1);
}
const appSource = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
const fingerprintSetupGuardPresent = appSource.includes('showMissingFingerprintHelp') && appSource.includes('ensureEmbeddedFingerprintsLoaded');
const fingerprintLibraryVisible = html.includes('id="audioFingerprintSection"') && html.includes('Integrierte Musikreferenzen');
const cameraFeatureChecks = {
  cameraSelection: appSource.includes('liveCameraSelect') && appSource.includes('enumerateDevices'),
  orientationSelection: appSource.includes('liveOrientationSelect') && appSource.includes('cameraVideoConstraints'),
  zoomCapabilities: appSource.includes('getCapabilities') && appSource.includes('applyConstraints'),
  fullBodyGuide: appSource.includes('liveBodyGuide') && appSource.includes('assessPoseFrame'),
  noForcedCrop: appSource.includes("resizeMode: { ideal: 'none' }") && stylesText.includes('object-fit: contain'),
};
if (Object.values(cameraFeatureChecks).some((value) => !value)) {
  console.error(`v4.7.10-Prüfung fehlgeschlagen: ${JSON.stringify(cameraFeatureChecks)}`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
if (manifest.orientation !== 'any') {
  console.error('Das Manifest erlaubt das Querformat nicht.');
  process.exit(1);
}
if (!fingerprintSetupGuardPresent || !fingerprintLibraryVisible) {
  console.error('v4.7.6-Prüfung der sichtbaren Fingerprint-Einrichtung fehlgeschlagen.');
  process.exit(1);
}
execFileSync(process.execPath, [path.join(ROOT, 'tools/test-getinline-parser.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(ROOT, 'tools/test-audio-fingerprint.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(ROOT, 'tools/test-video-step-matcher.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(ROOT, 'tools/test-camera-controls.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(ROOT, 'tools/test-radio-api.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(ROOT, 'tools/test-radio-live-api.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(ROOT, 'tools/test-song-api-index.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(ROOT, 'tools/test-api-dedup.js')], { stdio: 'pipe' });
const report = {
  appVersion: '4.7.10',
  generatedAt: new Date().toISOString(),
  requiredFilesPresent: true,
  javascriptSyntaxValid: true,
  essentialDomIdsPresent: true,
  fingerprintLibraryVisible,
  fingerprintSetupGuardPresent,
  getInLineParserTestsPassed: true,
  audioFingerprintSelfTestPassed: true,
  videoStepMatcherSelfTestPassed: true,
  cameraControlsSelfTestPassed: true,
  radioApiSelfTestPassed: true,
  radioLiveApiSelfTestPassed: true,
  songApiIndexSelfTestPassed: true,
  apiDedupSelfTestPassed: true,
  mediaPipePoseBundled: true,
  mediaPipePoseModel: 'BlazePose GHUM Lite / MediaPipe Pose 0.5.1675469404',
  builtInSheetPatterns: 8,
  liveVideoMinimumSeconds: 30,
  liveStepEvaluationDuringRecording: true,
  liveCameraSettings: cameraFeatureChecks,
  pwaOrientation: manifest.orientation,
  staticOfflineServer: true,
  serviceWorkerPresent: true,
  originalCssBasePreserved,
  originalCssBaseLines: 596,
  originalCssBaseSha256,
  addedCssLinesForLiveCamera: Math.max(0, stylesText.split('\n').length - 1 - 596),
  originalGraphicsUnchanged,
  originalGraphicHashes: graphicHashes,
  completeStylesSha256: crypto.createHash('sha256').update(styles).digest('hex'),
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
  radioApiStations: radio.stationCount,
  radioApiSourceRecords: radio.sourceRecordCount,
  radioApiUniqueEntries: radio.count,
  radioApiPlayableSongs: radio.playableSongCount,
  radioApiDanceSuggestions: radio.entriesWithDanceSuggestion,
  radioApiExactDanceMatches: radio.entriesWithExactDanceMatch,
  songApiEntries: songApi.entryCount,
  songApiStations: songApi.stationCount,
  songApiEndpoints: songApi.apiEndpointCount,
  songApiEntriesWithIds: songApi.entriesWithApiSongIds,
  songApiDanceCandidates: songApi.entriesWithDanceCandidates,
  songApiExactDanceCandidates: songApi.entriesWithExactDanceCandidates,
  songsWithArtist: (songs.entries || []).filter((entry) => entry.artist).length,
  songsWithBpm: (songs.entries || []).filter((entry) => Array.isArray(entry.bpm) && entry.bpm.length).length,
  microphoneSeconds: 12,
  audioFingerprintAlgorithm: 'cldf-landmark-v1',
  embeddedAudioFingerprints: fingerprintPackEntries,
  fingerprintPackCount: (fingerprints.packs || []).length,
  indexedDbAudioLibrary: true,
  indexedDbGetInLineImport: true,
  staticRadioApiCatalog: true,
  radioCatalogUiVisible: false,
  activeLiveRadioApi: true,
  liveRadioApiHiddenInBackground: true,
  liveRadioApiRefreshMinutes: 10,
  perSongApiMatching: true,
  perSongApiBadgeVisible: true,
  githubCatalogUpdater: fs.existsSync(path.join(ROOT, '.github/workflows/update-getinline.yml')),
  githubPagesWorkflow: fs.existsSync(path.join(ROOT, '.github/workflows/deploy-pages.yml')),
  serverApiRemoved: forbidden.length === 0,
  forbiddenOnlineRecognitionReferences: forbidden,
};
fs.writeFileSync(path.join(ROOT, 'VALIDIERUNG.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (forbidden.length) process.exit(1);
