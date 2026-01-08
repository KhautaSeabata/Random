// Service Worker for MzanziFx
const CACHE_NAME = 'mzanzifx-v5.13'; // VERSION 5.13 - Centered S/R labels, no trendlines

const ASSETS = [
    '/',
    '/index.html',
    '/signals.html',
    '/settings.html',
    '/app.js',
    '/chart.js',
    '/data.js',
    '/analysis.js',
    '/tracker.js',
    '/news-analyzer.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ Cache opened - v5.13');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Handle notifications
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/signals.html')
        );
    }
});
