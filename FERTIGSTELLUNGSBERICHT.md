#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const context = {
  console,
  URL,
  performance: { now: () => Date.now() },
  DOMException,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  window: {},
  document: { baseURI: 'https://example.test/app/' },
};
context.window.window = context.window;
context.window.document = context.document;
context.window.URL = URL;
context.window.performance = context.performance;
context.window.setTimeout = setTimeout;
context.window.clearTimeout = clearTimeout;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/step-sheet-patterns.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/video-motion.js'), 'utf8'), context);

const engine = context.window.CLDFVideoMotion;
const patterns = context.window.CLDF_STEP_SHEET_PATTERNS?.patterns || [];
if (!engine || typeof engine.rankSheetPatterns !== 'function') throw new Error('Sheet-Matcher nicht geladen.');
if (patterns.length !== 8) throw new Error(`Unerwartete Anzahl Startermuster: ${patterns.length}`);

const expansions = {
  VINE_R: ['SIDE_R', 'CROSS_L_BEHIND', 'SIDE_R'],
  VINE_L: ['SIDE_L', 'CROSS_R_BEHIND', 'SIDE_L'],
  TRIPLE_R: ['STEP_R', 'STEP_L', 'STEP_R'],
  TRIPLE_L: ['STEP_L', 'STEP_R', 'STEP_L'],
  SHUFFLE_FORWARD_R: ['FORWARD_R', 'STEP_L', 'FORWARD_R'],
  SHUFFLE_FORWARD_L: ['FORWARD_L', 'STEP_R', 'FORWARD_L'],
  SHUFFLE_BACK_R: ['BACK_R', 'STEP_L', 'BACK_R'],
  SHUFFLE_BACK_L: ['BACK_L', 'STEP_R', 'BACK_L'],
  ROCK_FORWARD_R: ['FORWARD_R'], ROCK_FORWARD_L: ['FORWARD_L'],
  ROCK_BACK_R: ['BACK_R'], ROCK_BACK_L: ['BACK_L'],
  ROCK_CROSS_R: ['CROSS_R_FRONT'], ROCK_CROSS_L: ['CROSS_L_FRONT'],
  RECOVER_R: ['STEP_R'], RECOVER_L: ['STEP_L'],
  DIAGONAL_FORWARD_R: ['FORWARD_R'], DIAGONAL_FORWARD_L: ['FORWARD_L'],
  DIAGONAL_BACK_R: ['BACK_R'], DIAGONAL_BACK_L: ['BACK_L'],
  TOGETHER_R: ['STEP_R'], TOGETHER_L: ['STEP_L'],
  SCUFF_R: ['KICK_R'], SCUFF_L: ['KICK_L'],
  SLAP_R: ['HITCH_R'], SLAP_L: ['HITCH_L'],
  HIP_BUMP_R: ['HIP_R'], HIP_BUMP_L: ['HIP_L'],
  POINT_R: ['TOUCH_R'], POINT_L: ['TOUCH_L'],
};
const expand = (sequence) => sequence.flatMap((token) => expansions[token] || [token]);
const dances = patterns.map((pattern, index) => ({
  id: pattern.danceId || `test-dance-${index}`,
  title: pattern.title,
}));

const results = [];
for (const pattern of patterns) {
  const signature = {
    version: 2,
    engine: 'mediapipe-pose',
    quality: 0.95,
    turnCount: Number(pattern.walls) === 4 || Number(pattern.walls) === 2 ? 1 : 0,
    stepTokens: expand(pattern.sequence),
  };
  const matches = engine.rankSheetPatterns(signature, patterns, dances);
  if (!matches.length) throw new Error(`Keine Treffer für ${pattern.title}.`);
  if (matches[0].reference.danceTitle !== pattern.title) {
    throw new Error(`Falscher bester Treffer für ${pattern.title}: ${matches[0].reference.danceTitle}`);
  }
  if (matches[0].score < 78) throw new Error(`Testwert für ${pattern.title} zu niedrig: ${matches[0].score}`);
  results.push(`${pattern.title} ${matches[0].score}%`);
}

console.log(`Video-Step-Matcher OK: ${patterns.length} Startermuster (${results.join(', ')})`);
