// X-Glass Service Worker
// Bump CACHE_VERSION whenever the caching logic changes to force all clients to
// pick up the new worker and discard stale caches.
const CACHE_VERSION = 'v2';

const CACHE = {
  shell:  `x-glass-shell-${CACHE_VERSION}`,   // offline page + navigation
  static: `x-glass-static-${CACHE_VERSION}`,  // _next/static/** (hashed, permanent)
  images: `x-glass-images-${CACHE_VERSION}`,  // /lenses/** lens photos
};

const ALL_CACHES = Object.values(CACHE);

// Pages to pre-cache on install so they're available offline immediately.
// Including the locale home pages means the app works even on the very first
// offline launch, before the user has browsed any pages while online.
const PRECACHE_URLS = ['/offline', '/en/', '/zh/'];

// How long (seconds) lens images stay in the cache before a background refresh.
const IMAGE_TTL_S = 30 * 24 * 60 * 60; // 30 days

// ── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE.shell)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Non-fatal: pre-cache may fail on protected preview deployments.
      // The offline page will be cached on the user's first normal visit.
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Delete caches from previous versions.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !ALL_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
  );
  // Take control of all open tabs right away.
  self.clients.claim();
});

// ── Fetch routing ─────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Skip API routes entirely — always go to the network.
  if (url.pathname.startsWith('/api/')) return;

  // _next/static — content-hashed files, safe to cache forever.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE.static));
    return;
  }

  // Lens photos, PWA icons, and splash screens — cache first, refresh after TTL.
  if (
    url.pathname.startsWith('/lenses/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/screenshots/') ||
    url.pathname.startsWith('/splash/')
  ) {
    event.respondWith(cacheFirst(request, CACHE.images, IMAGE_TTL_S));
    return;
  }

  // HTML navigation — network first, fall back to cached page or /offline.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Everything else — network first, no special fallback.
  event.respondWith(networkFirst(request));
});

// ── Strategy helpers ──────────────────────────────────────────────────────────

/**
 * Cache First: serve from cache if available; fetch + store if not.
 * When maxAgeSeconds is set, stale entries are served but refreshed in the background.
 */
async function cacheFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    if (maxAgeSeconds) {
      const date = cached.headers.get('date');
      const ageSeconds = date
        ? (Date.now() - new Date(date).getTime()) / 1000
        : 0;
      if (ageSeconds > maxAgeSeconds) {
        // Serve stale immediately, refresh in background.
        fetchAndStore(request, cache);
      }
    }
    return cached;
  }

  return fetchAndStore(request, cache);
}

/**
 * Network First: try the network; on failure return cached response.
 */
async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response('Network error', { status: 503 });
  }
}

/**
 * Network First for navigation requests: cache successful responses so they
 * are available offline, and fall back to /offline on network failure.
 */
async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(CACHE.shell);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // When the PWA is launched via the home screen icon (start_url = '/'), the
    // locale middleware can't run offline so there's no cached entry for '/'.
    // Fall back to the precached English home page so the app is usable.
    const url = new URL(request.url);
    if (url.pathname === '/') {
      const home = await cache.match('/en/');
      if (home) return home;
    }
    return (await cache.match('/offline')) ?? new Response('Offline', { status: 503 });
  }
}

/**
 * Fetch a request and store the response in the given cache.
 * Returns the network response (or re-throws on failure).
 */
async function fetchAndStore(request, cache) {
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
