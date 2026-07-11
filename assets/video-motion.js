'use strict';

(() => {
  const DEFAULTS = {
    maxSeconds: 20,
    maxFrames: 84,
    minPoseFrames: 14,
    liveFrameIntervalMs: 150,
    minVisibility: 0.42,
  };

  const LANDMARK = {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_HEEL: 29,
    RIGHT_HEEL: 30,
    LEFT_FOOT: 31,
    RIGHT_FOOT: 32,
  };

  const GROUP_EXPANSIONS = {
    VINE_R: ['SIDE_R', 'CROSS_L_BEHIND', 'SIDE_R'],
    VINE_L: ['SIDE_L', 'CROSS_R_BEHIND', 'SIDE_L'],
    TRIPLE_R: ['STEP_R', 'STEP_L', 'STEP_R'],
    TRIPLE_L: ['STEP_L', 'STEP_R', 'STEP_L'],
    SHUFFLE_FORWARD_R: ['FORWARD_R', 'STEP_L', 'FORWARD_R'],
    SHUFFLE_FORWARD_L: ['FORWARD_L', 'STEP_R', 'FORWARD_L'],
    SHUFFLE_BACK_R: ['BACK_R', 'STEP_L', 'BACK_R'],
    SHUFFLE_BACK_L: ['BACK_L', 'STEP_R', 'BACK_L'],
    ROCK_FORWARD_R: ['FORWARD_R'],
    ROCK_FORWARD_L: ['FORWARD_L'],
    ROCK_BACK_R: ['BACK_R'],
    ROCK_BACK_L: ['BACK_L'],
    ROCK_CROSS_R: ['CROSS_R_FRONT'],
    ROCK_CROSS_L: ['CROSS_L_FRONT'],
    RECOVER_R: ['STEP_R'],
    RECOVER_L: ['STEP_L'],
    DIAGONAL_FORWARD_R: ['FORWARD_R'],
    DIAGONAL_FORWARD_L: ['FORWARD_L'],
    DIAGONAL_BACK_R: ['BACK_R'],
    DIAGONAL_BACK_L: ['BACK_L'],
    TOGETHER_R: ['STEP_R'],
    TOGETHER_L: ['STEP_L'],
    SCUFF_R: ['KICK_R'],
    SCUFF_L: ['KICK_L'],
    SLAP_R: ['HITCH_R'],
    SLAP_L: ['HITCH_L'],
    HIP_BUMP_R: ['HIP_R'],
    HIP_BUMP_L: ['HIP_L'],
    POINT_R: ['TOUCH_R'],
    POINT_L: ['TOUCH_L'],
  };

  const STEP_LABELS = {
    SIDE_R: 'Schritt rechts', SIDE_L: 'Schritt links',
    FORWARD_R: 'Rechts vor', FORWARD_L: 'Links vor',
    BACK_R: 'Rechts zurück', BACK_L: 'Links zurück',
    CROSS_R_FRONT: 'Rechts vorn kreuzen', CROSS_L_FRONT: 'Links vorn kreuzen',
    CROSS_R_BEHIND: 'Rechts hinten kreuzen', CROSS_L_BEHIND: 'Links hinten kreuzen',
    TOUCH_R: 'Touch rechts', TOUCH_L: 'Touch links',
    KICK_R: 'Kick rechts', KICK_L: 'Kick links',
    HITCH_R: 'Knie rechts', HITCH_L: 'Knie links',
    HEEL_R: 'Ferse rechts', HEEL_L: 'Ferse links',
    TOE_R: 'Spitze rechts', TOE_L: 'Spitze links',
    STOMP_R: 'Stomp rechts', STOMP_L: 'Stomp links',
    HOOK_R: 'Hook rechts', HOOK_L: 'Hook links',
    TURN_QUARTER_R: '¼ Drehung rechts', TURN_QUARTER_L: '¼ Drehung links',
    TURN_HALF_R: '½ Drehung rechts', TURN_HALF_L: '½ Drehung links',
    HIP_R: 'Hüfte rechts', HIP_L: 'Hüfte links',
    STEP_R: 'Schritt rechts', STEP_L: 'Schritt links',
  };

  let pose = null;
  let poseReady = null;
  let resultResolver = null;
  let resultRejecter = null;
  let resultTimer = null;
  let poseChain = Promise.resolve();

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function round(value, digits = 3) {
    const factor = 10 ** digits;
    return Math.round((Number(value) || 0) * factor) / factor;
  }

  function mean(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function standardDeviation(values, average = mean(values)) {
    return values.length ? Math.sqrt(mean(values.map((value) => (value - average) ** 2))) : 0;
  }

  function distance2(a, b) {
    return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
  }

  function distance3(a, b) {
    return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0), (a?.z || 0) - (b?.z || 0));
  }

  function averagePoint(a, b) {
    return {
      x: ((a?.x || 0) + (b?.x || 0)) / 2,
      y: ((a?.y || 0) + (b?.y || 0)) / 2,
      z: ((a?.z || 0) + (b?.z || 0)) / 2,
      visibility: ((a?.visibility ?? 1) + (b?.visibility ?? 1)) / 2,
    };
  }

  function angleAt(a, b, c) {
    const ab = { x: (a?.x || 0) - (b?.x || 0), y: (a?.y || 0) - (b?.y || 0) };
    const cb = { x: (c?.x || 0) - (b?.x || 0), y: (c?.y || 0) - (b?.y || 0) };
    const denominator = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y) || 1;
    return Math.acos(clamp((ab.x * cb.x + ab.y * cb.y) / denominator, -1, 1)) * 180 / Math.PI;
  }

  function normalizeText(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function waitForMediaEvent(media, eventName, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Zeitüberschreitung beim Lesen des Videos (${eventName}).`));
      }, timeout);
      const cleanup = () => {
        clearTimeout(timer);
        media.removeEventListener(eventName, success);
        media.removeEventListener('error', failure);
      };
      const success = () => { cleanup(); resolve(); };
      const failure = () => { cleanup(); reject(new Error('Videodatei konnte nicht gelesen werden.')); };
      media.addEventListener(eventName, success, { once: true });
      media.addEventListener('error', failure, { once: true });
    });
  }

  async function seekVideo(video, time) {
    const bounded = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.04));
    if (Math.abs(video.currentTime - bounded) < 0.015 && video.readyState >= 2) return;
    const promise = waitForMediaEvent(video, 'seeked', 10000);
    video.currentTime = bounded;
    await promise;
  }

  async function ensurePose() {
    if (poseReady) return poseReady;
    poseReady = (async () => {
      if (typeof window.Pose !== 'function') throw new Error('MediaPipe Pose wurde nicht geladen.');
      const base = new URL('./assets/mediapipe/pose/', document.baseURI).href;
      pose = new window.Pose({ locateFile: (file) => `${base}${file}` });
      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.48,
        minTrackingConfidence: 0.48,
      });
      pose.onResults((results) => {
        if (!resultResolver) return;
        clearTimeout(resultTimer);
        const resolve = resultResolver;
        resultResolver = null;
        resultRejecter = null;
        resolve(results || {});
      });
      await pose.initialize();
      return pose;
    })().catch((error) => {
      poseReady = null;
      pose = null;
      throw error;
    });
    return poseReady;
  }

  function inferPose(image) {
    const run = async () => {
      const instance = await ensurePose();
      return new Promise((resolve, reject) => {
        resultResolver = resolve;
        resultRejecter = reject;
        resultTimer = setTimeout(() => {
          resultResolver = null;
          resultRejecter = null;
          reject(new Error('MediaPipe hat für ein Videobild nicht rechtzeitig geantwortet.'));
        }, 15000);
        Promise.resolve(instance.send({ image })).catch((error) => {
          clearTimeout(resultTimer);
          resultResolver = null;
          resultRejecter = null;
          reject(error);
        });
      });
    };
    poseChain = poseChain.then(run, run);
    return poseChain;
  }

  function landmarkVisibility(points, indexes) {
    return mean(indexes.map((index) => points?.[index]?.visibility ?? 1));
  }

  function normalizePoseResult(results, timestampMs) {
    const image = results?.poseLandmarks;
    const world = results?.poseWorldLandmarks;
    if (!Array.isArray(image) || image.length < 33) return null;
    const visibility = landmarkVisibility(image, [11, 12, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
    if (visibility < DEFAULTS.minVisibility) return null;

    const hip = averagePoint(image[LANDMARK.LEFT_HIP], image[LANDMARK.RIGHT_HIP]);
    const shoulder = averagePoint(image[LANDMARK.LEFT_SHOULDER], image[LANDMARK.RIGHT_SHOULDER]);
    const imageScale = Math.max(
      distance2(image[LANDMARK.LEFT_SHOULDER], image[LANDMARK.RIGHT_SHOULDER]),
      distance2(image[LANDMARK.LEFT_HIP], image[LANDMARK.RIGHT_HIP]) * 1.45,
      0.065,
    );
    const worldHip = Array.isArray(world) && world.length >= 33
      ? averagePoint(world[LANDMARK.LEFT_HIP], world[LANDMARK.RIGHT_HIP])
      : null;
    const worldScale = worldHip
      ? Math.max(distance3(world[LANDMARK.LEFT_SHOULDER], world[LANDMARK.RIGHT_SHOULDER]), 0.18)
      : 1;

    function foot(side) {
      const ankleIndex = side === 'L' ? LANDMARK.LEFT_ANKLE : LANDMARK.RIGHT_ANKLE;
      const heelIndex = side === 'L' ? LANDMARK.LEFT_HEEL : LANDMARK.RIGHT_HEEL;
      const toeIndex = side === 'L' ? LANDMARK.LEFT_FOOT : LANDMARK.RIGHT_FOOT;
      const kneeIndex = side === 'L' ? LANDMARK.LEFT_KNEE : LANDMARK.RIGHT_KNEE;
      const hipIndex = side === 'L' ? LANDMARK.LEFT_HIP : LANDMARK.RIGHT_HIP;
      const point = {
        x: mean([image[ankleIndex].x, image[heelIndex].x, image[toeIndex].x]),
        y: mean([image[ankleIndex].y, image[heelIndex].y, image[toeIndex].y]),
      };
      const worldPoint = worldHip && world
        ? {
          x: mean([world[ankleIndex].x, world[heelIndex].x, world[toeIndex].x]),
          y: mean([world[ankleIndex].y, world[heelIndex].y, world[toeIndex].y]),
          z: mean([world[ankleIndex].z, world[heelIndex].z, world[toeIndex].z]),
        }
        : null;
      return {
        x: (point.x - hip.x) / imageScale,
        lift: (hip.y - point.y) / imageScale,
        z: worldPoint ? (worldPoint.z - worldHip.z) / worldScale : (image[ankleIndex].z - hip.z) / imageScale,
        worldY: worldPoint ? (worldPoint.y - worldHip.y) / worldScale : 0,
        toeHeel: (image[heelIndex].y - image[toeIndex].y) / imageScale,
        kneeAngle: angleAt(image[hipIndex], image[kneeIndex], image[ankleIndex]),
        visibility: landmarkVisibility(image, [ankleIndex, heelIndex, toeIndex, kneeIndex]),
      };
    }

    let yaw = 0;
    if (worldHip && world) {
      const left = world[LANDMARK.LEFT_SHOULDER];
      const right = world[LANDMARK.RIGHT_SHOULDER];
      yaw = Math.atan2((right?.z || 0) - (left?.z || 0), (right?.x || 0) - (left?.x || 0));
    }

    return {
      t: Number(timestampMs) || 0,
      visibility,
      hipX: hip.x,
      hipY: hip.y,
      hipDepth: worldHip?.z || 0,
      shoulderX: shoulder.x,
      yaw,
      left: foot('L'),
      right: foot('R'),
      rawLandmarks: image.map((point) => ({ x: round(point.x, 5), y: round(point.y, 5), z: round(point.z, 5), visibility: round(point.visibility ?? 1, 3) })),
    };
  }

  function unwrapAngles(values) {
    if (!values.length) return [];
    const output = [values[0]];
    for (let index = 1; index < values.length; index += 1) {
      let value = values[index];
      const previous = output[index - 1];
      while (value - previous > Math.PI) value -= Math.PI * 2;
      while (value - previous < -Math.PI) value += Math.PI * 2;
      output.push(value);
    }
    return output;
  }

  function resampleVectors(vectors, targetLength = 48) {
    if (!vectors.length) return [];
    if (vectors.length === 1) return Array.from({ length: targetLength }, () => [...vectors[0]]);
    const result = [];
    for (let index = 0; index < targetLength; index += 1) {
      const position = (index / Math.max(1, targetLength - 1)) * (vectors.length - 1);
      const left = Math.floor(position);
      const right = Math.min(vectors.length - 1, Math.ceil(position));
      const fraction = position - left;
      result.push(vectors[left].map((value, dimension) => round(value * (1 - fraction) + vectors[right][dimension] * fraction, 4)));
    }
    return result;
  }

  function estimateCadence(energy, sampleRate) {
    if (energy.length < 16 || !Number.isFinite(sampleRate) || sampleRate <= 0) return { bpm: null, confidence: 0 };
    const average = mean(energy);
    const deviation = standardDeviation(energy, average) || 1;
    const centered = energy.map((value) => (value - average) / deviation);
    const minLag = Math.max(2, Math.floor((60 * sampleRate) / 210));
    const maxLag = Math.min(centered.length - 3, Math.ceil((60 * sampleRate) / 45));
    let best = null;
    let second = null;
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let numerator = 0;
      let normA = 0;
      let normB = 0;
      for (let index = 0; index + lag < centered.length; index += 1) {
        numerator += centered[index] * centered[index + lag];
        normA += centered[index] ** 2;
        normB += centered[index + lag] ** 2;
      }
      const score = numerator / Math.sqrt((normA || 1) * (normB || 1));
      const candidate = { bpm: Math.round((60 * sampleRate) / lag), score };
      if (!best || score > best.score) { second = best; best = candidate; }
      else if (!second || score > second.score) second = candidate;
    }
    if (!best || best.score < 0.1) return { bpm: null, confidence: 0 };
    return { bpm: best.bpm, confidence: clamp(best.score * 0.65 + (best.score - (second?.score || 0)) * 1.8) };
  }

  function findPeaks(values, threshold, minDistanceFrames) {
    const peaks = [];
    for (let index = 1; index < values.length - 1; index += 1) {
      if (values[index] < threshold || values[index] < values[index - 1] || values[index] < values[index + 1]) continue;
      if (peaks.length && index - peaks[peaks.length - 1] < minDistanceFrames) {
        if (values[index] > values[peaks[peaks.length - 1]]) peaks[peaks.length - 1] = index;
      } else peaks.push(index);
    }
    return peaks;
  }

  function classifyFootEvent(frames, index, side, sampleRate) {
    const footKey = side === 'L' ? 'left' : 'right';
    const otherKey = side === 'L' ? 'right' : 'left';
    const radius = Math.max(1, Math.round(sampleRate * 0.22));
    const start = frames[Math.max(0, index - radius)][footKey];
    const end = frames[Math.min(frames.length - 1, index + radius)][footKey];
    const peak = frames[index][footKey];
    const other = frames[index][otherKey];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const displacement = Math.hypot(dx, dz);
    const liftWindow = frames.slice(Math.max(0, index - radius), Math.min(frames.length, index + radius + 1)).map((frame) => frame[footKey].lift);
    const lift = Math.max(...liftWindow) - median(liftWindow.slice(0, Math.max(1, Math.floor(liftWindow.length / 3))));
    const toeHeel = peak.toeHeel;
    const knee = peak.kneeAngle;
    const crossFront = side === 'L' ? peak.x > other.x + 0.06 : peak.x < other.x - 0.06;
    const crossBehind = crossFront && peak.z > other.z + 0.05;
    const footSuffix = side;

    if (lift > 0.42 && knee < 128) return `HITCH_${footSuffix}`;
    if (lift > 0.30 && knee >= 128) return `KICK_${footSuffix}`;
    if (Math.abs(toeHeel) > 0.12 && displacement < 0.17) return toeHeel > 0 ? `HEEL_${footSuffix}` : `TOE_${footSuffix}`;
    if (crossFront) return `CROSS_${footSuffix}_${crossBehind ? 'BEHIND' : 'FRONT'}`;
    if (Math.abs(dx) > 0.18 && Math.abs(dx) > Math.abs(dz) * 0.85) return `SIDE_${footSuffix}`;
    if (Math.abs(dz) > 0.16) return `${dz < 0 ? 'FORWARD' : 'BACK'}_${footSuffix}`;
    if (lift > 0.13 && displacement < 0.16) return `TOUCH_${footSuffix}`;
    if (displacement < 0.12 && lift < 0.12) return `STOMP_${footSuffix}`;
    return `STEP_${footSuffix}`;
  }

  function dedupeEvents(events) {
    const output = [];
    for (const event of events.sort((a, b) => a.t - b.t)) {
      const previous = output[output.length - 1];
      if (previous && previous.token === event.token && event.t - previous.t < 260) {
        if (event.strength > previous.strength) output[output.length - 1] = event;
        continue;
      }
      output.push(event);
    }
    return output;
  }

  function detectTurns(frames) {
    const yaws = unwrapAngles(frames.map((frame) => frame.yaw));
    const turns = [];
    let anchor = 0;
    for (let index = 2; index < yaws.length; index += 1) {
      const delta = yaws[index] - yaws[anchor];
      if (Math.abs(delta) < Math.PI / 4.3) continue;
      const magnitude = Math.abs(delta) >= Math.PI * 0.72 ? 'HALF' : 'QUARTER';
      turns.push({
        t: frames[index].t,
        token: `TURN_${magnitude}_${delta > 0 ? 'L' : 'R'}`,
        strength: clamp(Math.abs(delta) / Math.PI),
      });
      anchor = index;
    }
    return turns;
  }

  function inferCompoundTokens(tokens) {
    const output = [...tokens];
    for (let index = 0; index < tokens.length - 2; index += 1) {
      const window3 = tokens.slice(index, index + 3).join('|');
      if (window3 === 'SIDE_R|CROSS_L_BEHIND|SIDE_R') output.push('VINE_R');
      if (window3 === 'SIDE_L|CROSS_R_BEHIND|SIDE_L') output.push('VINE_L');
      if (/^(FORWARD_R|STEP_R)\|(STEP_L|TOUCH_L)\|(FORWARD_R|STEP_R)$/.test(window3)) output.push('SHUFFLE_FORWARD_R');
      if (/^(FORWARD_L|STEP_L)\|(STEP_R|TOUCH_R)\|(FORWARD_L|STEP_L)$/.test(window3)) output.push('SHUFFLE_FORWARD_L');
      if (/^(BACK_R|STEP_R)\|(STEP_L|TOUCH_L)\|(BACK_R|STEP_R)$/.test(window3)) output.push('SHUFFLE_BACK_R');
      if (/^(BACK_L|STEP_L)\|(STEP_R|TOUCH_R)\|(BACK_L|STEP_L)$/.test(window3)) output.push('SHUFFLE_BACK_L');
    }
    return output;
  }

  function buildSignature(frames, metadata = {}) {
    const valid = frames.filter(Boolean);
    if (valid.length < DEFAULTS.minPoseFrames) throw new Error('Die Person war nicht lange genug vollständig erkennbar. Bitte Füße und Oberkörper vollständig filmen.');
    const times = valid.map((frame) => frame.t);
    const durationSeconds = Math.max(0.1, (times[times.length - 1] - times[0]) / 1000);
    const sampleRate = valid.length / durationSeconds;
    const featureFrames = valid.map((frame) => [
      frame.left.x, frame.left.z, frame.left.lift, frame.left.kneeAngle / 180,
      frame.right.x, frame.right.z, frame.right.lift, frame.right.kneeAngle / 180,
      (frame.hipX - 0.5) * 2, (frame.hipY - 0.5) * 2,
      Math.sin(frame.yaw), Math.cos(frame.yaw),
    ]);
    const energy = [];
    const leftSpeed = [0];
    const rightSpeed = [0];
    for (let index = 1; index < valid.length; index += 1) {
      const previous = valid[index - 1];
      const current = valid[index];
      const left = Math.hypot(current.left.x - previous.left.x, current.left.z - previous.left.z, (current.left.lift - previous.left.lift) * 0.75);
      const right = Math.hypot(current.right.x - previous.right.x, current.right.z - previous.right.z, (current.right.lift - previous.right.lift) * 0.75);
      leftSpeed.push(left);
      rightSpeed.push(right);
      energy.push(left + right + Math.abs(current.hipX - previous.hipX) * 2.2 + Math.abs(current.yaw - previous.yaw) * 0.35);
    }
    energy.unshift(energy[0] || 0);
    const speedValues = [...leftSpeed, ...rightSpeed];
    const threshold = Math.max(0.045, median(speedValues) + standardDeviation(speedValues) * 0.72);
    const minDistance = Math.max(2, Math.round(sampleRate * 0.18));
    const events = [];
    for (const side of ['L', 'R']) {
      const speeds = side === 'L' ? leftSpeed : rightSpeed;
      for (const peak of findPeaks(speeds, threshold, minDistance)) {
        events.push({ t: valid[peak].t, token: classifyFootEvent(valid, peak, side, sampleRate), strength: clamp(speeds[peak] / Math.max(threshold * 2.3, 0.01)) });
      }
    }
    events.push(...detectTurns(valid));
    const cleanEvents = dedupeEvents(events);
    const stepTokens = cleanEvents.map((event) => event.token);
    const compoundTokens = inferCompoundTokens(stepTokens);
    const cadence = estimateCadence(energy, sampleRate);
    const averageVisibility = mean(valid.map((frame) => frame.visibility));
    const movement = mean(energy);
    const quality = clamp((valid.length / 45) * 0.34 + averageVisibility * 0.42 + clamp(movement / 0.18) * 0.24);
    return {
      version: 2,
      engine: 'mediapipe-pose',
      createdAt: new Date().toISOString(),
      duration: round(metadata.duration || durationSeconds, 2),
      sampledSeconds: round(durationSeconds, 2),
      frameCount: valid.length,
      sampleRate: round(sampleRate, 2),
      poseVisibility: round(averageVisibility),
      movement: round(movement),
      quality: round(quality),
      cadenceBpm: cadence.bpm,
      cadenceConfidence: round(cadence.confidence),
      turnCount: cleanEvents.filter((event) => event.token.startsWith('TURN_')).length,
      stepEvents: cleanEvents.map((event) => ({ t: Math.round(event.t - times[0]), token: event.token, strength: round(event.strength) })),
      stepTokens,
      compoundTokens,
      featureFrames: resampleVectors(featureFrames, 48),
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
    try {
      onProgress(2, 'MediaPipe wird vorbereitet');
      await ensurePose();
      await waitForMediaEvent(video, 'loadedmetadata', 18000);
      if (video.readyState < 2) await waitForMediaEvent(video, 'loadeddata', 18000);
      if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Videodauer konnte nicht bestimmt werden.');
      const sampledSeconds = Math.min(config.maxSeconds, video.duration);
      const start = Math.max(0, (video.duration - sampledSeconds) / 2);
      const frameCount = Math.max(config.minPoseFrames, Math.min(config.maxFrames, Math.round(sampledSeconds * 4.2)));
      const frames = [];
      for (let index = 0; index < frameCount; index += 1) {
        const time = start + (sampledSeconds * index / Math.max(1, frameCount - 1));
        await seekVideo(video, time);
        const results = await inferPose(video);
        const normalized = normalizePoseResult(results, time * 1000);
        if (normalized) frames.push(normalized);
        onProgress(5 + ((index + 1) / frameCount) * 91, normalized
          ? `Körperbild ${index + 1} von ${frameCount}`
          : `Körper in Bild ${index + 1} nicht vollständig sichtbar`);
      }
      const signature = buildSignature(frames, { duration: video.duration });
      onProgress(100, 'Körper- und Schrittanalyse abgeschlossen');
      return signature;
    } finally {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
    }
  }

  async function analyzeLiveVideo(video, options = {}) {
    if (!video) throw new Error('Keine Live-Kamera verfügbar.');
    // Für einen belastbaren Schrittvergleich wird immer mindestens 30 Sekunden analysiert.
    const requestedDuration = Number(options.durationSeconds) || 30;
    const durationSeconds = Math.min(60, Math.max(30, requestedDuration));
    const interval = Math.max(100, Number(options.frameIntervalMs) || DEFAULTS.liveFrameIntervalMs);
    const partialInterval = Math.max(1500, Number(options.partialIntervalMs) || 2500);
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
    const onFrame = typeof options.onFrame === 'function' ? options.onFrame : () => {};
    const onPartialSignature = typeof options.onPartialSignature === 'function' ? options.onPartialSignature : () => {};
    const signal = options.signal;
    await ensurePose();
    const started = performance.now();
    let lastFrame = -Infinity;
    let lastPartial = started;
    const frames = [];
    while (performance.now() - started < durationSeconds * 1000) {
      if (signal?.aborted) throw new DOMException('Live-Aufnahme abgebrochen.', 'AbortError');
      const now = performance.now();
      if (now - lastFrame < interval) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        continue;
      }
      lastFrame = now;
      const results = await inferPose(video);
      const normalized = normalizePoseResult(results, now);
      if (normalized) frames.push(normalized);
      onFrame(results);
      const elapsed = (now - started) / 1000;
      onProgress(clamp(elapsed / durationSeconds) * 100, `${Math.min(durationSeconds, Math.ceil(elapsed))} von ${durationSeconds} Sekunden`);

      if (frames.length >= DEFAULTS.minPoseFrames && now - lastPartial >= partialInterval) {
        lastPartial = now;
        try {
          onPartialSignature(buildSignature(frames, { duration: elapsed, partial: true }));
        } catch (error) {
          // Zu wenig verwertbare Bewegung ist während der laufenden Aufnahme noch kein Fehler.
          console.debug('Zwischenstand der Live-Schrittanalyse noch nicht verfügbar.', error?.message || error);
        }
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const signature = buildSignature(frames, { duration: durationSeconds });
    onPartialSignature(signature);
    onProgress(100, '30 Sekunden aufgenommen · Live-Körper- und Schrittanalyse abgeschlossen');
    return signature;
  }

  function vectorDistance(a, b) {
    const length = Math.min(a?.length || 0, b?.length || 0);
    if (!length) return 1;
    let total = 0;
    for (let index = 0; index < length; index += 1) total += (a[index] - b[index]) ** 2;
    return Math.sqrt(total / length);
  }

  function dtwSimilarity(left, right) {
    if (!left?.length || !right?.length) return 0;
    const rows = left.length + 1;
    const columns = right.length + 1;
    const previous = new Float64Array(columns).fill(Infinity);
    previous[0] = 0;
    for (let i = 1; i < rows; i += 1) {
      const current = new Float64Array(columns).fill(Infinity);
      const band = Math.max(8, Math.ceil(Math.max(left.length, right.length) * 0.25));
      const minJ = Math.max(1, i - band);
      const maxJ = Math.min(right.length, i + band);
      for (let j = minJ; j <= maxJ; j += 1) {
        const cost = vectorDistance(left[i - 1], right[j - 1]);
        current[j] = cost + Math.min(current[j - 1], previous[j], previous[j - 1]);
      }
      previous.set(current);
    }
    const normalized = previous[right.length] / Math.max(left.length, right.length);
    return clamp(Math.exp(-normalized * 2.15));
  }

  function tokenFoot(token) {
    const match = String(token || '').match(/_(L|R)(?:_|$)/);
    return match?.[1] || '';
  }

  function tokenFamily(token) {
    const value = String(token || '');
    if (value.startsWith('TURN_')) return 'TURN';
    if (value.startsWith('CROSS_')) return 'CROSS';
    if (value.startsWith('FORWARD_') || value.startsWith('BACK_') || value.startsWith('SIDE_') || value.startsWith('STEP_')) return 'STEP';
    if (value.startsWith('TOUCH_') || value.startsWith('HEEL_') || value.startsWith('TOE_') || value.startsWith('KICK_') || value.startsWith('HITCH_') || value.startsWith('HOOK_') || value.startsWith('STOMP_')) return 'ACCENT';
    if (value.startsWith('HIP_')) return 'HIP';
    return value;
  }

  function tokenCompatibility(left, right) {
    if (left === right) return 1;
    const leftFoot = tokenFoot(left);
    const rightFoot = tokenFoot(right);
    const sameFoot = !leftFoot || !rightFoot || leftFoot === rightFoot;
    const leftFamily = tokenFamily(left);
    const rightFamily = tokenFamily(right);
    if (leftFamily === 'TURN' && rightFamily === 'TURN') {
      const directionMatch = left.endsWith('_L') === right.endsWith('_L');
      return directionMatch ? 0.72 : 0.15;
    }
    if (leftFamily === rightFamily && sameFoot) {
      if (leftFamily === 'CROSS') return 0.78;
      if (leftFamily === 'STEP') return 0.7;
      if (leftFamily === 'ACCENT') return 0.58;
      return 0.62;
    }
    if (sameFoot && ((leftFamily === 'STEP' && rightFamily === 'CROSS') || (leftFamily === 'CROSS' && rightFamily === 'STEP'))) return 0.42;
    if (sameFoot && ((leftFamily === 'STEP' && rightFamily === 'ACCENT') || (leftFamily === 'ACCENT' && rightFamily === 'STEP'))) return 0.28;
    return 0;
  }

  function expandPatternSequence(sequence = []) {
    return sequence.flatMap((token) => GROUP_EXPANSIONS[token] || [token]);
  }

  function localSequenceSimilarity(query = [], pattern = []) {
    if (!query.length || !pattern.length) return { score: 0, coverage: 0, matched: 0 };
    const repeated = [...pattern, ...pattern, ...pattern];
    const columns = repeated.length + 1;
    let previous = new Float64Array(columns);
    let best = 0;
    let bestMatches = 0;
    const matchesRows = Array.from({ length: query.length + 1 }, () => new Uint16Array(columns));
    for (let i = 1; i <= query.length; i += 1) {
      const current = new Float64Array(columns);
      for (let j = 1; j <= repeated.length; j += 1) {
        const compatibility = tokenCompatibility(query[i - 1], repeated[j - 1]);
        const diagonal = previous[j - 1] + (compatibility > 0 ? compatibility * 1.55 : -0.72);
        const up = previous[j] - 0.34;
        const left = current[j - 1] - 0.22;
        current[j] = Math.max(0, diagonal, up, left);
        if (current[j] === diagonal && compatibility > 0) matchesRows[i][j] = matchesRows[i - 1][j - 1] + 1;
        else if (current[j] === up) matchesRows[i][j] = matchesRows[i - 1][j];
        else if (current[j] === left) matchesRows[i][j] = matchesRows[i][j - 1];
        if (current[j] > best) {
          best = current[j];
          bestMatches = matchesRows[i][j];
        }
      }
      previous = current;
    }
    const denominator = Math.max(1, Math.min(query.length, pattern.length) * 1.55);
    const score = clamp(best / denominator);
    const coverage = clamp(bestMatches / Math.max(1, Math.min(query.length, pattern.length)));
    return { score, coverage, matched: bestMatches };
  }

  function cadenceSimilarity(a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return 0.5;
    return clamp(1 - Math.min(Math.abs(a - b), Math.abs(a * 2 - b), Math.abs(a / 2 - b)) / 30);
  }

  function compareSignatures(query, reference) {
    if (!query || !reference) return { score: 0, confidence: 0, details: {} };
    if (query.version >= 2 && reference.version >= 2 && query.featureFrames && reference.featureFrames) {
      const poseScore = dtwSimilarity(query.featureFrames, reference.featureFrames);
      const sequence = localSequenceSimilarity(query.stepTokens || [], reference.stepTokens || []);
      const cadence = cadenceSimilarity(query.cadenceBpm, reference.cadenceBpm);
      const turn = clamp(1 - Math.abs((query.turnCount || 0) - (reference.turnCount || 0)) / 5);
      const quality = Math.min(query.quality || 0, reference.quality || 0);
      const weighted = poseScore * 0.52 + sequence.score * 0.29 + cadence * 0.11 + turn * 0.08;
      const adjusted = weighted * (0.74 + quality * 0.26);
      return {
        score: Math.round(clamp(adjusted) * 100),
        confidence: round(clamp((adjusted - 0.42) / 0.48)),
        details: {
          pose: Math.round(poseScore * 100),
          steps: Math.round(sequence.score * 100),
          cadence: Math.round(cadence * 100),
          turns: Math.round(turn * 100),
          quality: Math.round(quality * 100),
        },
      };
    }
    return { score: 0, confidence: 0, details: { legacyReference: true } };
  }

  function rankReferences(query, references = []) {
    return references
      .filter((reference) => reference?.signature)
      .map((reference) => ({ reference, ...compareSignatures(query, reference.signature) }))
      .sort((left, right) => right.score - left.score || right.confidence - left.confidence);
  }

  function resolvePatternDance(pattern, dances = []) {
    if (pattern.danceId) {
      const byId = dances.find((dance) => dance.id === pattern.danceId);
      if (byId) return byId;
    }
    const names = [pattern.title, ...(pattern.aliases || [])].map(normalizeText);
    return dances.find((dance) => names.includes(normalizeText(dance.title))) || null;
  }

  function rankSheetPatterns(signature, patterns = [], dances = []) {
    if (!signature?.stepTokens?.length) return [];
    const query = signature.stepTokens;
    return patterns
      .map((pattern) => {
        const dance = resolvePatternDance(pattern, dances);
        if (!dance) return null;
        const expanded = expandPatternSequence(pattern.sequence || []);
        const sequence = localSequenceSimilarity(query, expanded);
        const minimum = Number(pattern.minObservedSteps) || 5;
        const enough = Math.min(query.length, expanded.length) >= minimum;
        const turnExpected = Number(pattern.walls) === 4 ? 1 : Number(pattern.walls) === 2 ? 1 : 0;
        const turnScore = turnExpected ? clamp((signature.turnCount || 0) / turnExpected) : clamp(1 - (signature.turnCount || 0) / 4);
        const quality = signature.quality || 0;
        const raw = sequence.score * 0.82 + sequence.coverage * 0.1 + turnScore * 0.08;
        const adjusted = raw * (0.78 + quality * 0.22) * (enough ? 1 : 0.72);
        return {
          reference: {
            type: 'sheet-pattern',
            danceId: dance.id,
            danceTitle: dance.title,
            patternTitle: pattern.title,
            counts: pattern.counts,
            walls: pattern.walls,
          },
          score: Math.round(clamp(adjusted) * 100),
          confidence: round(clamp((adjusted - 0.4) / 0.48)),
          details: {
            steps: Math.round(sequence.score * 100),
            coverage: Math.round(sequence.coverage * 100),
            matchedSteps: sequence.matched,
            detectedSteps: query.length,
            patternSteps: expanded.length,
            quality: Math.round(quality * 100),
          },
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score || (right.details?.matchedSteps || 0) - (left.details?.matchedSteps || 0));
  }

  function describeSignature(signature) {
    if (!signature) return [];
    const steps = signature.stepTokens?.length || 0;
    const visibility = Math.round((signature.poseVisibility || 0) * 100);
    const output = [
      `${signature.frameCount || 0} Körperbilder`,
      `${steps} Schrittmerkmale`,
      `Körpererkennung ${visibility} %`,
    ];
    if (signature.turnCount) output.push(`${signature.turnCount} Drehung${signature.turnCount === 1 ? '' : 'en'}`);
    if (signature.cadenceBpm) output.push(`Bewegungstempo ca. ${signature.cadenceBpm} BPM`);
    const first = (signature.stepTokens || []).slice(0, 5).map((token) => STEP_LABELS[token] || token).join(' · ');
    if (first) output.push(first);
    return output;
  }

  function drawPose(canvas, video, results) {
    if (!canvas || !video || !results?.poseLandmarks) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 360;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.clearRect(0, 0, width, height);
    const points = results.poseLandmarks;
    context.lineWidth = Math.max(2, width / 300);
    context.strokeStyle = 'rgba(255,255,255,.92)';
    context.fillStyle = 'rgba(255,255,255,.95)';
    const connections = window.POSE_CONNECTIONS || [];
    for (const connection of connections) {
      const start = points[connection[0]];
      const end = points[connection[1]];
      if (!start || !end || (start.visibility ?? 1) < 0.35 || (end.visibility ?? 1) < 0.35) continue;
      context.beginPath();
      context.moveTo(start.x * width, start.y * height);
      context.lineTo(end.x * width, end.y * height);
      context.stroke();
    }
    for (const point of points) {
      if ((point.visibility ?? 1) < 0.45) continue;
      context.beginPath();
      context.arc(point.x * width, point.y * height, Math.max(2, width / 210), 0, Math.PI * 2);
      context.fill();
    }
  }

  window.CLDFVideoMotion = {
    version: '2.1.0-beta',
    engine: 'mediapipe-pose',
    ensurePose,
    analyzeVideo,
    analyzeLiveVideo,
    compareSignatures,
    rankReferences,
    rankSheetPatterns,
    describeSignature,
    drawPose,
    stepLabels: STEP_LABELS,
  };
})();
