#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'assets/video-motion.js'));
const VM = global.window.CLDFVideoMotion;
assert.equal(typeof VM.assessPoseResults, 'function', 'Ganzkörperprüfung fehlt.');

const points = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.95 }));
Object.assign(points[0], { x: 0.5, y: 0.08 });
Object.assign(points[11], { x: 0.42, y: 0.22 });
Object.assign(points[12], { x: 0.58, y: 0.22 });
Object.assign(points[23], { x: 0.45, y: 0.50 });
Object.assign(points[24], { x: 0.55, y: 0.50 });
Object.assign(points[25], { x: 0.45, y: 0.68 });
Object.assign(points[26], { x: 0.55, y: 0.68 });
Object.assign(points[27], { x: 0.45, y: 0.88 });
Object.assign(points[28], { x: 0.55, y: 0.88 });
Object.assign(points[29], { x: 0.44, y: 0.90 });
Object.assign(points[30], { x: 0.56, y: 0.90 });
Object.assign(points[31], { x: 0.43, y: 0.92 });
Object.assign(points[32], { x: 0.57, y: 0.92 });

const good = VM.assessPoseResults({ poseLandmarks: points });
assert.equal(good.ready, true, 'Vollständige Person wird nicht als bereit erkannt.');

for (const index of [27, 28, 29, 30, 31, 32]) points[index].visibility = 0;
const missingFeet = VM.assessPoseResults({ poseLandmarks: points });
assert.equal(missingFeet.ready, false, 'Fehlende Füße werden nicht erkannt.');
assert.match(missingFeet.message, /Füße fehlen/i);

const app = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
for (const expected of ['liveCameraSelect', 'liveOrientationSelect', 'getCapabilities', 'applyConstraints', "resizeMode: { ideal: 'none' }"]) {
  assert.ok(app.includes(expected), `Kamerafunktion fehlt: ${expected}`);
}
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.orientation, 'any', 'Querformat ist im Manifest nicht erlaubt.');
console.log('Kameraauswahl, Zoom, Format und Ganzkörperprüfung: OK');
