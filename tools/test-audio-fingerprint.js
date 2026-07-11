#!/usr/bin/env node
'use strict';

global.window = {};
require('../assets/audio-engine.js');
const AUDIO = global.window.CLDFAudioEngine;

function audioBuffer(samples, sampleRate = 11025) {
  return {
    length: samples.length,
    sampleRate,
    numberOfChannels: 1,
    duration: samples.length / sampleRate,
    getChannelData() { return samples; },
  };
}

function syntheticSong(seed, seconds = 50, sampleRate = 11025) {
  const samples = new Float32Array(Math.floor(seconds * sampleRate));
  const frequencies = [220 + seed * 3, 330 + seed * 7, 440 + seed * 11, 550 + seed * 13, 660 + seed * 17];
  for (let i = 0; i < samples.length; i += 1) {
    const time = i / sampleRate;
    const section = Math.floor(time / 2) % frequencies.length;
    const frequency = frequencies[section];
    const beat = Math.sin(2 * Math.PI * 2 * time) > 0.75 ? 1 : 0.35;
    samples[i] = 0.35 * Math.sin(2 * Math.PI * frequency * time) * beat
      + 0.22 * Math.sin(2 * Math.PI * frequency * 1.5 * time)
      + 0.12 * Math.sin(2 * Math.PI * frequencies[(section + 2) % frequencies.length] * time);
  }
  return samples;
}

(async () => {
  const first = syntheticSong(1);
  const second = syntheticSong(8);
  const referenceOne = await AUDIO.extractFingerprint(audioBuffer(first));
  const referenceTwo = await AUDIO.extractFingerprint(audioBuffer(second));
  const start = Math.floor(17 * 11025);
  const querySamples = new Float32Array(first.slice(start, start + Math.floor(12 * 11025)));
  for (let i = 0; i < querySamples.length; i += 1) querySamples[i] = querySamples[i] * 0.48 + Math.sin(i * 0.137) * 0.002;
  const query = await AUDIO.extractFingerprint(audioBuffer(querySamples), { maxSeconds: 12 });
  const match = await AUDIO.matchFingerprint(query, [
    { id: 'song-one', title: 'Song One', algorithm: referenceOne.algorithm, hashes: referenceOne.hashes, times: referenceOne.times },
    { id: 'song-two', title: 'Song Two', algorithm: referenceTwo.algorithm, hashes: referenceTwo.hashes, times: referenceTwo.times },
  ]);
  if (!match?.accepted || match.entry.id !== 'song-one') throw new Error('Audio-Fingerprint-Selbsttest fehlgeschlagen.');
  console.log(`Audio-Fingerprint-Selbsttest bestanden (${match.votes} Stimmen, ${match.confidence}% Sicherheit).`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
