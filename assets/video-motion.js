'use strict';

(() => {
  const DEFAULTS = {
    width: 96,
    height: 54,
    maxSeconds: 18,
    maxFrames: 64,
    minFrames: 20,
    diffThreshold: 18,
  };

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, digits = 3) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function mean(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function standardDeviation(values, average = mean(values)) {
    if (!values.length) return 0;
    return Math.sqrt(values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / values.length);
  }

  function normalizeSequence(values) {
    if (!values.length) return [];
    const average = mean(values);
    const deviation = standardDeviation(values, average) || 1;
    return values.map((value) => round((value - average) / deviation));
  }

  function minMaxSequence(values) {
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map((value) => round((value - min) / range));
  }

  function resample(values, targetLength) {
    if (!values.length || targetLength <= 0) return [];
    if (values.length === 1) return Array(targetLength).fill(round(values[0]));
    const result = [];
    for (let index = 0; index < targetLength; index += 1) {
      const position = (index / Math.max(1, targetLength - 1)) * (values.length - 1);
      const left = Math.floor(position);
      const right = Math.min(values.length - 1, Math.ceil(position));
      const fraction = position - left;
      result.push(round(values[left] * (1 - fraction) + values[right] * fraction));
    }
    return result;
  }

  function waitForMediaEvent(media, eventName, timeout = 12000) {
    return new Promise((resolve, reject) => {
      let timer = null;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        media.removeEventListener(eventName, success);
        media.removeEventListener('error', failure);
      };
      const success = () => {
        cleanup();
        resolve();
      };
      const failure = () => {
        cleanup();
        reject(new Error('Videodatei konnte nicht gelesen werden.'));
      };
      media.addEventListener(eventName, success, { once: true });
      media.addEventListener('error', failure, { once: true });
      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Zeitüberschreitung beim Lesen des Videos (${eventName}).`));
      }, timeout);
    });
  }

  async function seekVideo(video, time) {
    const bounded = clamp(time, 0, Math.max(0, video.duration - 0.03));
    if (Math.abs(video.currentTime - bounded) < 0.02 && video.readyState >= 2) return;
    const promise = waitForMediaEvent(video, 'seeked', 8000);
    video.currentTime = bounded;
    await promise;
  }

  function frameFeatures(imageData, previousGray, width, height, diffThreshold) {
    const pixels = imageData.data;
    const gray = new Uint8Array(width * height);
    let brightness = 0;
    let changed = 0;
    let weightedX = 0;
    let weightedY = 0;
    let weightTotal = 0;
    let left = 0;
    let right = 0;
    let top = 0;
    let bottom = 0;

    for (let index = 0; index < gray.length; index += 1) {
      const offset = index * 4;
      const value = Math.round((pixels[offset] * 0.299) + (pixels[offset + 1] * 0.587) + (pixels[offset + 2] * 0.114));
      gray[index] = value;
      brightness += value;
      if (!previousGray) continue;
      const difference = Math.abs(value - previousGray[index]);
      if (difference < diffThreshold) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      const weight = difference / 255;
      changed += 1;
      weightTotal += weight;
      weightedX += (x / Math.max(1, width - 1)) * weight;
      weightedY += (y / Math.max(1, height - 1)) * weight;
      if (x < width / 2) left += weight;
      else right += weight;
      if (y < height / 2) top += weight;
      else bottom += weight;
    }

    const pixelCount = gray.length || 1;
    const centerX = weightTotal ? weightedX / weightTotal : 0.5;
    const centerY = weightTotal ? weightedY / weightTotal : 0.5;
    return {
      gray,
      brightness: brightness / pixelCount / 255,
      energy: changed / pixelCount,
      centerX,
      centerY,
      horizontalBalance: weightTotal ? (right - left) / weightTotal : 0,
      verticalBalance: weightTotal ? (bottom - top) / weightTotal : 0,
    };
  }

  function estimateCadence(energy, sampleRate) {
    if (energy.length < 12 || !Number.isFinite(sampleRate) || sampleRate <= 0) return { bpm: null, confidence: 0, alternatives: [] };
    const centered = normalizeSequence(energy);
    const candidates = [];
    const minLag = Math.max(2, Math.floor((60 * sampleRate) / 220));
    const maxLag = Math.min(centered.length - 3, Math.ceil((60 * sampleRate) / 45));
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let score = 0;
      let normA = 0;
      let normB = 0;
      for (let index = 0; index + lag < centered.length; index += 1) {
        const a = centered[index];
        const b = centered[index + lag];
        score += a * b;
        normA += a * a;
        normB += b * b;
      }
      const correlation = score / Math.sqrt((normA || 1) * (normB || 1));
      const bpm = (60 * sampleRate) / lag;
      if (bpm >= 45 && bpm <= 220) candidates.push({ bpm, score: correlation });
    }
    candidates.sort((left, right) => right.score - left.score);
    const distinct = [];
    for (const candidate of candidates) {
      const bpm = Math.round(candidate.bpm);
      if (!distinct.some((item) => Math.abs(item.bpm - bpm) < 5)) distinct.push({ bpm, score: candidate.score });
      if (distinct.length >= 5) break;
    }
    const best = distinct[0];
    if (!best || best.score < 0.12) return { bpm: null, confidence: 0, alternatives: distinct.map((item) => item.bpm) };
    return {
      bpm: best.bpm,
      confidence: clamp((best.score - (distinct[1]?.score || 0)) * 2.4 + best.score * 0.55),
      alternatives: distinct.map((item) => item.bpm),
    };
  }

  function countDirectionChanges(values, threshold = 0.025) {
    if (values.length < 3) return 0;
    let lastSign = 0;
    let changes = 0;
    for (let index = 1; index < values.length; index += 1) {
      const delta = values[index] - values[index - 1];
      if (Math.abs(delta) < threshold) continue;
      const sign = Math.sign(delta);
      if (lastSign && sign !== lastSign) changes += 1;
      lastSign = sign;
    }
    return changes;
  }

  function createSignature(raw, metadata = {}) {
    const length = 48;
    const energy = resample(normalizeSequence(raw.energy), length);
    const centerX = resample(normalizeSequence(raw.centerX), length);
    const centerY = resample(normalizeSequence(raw.centerY), length);
    const horizontalBalance = resample(normalizeSequence(raw.horizontalBalance), length);
    const verticalBalance = resample(normalizeSequence(raw.verticalBalance), length);
    const cadence = estimateCadence(raw.energy, raw.sampleRate);
    const averageEnergy = mean(raw.energy);
    const energyVariation = standardDeviation(raw.energy, averageEnergy);
    const xRange = raw.centerX.length ? Math.max(...raw.centerX) - Math.min(...raw.centerX) : 0;
    const yRange = raw.centerY.length ? Math.max(...raw.centerY) - Math.min(...raw.centerY) : 0;
    const directionChanges = countDirectionChanges(raw.centerX);
    const activity = clamp((averageEnergy - 0.008) / 0.12);
    const lighting = clamp((mean(raw.brightness) - 0.06) / 0.28);
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      duration: round(metadata.duration || 0, 2),
      sampledSeconds: round(metadata.sampledSeconds || 0, 2),
      frameCount: raw.energy.length,
      sampleRate: round(raw.sampleRate || 0, 3),
      width: metadata.width,
      height: metadata.height,
      energy,
      centerX,
      centerY,
      horizontalBalance,
      verticalBalance,
      cadenceBpm: cadence.bpm,
      cadenceConfidence: round(cadence.confidence),
      cadenceAlternatives: cadence.alternatives,
      averageEnergy: round(averageEnergy),
      energyVariation: round(energyVariation),
      horizontalRange: round(xRange),
      verticalRange: round(yRange),
      directionChanges,
      activity: round(activity),
      lighting: round(lighting),
      quality: round(clamp((raw.energy.length / DEFAULTS.minFrames) * 0.4 + activity * 0.35 + lighting * 0.25)),
    };
  }

  async function analyzeVideo(file, options = {}) {
    if (!file) throw new Error('Keine Videodatei ausgewählt.');
    const config = { ...DEFAULTS, ...options };
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = true;
    video.src = url;
    video.style.cssText = 'position:fixed;width:2px;height:2px;opacity:.001;pointer-events:none;left:-10px;top:-10px';
    document.body.appendChild(video);
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    try {
      if (!context) throw new Error('Videoanalyse wird von diesem Browser nicht unterstützt.');
      onProgress(2, 'Videodaten werden geöffnet');
      await waitForMediaEvent(video, 'loadedmetadata', 15000);
      if (video.readyState < 2) await waitForMediaEvent(video, 'loadeddata', 15000);
      if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Videodauer konnte nicht bestimmt werden.');
      const sampledSeconds = Math.min(config.maxSeconds, video.duration);
      const start = Math.max(0, (video.duration - sampledSeconds) / 2);
      const frameCount = Math.max(config.minFrames, Math.min(config.maxFrames, Math.round(sampledSeconds * 4)));
      const times = Array.from({ length: frameCount }, (_, index) => start + ((sampledSeconds * index) / Math.max(1, frameCount - 1)));
      const raw = {
        energy: [],
        centerX: [],
        centerY: [],
        horizontalBalance: [],
        verticalBalance: [],
        brightness: [],
        sampleRate: frameCount / Math.max(0.1, sampledSeconds),
      };
      let previousGray = null;
      for (let index = 0; index < times.length; index += 1) {
        await seekVideo(video, times[index]);
        context.drawImage(video, 0, 0, config.width, config.height);
        const features = frameFeatures(context.getImageData(0, 0, config.width, config.height), previousGray, config.width, config.height, config.diffThreshold);
        previousGray = features.gray;
        if (index > 0) {
          raw.energy.push(features.energy);
          raw.centerX.push(features.centerX);
          raw.centerY.push(features.centerY);
          raw.horizontalBalance.push(features.horizontalBalance);
          raw.verticalBalance.push(features.verticalBalance);
          raw.brightness.push(features.brightness);
        }
        onProgress(5 + ((index + 1) / times.length) * 90, `Bewegungsbild ${index + 1} von ${times.length}`);
      }
      if (raw.energy.length < Math.max(8, config.minFrames / 2)) throw new Error('Zu wenige auswertbare Videobilder.');
      const signature = createSignature(raw, {
        duration: video.duration,
        sampledSeconds,
        width: config.width,
        height: config.height,
      });
      onProgress(100, 'Bewegungsanalyse abgeschlossen');
      return signature;
    } finally {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
    }
  }

  function pearson(left, right) {
    const length = Math.min(left?.length || 0, right?.length || 0);
    if (length < 4) return 0;
    const a = left.slice(0, length);
    const b = right.slice(0, length);
    const meanA = mean(a);
    const meanB = mean(b);
    let numerator = 0;
    let normA = 0;
    let normB = 0;
    for (let index = 0; index < length; index += 1) {
      const deltaA = a[index] - meanA;
      const deltaB = b[index] - meanB;
      numerator += deltaA * deltaB;
      normA += deltaA * deltaA;
      normB += deltaB * deltaB;
    }
    return numerator / Math.sqrt((normA || 1) * (normB || 1));
  }

  function shiftedCorrelation(left, right, maxShift = 8) {
    const length = Math.min(left?.length || 0, right?.length || 0);
    if (length < 8) return 0;
    let best = -1;
    for (let shift = -maxShift; shift <= maxShift; shift += 1) {
      const shifted = [];
      for (let index = 0; index < length; index += 1) shifted.push(right[(index + shift + length) % length]);
      best = Math.max(best, pearson(left.slice(0, length), shifted));
    }
    return clamp((best + 1) / 2);
  }

  function cadenceSimilarity(left, right) {
    const a = Number(left);
    const b = Number(right);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return 0.5;
    const distances = [Math.abs(a - b), Math.abs(a * 2 - b), Math.abs(a / 2 - b)];
    return clamp(1 - Math.min(...distances) / 28);
  }

  function scalarSimilarity(left, right, tolerance) {
    if (!Number.isFinite(left) || !Number.isFinite(right)) return 0.5;
    return clamp(1 - Math.abs(left - right) / tolerance);
  }

  function compareSignatures(query, reference) {
    if (!query || !reference) return { score: 0, confidence: 0, details: {} };
    const energy = shiftedCorrelation(query.energy, reference.energy, 10);
    const horizontal = shiftedCorrelation(query.centerX, reference.centerX, 10);
    const vertical = shiftedCorrelation(query.centerY, reference.centerY, 10);
    const balance = (shiftedCorrelation(query.horizontalBalance, reference.horizontalBalance, 10) + shiftedCorrelation(query.verticalBalance, reference.verticalBalance, 10)) / 2;
    const cadence = cadenceSimilarity(query.cadenceBpm, reference.cadenceBpm);
    const activity = scalarSimilarity(query.activity, reference.activity, 0.55);
    const direction = scalarSimilarity(query.directionChanges, reference.directionChanges, 18);
    const quality = Math.min(query.quality || 0, reference.quality || 0);
    const weighted = (energy * 0.36) + (horizontal * 0.18) + (vertical * 0.10) + (balance * 0.10) + (cadence * 0.14) + (activity * 0.07) + (direction * 0.05);
    const adjusted = weighted * (0.72 + quality * 0.28);
    return {
      score: Math.round(clamp(adjusted) * 100),
      confidence: round(clamp((adjusted - 0.42) / 0.45)),
      details: {
        energy: Math.round(energy * 100),
        horizontal: Math.round(horizontal * 100),
        vertical: Math.round(vertical * 100),
        cadence: Math.round(cadence * 100),
        activity: Math.round(activity * 100),
        quality: Math.round(quality * 100),
      },
    };
  }

  function rankReferences(query, references = []) {
    return references
      .filter((reference) => reference?.signature)
      .map((reference) => ({ reference, ...compareSignatures(query, reference.signature) }))
      .sort((left, right) => right.score - left.score || right.confidence - left.confidence);
  }

  function describeSignature(signature) {
    if (!signature) return [];
    const activity = signature.activity >= 0.68 ? 'viel Bewegung' : signature.activity >= 0.32 ? 'mittlere Bewegung' : 'wenig Bewegung';
    const direction = signature.directionChanges >= 14 ? 'viele Richtungswechsel' : signature.directionChanges >= 7 ? 'einige Richtungswechsel' : 'wenige Richtungswechsel';
    const lighting = signature.lighting >= 0.55 ? 'gutes Licht' : signature.lighting >= 0.25 ? 'mäßiges Licht' : 'wenig Licht';
    return [activity, direction, lighting, signature.cadenceBpm ? `Bewegungstempo ca. ${signature.cadenceBpm} BPM` : 'Bewegungstempo offen'];
  }

  window.CLDFVideoMotion = {
    version: '1.0.0-beta',
    analyzeVideo,
    compareSignatures,
    rankReferences,
    describeSignature,
  };
})();
