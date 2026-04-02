/* ============================================================
   Blackjack PWA — Service Worker
   Strategy: Cache First, fallback to network
   Cache name is versioned — bump to "blackjack-v2" etc. to
   force clients to get a fresh cache on next visit.
   ============================================================ */

const CACHE = 'blackjack-v1';
const PRECACHE = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// Install: pre-cache all shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  // Take control immediately instead of waiting for old SW to die
  self.skipWaiting();
});

// Activate: delete any old cache versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first, network fallback
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin or precached resources
  if (event.request.method !== 'GET') return;

  // For Google Fonts (online-only) — network only, don't block on failure
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(resp => {
          // Cache font responses so they work offline after first load
          return caches.open(CACHE).then(cache => {
            cache.put(event.request, resp.clone());
            return resp;
          });
        }).catch(() => new Response('', { status: 503 }))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        // Cache successful responses from same origin
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});
