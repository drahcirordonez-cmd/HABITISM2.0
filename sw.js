// ============================================================================
// HABITISM - Service Worker
// ============================================================================
// Provides offline support and caching for the PWA.
// Cache version - bump this when you deploy changes to force updates.
// ============================================================================
const CACHE_NAME = 'habitism-v3';
const STATIC_CACHE = 'habitism-static-v3';
const API_CACHE = 'habitism-api-v3';

// Files to cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/dashboard.html',
  '/admin.html',
  '/login.html',
  '/signup.html',
  '/rules.html',
  '/introduction-page.html',
  '/app.js',
  '/dashboard.js',
  '/admin.js',
  '/app.css',
  '/dashboard.css',
  '/style.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-icon.png'
];

// API endpoints that should be cached (GET only)
const CACHEABLE_API_PATTERNS = [
  '/api/user/state/get',
  '/api/admin/users/',
  '/api/admin/accountability-feed'
];

// ============================================================================
// INSTALL - Cache app shell
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Habitism SW] Caching app shell assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================================
// ACTIVATE - Clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => {
            return key !== STATIC_CACHE && key !== CACHE_NAME && key !== API_CACHE;
          }).map((key) => {
            console.log('[Habitism SW] Deleting old cache:', key);
            return caches.delete(key);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ============================================================================
// FETCH - Serve from cache, fall back to network
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Facebook SDK and external scripts
  if (url.pathname.includes('connect.facebook.net')) return;

  // Handle API requests separately
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        // Otherwise fetch from network and cache
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            // Clone and cache
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE)
              .then((cache) => cache.put(request, responseClone));
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback for HTML pages
            if (request.destination === 'document') {
              return caches.match('/dashboard.html');
            }
          });
      })
  );
});

// ============================================================================
// API Request Handler - Network first, cache fallback
// ============================================================================
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_PATTERNS.some((pattern) => url.pathname.includes(pattern));

  // For non-cacheable API calls, always go to network
  if (!isCacheable) {
    return fetch(request);
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Network failed - try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw err;
  }
}

// ============================================================================
// MESSAGE - Handle messages from main thread
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});