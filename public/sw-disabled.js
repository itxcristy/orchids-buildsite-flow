// Service Worker DISABLED - This file prevents Service Worker registration
// If you need to completely disable Service Worker, rename this to sw.js
// This ensures no Service Worker intercepts any requests

// Empty Service Worker that does nothing
// It will be registered but won't intercept any requests

self.addEventListener('install', (event) => {
  // Skip waiting immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// CRITICAL: Do NOT intercept ANY fetch requests
// This ensures the browser handles ALL requests directly
self.addEventListener('fetch', (event) => {
  // Do nothing - let browser handle all requests
  // This prevents any interference with asset loading
  return;
});

