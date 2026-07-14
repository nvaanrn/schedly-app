const CACHE_NAME = 'schedly-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/auth.html',
  '/dashboard.html',
  '/profile.html',
  '/task-recap.html',
  '/reset-password.html',
  '/settings.html',
  '/offline.html',
  '/css/auth.css',
  '/css/dashboard.css',
  '/css/profile.css',
  '/css/task-recap.css',
  '/css/settings.css',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/profile.js',
  '/js/task-recap.js',
  '/js/reset-password.js',
  '/js/settings.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass non-GET requests and API requests to the network natively.
  // This avoids Service Worker errors on mobile browsers for POST/PUT request body streams.
  if (event.request.method !== 'GET' || requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Only cache valid GET responses for static assets
        if (
          event.request.method === 'GET' &&
          networkResponse.status === 200 &&
          !requestUrl.pathname.startsWith('/api/')
        ) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for HTML navigations
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});
