// Service Worker for MzanziFx
const CACHE_NAME = 'mzanzifx-v5.10'; // VERSION 5.10 - Fixed notifications + static bottom nav
const urlsToCache = [
  './',
  './index.html',
  './signals.html',
  './settings.html',
  './data.js',
  './chart.js',
  './news-analyzer.js',
  './app.js',
  './analysis.js',
  './tracker.js',
  './manifest.json'
];

// Install event - cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache opened - v5.10');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip WebSocket requests
  if (event.request.url.includes('ws.derivws.com') || 
      event.request.url.includes('firebase')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch(() => {
        return caches.match('./index.html');
      })
  );
});
