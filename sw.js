const CACHE_NAME = 'sudoku-royale-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './game.html',
    './css/style.css',
    './js/main.js',
    './js/game.js',
    './js/sudoku.js',
    './js/theme.js',
    './manifest.json',
    './img/icon.svg'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Fetch Event (Network first, fallback to cache mechanism)
self.addEventListener('fetch', (event) => {
    // Avoid caching PHP / API calls
    if (event.request.url.includes('api.php') || event.request.url.includes('/data/')) {
        return event.respondWith(fetch(event.request));
    }
    
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Cache hit
            if (response) {
                return response;
            }
            return fetch(event.request);
        }).catch(() => {
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});

// Activate Event (Cleanup old caches)
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
