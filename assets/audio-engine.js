'use strict';

window.CLDFAudioEngine = (() => {
  const TARGET_RATE = 11025;
  const FFT_SIZE = 2048;
  const HOP_SIZE = 2048;
  const MIN_FREQ = 180;
  const MAX_FREQ = 5000;
  const PEAK_BANDS = [180, 320, 520, 820, 1250, 1900, 2850, 4000, 5000];
  const TARGET_DELTAS = [1, 2, 3];

  async function decodeBlob(blob) {
    if (!blob) throw new Error('Keine Audiodaten vorhanden.');
    const buffer = await blob.arrayBuffer();
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('Audioanalyse wird von diesem Browser nicht unterstützt.');
    const context = new Context();
    try {
      return await context.decodeAudioData(buffer.slice(0));
    } finally {
      await context.close().catch(() => {});
    }
  }

  function monoSamples(audioBuffer, maxSeconds = Infinity) {
    const length = Math.min(audioBuffer.length, Math.floor(audioBuffer.sampleRate * maxSeconds));
    const output = new Float32Array(length);
    const channels = Math.max(1, audioBuffer.numberOfChannels);
    for (let channel = 0; channel < channels; channel += 1) {
      const data = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) output[i] += (data[i] || 0) / channels;
    }
    return output;
  }

  function normalizeSamples(samples) {
    let max = 0;
    for (let i = 0; i < samples.length; i += 1) max = Math.max(max, Math.abs(samples[i]));
    if (max < 1e-7) return samples;
    const output = new Float32Array(samples.length);
    const gain = 1 / max;
    for (let i = 0; i < samples.length; i += 1) output[i] = samples[i] * gain;
    return output;
  }

  function resampleLinear(samples, sourceRate, targetRate = TARGET_RATE) {
    if (sourceRate === targetRate) return samples;
    const ratio = sourceRate / targetRate;
    const outputLength = Math.max(1, Math.floor(samples.length / ratio));
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i += 1) {
      const position = i * ratio;
      const left = Math.floor(position);
      const fraction = position - left;
      const a = samples[left] || 0;
      const b = samples[Math.min(samples.length - 1, left + 1)] || a;
      output[i] = a + (b - a) * fraction;
    }
    return output;
  }

  function energyEnvelope(samples, sampleRate) {
    const hop = Math.max(128, Math.round(sampleRate / 100));
    const windowSize = hop * 2;
    const count = Math.max(0, Math.floor((samples.length - windowSize) / hop));
    const envelope = new Float32Array(count);
    for (let frame = 0; frame < count; frame += 1) {
      const start = frame * hop;
      let sum = 0;
      for (let i = 0; i < windowSize; i += 1) {
        const sample = samples[start + i] || 0;
        sum += sample * sample;
      }
      envelope[frame] = Math.sqrt(sum / windowSize);
    }
    let mean = 0;
    for (const value of envelope) mean += value;
    mean /= Math.max(1, envelope.length);
    const onset = new Float32Array(envelope.length);
    for (let i = 1; i < envelope.length; i += 1) onset[i] = Math.max(0, envelope[i] - envelope[i - 1] - mean * 0.015);
    return { onset, rate: sampleRate / hop };
  }

  function estimateTempo(audioBuffer) {
    const samples = normalizeSamples(monoSamples(audioBuffer, 30));
    const { onset, rate } = energyEnvelope(samples, audioBuffer.sampleRate);
    if (onset.length < 200) return { bpm: NaN, confidence: 0, possibleBpms: [] };
    let onsetMean = 0;
    for (const value of onset) onsetMean += value;
    onsetMean /= onset.length;
    const candidates = [];
    for (let bpm = 55; bpm <= 220; bpm += 1) {
      const lag = Math.round((60 * rate) / bpm);
      if (lag < 2 || lag >= onset.length) continue;
      let score = 0;
      let normA = 0;
      let normB = 0;
      for (let i = lag; i < onset.length; i += 1) {
        const a = onset[i] - onsetMean;
        const b = onset[i - lag] - onsetMean;
        score += a * b;
        normA += a * a;
        normB += b * b;
      }
      score /= Math.sqrt(normA * normB) || 1;
      candidates.push({ bpm, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    const distinct = [];
    for (const item of candidates) {
      if (!distinct.some((other) => Math.abs(other.bpm - item.bpm) < 4 || Math.abs(other.bpm - item.bpm * 2) < 4 || Math.abs(other.bpm * 2 - item.bpm) < 4)) distinct.push(item);
      if (distinct.length >= 8) break;
    }
    const best = distinct[0] || { bpm: NaN, score: 0 };
    const possible = new Set();
    for (const item of distinct.slice(0, 4)) {
      [item.bpm, item.bpm / 2, item.bpm * 2].forEach((value) => {
        const rounded = Math.round(value);
        if (rounded >= 55 && rounded <= 220) possible.add(rounded);
      });
    }
    return {
      bpm: best.score >= 0.04 ? best.bpm : NaN,
      confidence: Math.max(0, Math.min(1, (best.score - 0.015) * 6.5)),
      possibleBpms: [...possible].sort((a, b) => Math.abs(a - best.bpm) - Math.abs(b - best.bpm)).slice(0, 8),
    };
  }

  function reverseBits(value, bits) {
    let result = 0;
    for (let i = 0; i < bits; i += 1) {
      result = (result << 1) | (value & 1);
      value >>>= 1;
    }
    return result;
  }

  function fftMagnitudes(frame) {
    const n = frame.length;
    const bits = Math.log2(n);
    const real = new Float64Array(n);
    const imag = new Float64Array(n);
    for (let i = 0; i < n; i += 1) {
      const j = reverseBits(i, bits);
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      real[j] = frame[i] * hann;
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >>> 1;
      const theta = -2 * Math.PI / size;
      const stepReal = Math.cos(theta);
      const stepImag = Math.sin(theta);
      for (let start = 0; start < n; start += size) {
        let wr = 1;
        let wi = 0;
        for (let offset = 0; offset < half; offset += 1) {
          const even = start + offset;
          const odd = even + half;
          const tr = wr * real[odd] - wi * imag[odd];
          const ti = wr * imag[odd] + wi * real[odd];
          real[odd] = real[even] - tr;
          imag[odd] = imag[even] - ti;
          real[even] += tr;
          imag[even] += ti;
          const nextWr = wr * stepReal - wi * stepImag;
          wi = wr * stepImag + wi * stepReal;
          wr = nextWr;
        }
      }
    }
    const magnitudes = new Float32Array(n >>> 1);
    for (let i = 0; i < magnitudes.length; i += 1) magnitudes[i] = Math.log1p(real[i] * real[i] + imag[i] * imag[i]);
    return magnitudes;
  }

  function strongestPeaks(magnitudes, sampleRate) {
    const peaks = [];
    for (let band = 0; band < PEAK_BANDS.length - 1; band += 1) {
      const low = Math.max(1, Math.ceil((PEAK_BANDS[band] * FFT_SIZE) / sampleRate));
      const high = Math.min(magnitudes.length - 2, Math.floor((PEAK_BANDS[band + 1] * FFT_SIZE) / sampleRate));
      let bestBin = -1;
      let bestValue = 0;
      for (let bin = low; bin <= high; bin += 1) {
        const value = magnitudes[bin];
        if (value > bestValue && value >= magnitudes[bin - 1] && value >= magnitudes[bin + 1]) {
          bestValue = value;
          bestBin = bin;
        }
      }
      if (bestBin >= 0) peaks.push({ bin: bestBin, value: bestValue });
    }
    peaks.sort((a, b) => b.value - a.value);
    const strongest = peaks[0]?.value || 0;
    if (strongest < 0.08) return [];
    return peaks.filter((peak) => peak.value >= strongest * 0.34).slice(0, 3);
  }

  function packHash(anchorBin, targetBin, delta) {
    const a = Math.max(0, Math.min(255, Math.round(anchorBin / 4)));
    const b = Math.max(0, Math.min(255, Math.round(targetBin / 4)));
    return (a | (b << 8) | ((delta & 15) << 16)) >>> 0;
  }

  async function extractFingerprint(audioBuffer, options = {}) {
    const maxSeconds = Number.isFinite(options.maxSeconds) ? options.maxSeconds : 8 * 60;
    const source = monoSamples(audioBuffer, maxSeconds);
    const normalized = normalizeSamples(source);
    const samples = resampleLinear(normalized, audioBuffer.sampleRate, TARGET_RATE);
    const frameCount = Math.max(0, Math.floor((samples.length - FFT_SIZE) / HOP_SIZE) + 1);
    if (frameCount < 8) throw new Error('Die Aufnahme ist zu kurz für einen Audio-Fingerprint.');
    const peaksByFrame = new Array(frameCount);
    const frame = new Float32Array(FFT_SIZE);
    for (let index = 0; index < frameCount; index += 1) {
      const start = index * HOP_SIZE;
      frame.set(samples.subarray(start, start + FFT_SIZE));
      peaksByFrame[index] = strongestPeaks(fftMagnitudes(frame), TARGET_RATE);
      if (options.onProgress && (index % 8 === 0 || index === frameCount - 1)) {
        options.onProgress(Math.round((index / Math.max(1, frameCount - 1)) * 72), 'Frequenzmerkmale werden berechnet.');
      }
      if (index % 24 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const hashes = [];
    const times = [];
    for (let frameIndex = 0; frameIndex < peaksByFrame.length; frameIndex += 1) {
      const anchors = peaksByFrame[frameIndex];
      if (!anchors?.length) continue;
      for (const delta of TARGET_DELTAS) {
        const targetFrame = peaksByFrame[frameIndex + delta];
        if (!targetFrame?.length) continue;
        for (let anchorIndex = 0; anchorIndex < anchors.length; anchorIndex += 1) {
          const targetLimit = Math.max(1, 3 - anchorIndex);
          for (let targetIndex = 0; targetIndex < Math.min(targetLimit, targetFrame.length); targetIndex += 1) {
            hashes.push(packHash(anchors[anchorIndex].bin, targetFrame[targetIndex].bin, delta));
            times.push(frameIndex);
          }
        }
      }
      if (options.onProgress && frameIndex % 30 === 0) options.onProgress(72 + Math.round((frameIndex / peaksByFrame.length) * 26), 'Audio-Fingerabdruck wird verdichtet.');
    }

    if (hashes.length < 30) throw new Error('Zu wenig deutliche Musikmerkmale. Bitte eine lautere oder längere Aufnahme verwenden.');
    options.onProgress?.(100, 'Audio-Fingerabdruck fertig.');
    const tempo = estimateTempo(audioBuffer);
    return {
      algorithm: 'cldf-landmark-v1',
      sampleRate: TARGET_RATE,
      frameSize: FFT_SIZE,
      hopSize: HOP_SIZE,
      duration: Number(Math.min(audioBuffer.duration, maxSeconds).toFixed(2)),
      bpm: Number.isFinite(tempo.bpm) ? Math.round(tempo.bpm) : null,
      hashes: Uint32Array.from(hashes),
      times: Uint16Array.from(times),
      frameCount,
    };
  }

  function hydrateEntry(entry) {
    return {
      ...entry,
      hashes: entry.hashes instanceof Uint32Array ? entry.hashes : Uint32Array.from(entry.hashes || []),
      times: entry.times instanceof Uint16Array ? entry.times : Uint16Array.from(entry.times || []),
    };
  }

  async function matchFingerprint(query, entries, options = {}) {
    if (!query?.hashes?.length) return null;
    const queryHashes = query.hashes instanceof Uint32Array ? query.hashes : Uint32Array.from(query.hashes || []);
    const queryTimes = query.times instanceof Uint16Array ? query.times : Uint16Array.from(query.times || []);
    const queryMap = new Map();
    for (let i = 0; i < queryHashes.length; i += 1) {
      const hash = queryHashes[i];
      if (!queryMap.has(hash)) queryMap.set(hash, []);
      const values = queryMap.get(hash);
      if (values.length < 4) values.push(queryTimes[i]);
    }

    const ranked = [];
    const list = (entries || []).filter((entry) => entry?.algorithm === 'cldf-landmark-v1' && entry.hashes?.length);
    for (let entryIndex = 0; entryIndex < list.length; entryIndex += 1) {
      const entry = hydrateEntry(list[entryIndex]);
      const offsets = new Map();
      let rawHashHits = 0;
      for (let i = 0; i < entry.hashes.length; i += 1) {
        const queryOccurrences = queryMap.get(entry.hashes[i]);
        if (!queryOccurrences) continue;
        rawHashHits += 1;
        const referenceTime = entry.times[i];
        for (const queryTime of queryOccurrences) {
          const offset = referenceTime - queryTime;
          offsets.set(offset, (offsets.get(offset) || 0) + 1);
        }
      }
      let bestVotes = 0;
      let bestOffset = 0;
      for (const [offset, votes] of offsets) {
        if (votes > bestVotes) {
          bestVotes = votes;
          bestOffset = offset;
        }
      }
      if (bestVotes) {
        const coverage = bestVotes / Math.max(1, queryHashes.length);
        const score = Math.min(100, Math.round(coverage * 360 + Math.log2(bestVotes + 1) * 8));
        ranked.push({ entry, votes: bestVotes, rawHashHits, offset: bestOffset, coverage, score });
      }
      if (options.onProgress && (entryIndex % 5 === 0 || entryIndex === list.length - 1)) {
        options.onProgress(Math.round(((entryIndex + 1) / Math.max(1, list.length)) * 100));
      }
      if (entryIndex % 12 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    ranked.sort((a, b) => b.votes - a.votes || b.coverage - a.coverage || b.rawHashHits - a.rawHashHits);
    const best = ranked[0] || null;
    const second = ranked[1] || null;
    if (!best) return null;
    const separation = best.votes - (second?.votes || 0);
    const minimumVotes = Math.max(8, Math.round(queryHashes.length * 0.012));
    const accepted = best.votes >= minimumVotes && (separation >= 3 || best.votes >= (second?.votes || 0) * 1.28 || best.votes >= 24);
    const confidence = accepted
      ? Math.min(99, Math.max(65, Math.round(best.score * 0.75 + Math.min(25, separation * 2))))
      : Math.min(64, best.score);
    return { ...best, second, separation, accepted, confidence, ranked: ranked.slice(0, 5) };
  }

  return {
    decodeBlob,
    estimateTempo,
    extractFingerprint,
    matchFingerprint,
    constants: { targetRate: TARGET_RATE, fftSize: FFT_SIZE, hopSize: HOP_SIZE },
  };
})();
