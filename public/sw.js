/* ================================================
   SCHEDLY — Service Worker (sw.js)
   Version: 4 | Strategy: Named Cache Buckets
   ================================================ */

// ── Cache Names ──────────────────────────────────
const CACHE_VERSION   = 'v4';
const CACHE_STATIC    = `schedly-static-${CACHE_VERSION}`;
const CACHE_HTML      = `schedly-html-${CACHE_VERSION}`;
const CACHE_FONTS     = `schedly-fonts-${CACHE_VERSION}`;
const CACHE_IMAGES    = `schedly-images-${CACHE_VERSION}`;
const ALL_CACHES      = [CACHE_STATIC, CACHE_HTML, CACHE_FONTS, CACHE_IMAGES];

// ── Static Assets (Cache First) ──────────────────
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/css/auth.css',
  '/css/dashboard.css',
  '/css/profile.css',
  '/css/task-recap.css',
  '/css/settings.css',
  '/js/pwa.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/profile.js',
  '/js/task-recap.js',
  '/js/reset-password.js',
  '/js/settings.js'
];

// ── HTML Pages (Network First) ───────────────────
const HTML_PAGES = [
  '/',
  '/auth.html',
  '/dashboard.html',
  '/profile.html',
  '/task-recap.html',
  '/reset-password.html',
  '/settings.html'
];

// ── Icon Assets (Cache First) ────────────────────
const IMAGE_ASSETS = [
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png'
];

// ═══════════════════════════════════════════════
// INSTALL — Pre-cache all critical assets
// ═══════════════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Pre-cache static assets (CSS, JS, offline page, manifest)
      caches.open(CACHE_STATIC).then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Pre-cache HTML pages
      caches.open(CACHE_HTML).then((cache) => {
        console.log('[SW] Pre-caching HTML pages');
        return cache.addAll(HTML_PAGES);
      }),
      // Pre-cache icons
      caches.open(CACHE_IMAGES).then((cache) => {
        console.log('[SW] Pre-caching icons');
        return cache.addAll(IMAGE_ASSETS);
      })
    ]).then(() => {
      console.log('[SW] Install complete — activating immediately');
      return self.skipWaiting();
    })
  );
});

// ═══════════════════════════════════════════════
// ACTIVATE — Clean up old caches + claim clients
// ═══════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!ALL_CACHES.includes(name)) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activate complete — claiming all clients');
      return self.clients.claim();
    })
  );
});

// ═══════════════════════════════════════════════
// MESSAGE — Handle skipWaiting from pwa.js
// ═══════════════════════════════════════════════
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received — activating new SW');
    self.skipWaiting();
  }
});

// ═══════════════════════════════════════════════
// FETCH — Strategy routing by request type
// ═══════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ── 1. Always bypass non-GET and API calls ──
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return; // fall through to network natively
  }

  // ── 2. Google Fonts — Cache First ──
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(req, CACHE_FONTS));
    return;
  }

  // ── 3. Images (PNG, JPG, SVG, WebP, ICO) — Cache First ──
  if (/\.(png|jpg|jpeg|svg|webp|ico|gif)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req, CACHE_IMAGES));
    return;
  }

  // ── 4. CSS — Cache First (Stale-While-Revalidate via background update) ──
  if (url.pathname.endsWith('.css')) {
    event.respondWith(staleWhileRevalidate(req, CACHE_STATIC));
    return;
  }

  // ── 5. JavaScript — Stale-While-Revalidate ──
  if (url.pathname.endsWith('.js')) {
    event.respondWith(staleWhileRevalidate(req, CACHE_STATIC));
    return;
  }

  // ── 6. HTML Navigation — Network First with offline fallback ──
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(req, CACHE_HTML));
    return;
  }

  // ── 7. Everything else — Network First ──
  event.respondWith(networkFirst(req, CACHE_STATIC));
});

// ═══════════════════════════════════════════════
// STRATEGY HELPERS
// ═══════════════════════════════════════════════

/**
 * Cache First: serve from cache; fetch & update if miss.
 * Best for: icons, fonts — rarely change.
 */
async function cacheFirst(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // No network, no cache — nothing to return for this type
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

/**
 * Network First: try network; fall back to cache.
 * Falls back to offline.html for HTML navigation requests.
 * Best for: HTML pages — ensures fresh content.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // For navigation, serve the offline fallback page
    if (request.mode === 'navigate') {
      const offline = await caches.match('/offline.html', { cacheName: CACHE_STATIC });
      if (offline) return offline;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale-While-Revalidate: serve cache immediately, update cache in background.
 * Best for: CSS, JS — fast load + eventual freshness.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Kick off network fetch in background regardless
  const fetchPromise = fetch(request).then((response) => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cache immediately if available, else wait for network
  return cached || fetchPromise;
}
