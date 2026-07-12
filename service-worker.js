'use strict';

const CACHE = 'cldf-offline-v4-5-6';
const APP_SHELL = [
  './',
  './index.html',
  './404.html',
  './manifest.webmanifest',
  './assets/styles.css?v=4.6.0',
  './assets/app.js?v=4.6.0',
  './assets/local-store.js',
  './assets/audio-engine.js',
  './assets/audio-fingerprints.js',
  './assets/data.js',
  './assets/offline-bootstrap.js',
  './assets/image-mappings.js',
  './assets/song-metadata.js',
  './assets/getinline-data.js',
  './assets/step-sheet-patterns.js?v=4.6.0',
  './assets/video-motion.js?v=4.6.0',
  './assets/mediapipe/pose/pose.js?v=4.6.0',
  './assets/mediapipe/pose/pose_web.binarypb',
  './assets/mediapipe/pose/pose_solution_packed_assets.data',
  './assets/mediapipe/pose/pose_solution_packed_assets_loader.js',
  './assets/mediapipe/pose/pose_solution_simd_wasm_bin.js',
  './assets/mediapipe/pose/pose_solution_wasm_bin.js',
  './assets/mediapipe/pose/pose_landmark_lite.tflite',
  './assets/mediapipe/pose/pose_solution_simd_wasm_bin.wasm',
  './assets/mediapipe/pose/pose_solution_wasm_bin.wasm',
  './assets/cldf-hero.webp',
  './assets/cldf-hero-1200.webp',
  './assets/apple-touch-icon.png',
  './assets/icon-64.png',
  './assets/icon-128.png',
  './assets/icon-192.png',
  './assets/icon-256.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
  './data/cldf-data.json',
  './data/getinline-dances.json',
  './data/bild-lied-tanz-zuordnungen.json',
  './data/song-metadata.json',
  './docs/DATENSCHUTZ.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(APP_SHELL.map(async (url) => {
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (request.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    if (request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  const updateable = /\/(?:assets\/getinline-data\.js|data\/getinline-dances\.json|service-worker\.js)$/i.test(url.pathname);
  event.respondWith(updateable ? networkFirst(request) : cacheFirst(request));
});
