/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = 'semaforo-emocional-v1.4.3';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// We intercept dynamic requests to cache whatever assets are loaded on-the-fly
// This network-first, fallback-to-cache strategy keeps the application offline-ready
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Precaching essential offline assets...');
        // Use Promise.allSettled to ensure that even if one asset fails to fetch,
        // the Service Worker installation does NOT fail or get stuck.
        return Promise.allSettled(
          PRECACHE_ASSETS.map((asset) => {
            return cache.add(asset)
              .then(() => console.log(`Successfully precached: ${asset}`))
              .catch((err) => console.error(`Failed to precache ${asset}:`, err));
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Parse request URL
  let requestUrl;
  try {
    requestUrl = new URL(event.request.url);
  } catch (e) {
    return;
  }

  // Only intercept same-origin HTTP/HTTPS requests to avoid CORS/extension issues
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Stale-While-Revalidate strategy for optimal offline capabilities and speed
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.warn('Network fetch failed for:', event.request.url, error);
          if (cachedResponse) return cachedResponse;
          
          // Offline fallback for page navigation requests
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./') || caches.match('./index.html');
          }

          // Return offline response
          return new Response('Contenido no disponible sin conexión', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });

      return cachedResponse || fetchPromise;
    })
  );
});

