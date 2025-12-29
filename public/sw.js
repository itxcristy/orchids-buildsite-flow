// Production Service Worker for Drena PWA
// Optimized for reliability and proper asset handling

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `drena-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `drena-dynamic-${CACHE_VERSION}`;
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Static assets to precache (only essential files)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Assets that should NEVER be cached
const NEVER_CACHE = [
  '/api/',
  '/assets/',
  '/node_modules/',
  '/@vite/',
  '/@id/',
  '/@react/',
  '/@fs/',
  '.hot-update.',
  'sockjs-node',
];

// File extensions that should NEVER be cached by SW
const NEVER_CACHE_EXTENSIONS = [
  '.js',
  '.mjs',
  '.css',
  '.ts',
  '.tsx',
  '.map',
];

// ============================================================================
// INSTALL - Precache essential static assets
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precaching failed:', error);
        // Continue anyway - don't block installation
      })
  );
});

// ============================================================================
// ACTIVATE - Clean up old caches and take control
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Keep only current version caches
              return !cacheName.includes(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Take control of all clients immediately
      self.clients.claim(),
    ])
    .then(() => {
      console.log('[SW] Service worker activated and ready');
      
      // Notify all clients about the update
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ 
            type: 'SW_ACTIVATED',
            version: CACHE_VERSION 
          });
        });
      });
    })
    .catch((error) => {
      console.error('[SW] Activation failed:', error);
    })
  );
});

// ============================================================================
// FETCH - Strategic caching with proper asset handling
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = request.url;
  
  // CRITICAL: Check for /assets/ FIRST before any other processing
  // This is the most common source of asset loading issues
  if (requestUrl.includes('/assets/')) {
    return; // Let browser handle directly - DO NOT intercept
  }
  
  // Skip non-GET requests immediately
  if (request.method !== 'GET') {
    return;
  }
  
  // Parse URL safely
  let url;
  try {
    url = new URL(requestUrl);
  } catch (e) {
    // Invalid URL, let browser handle
    return;
  }
  
  // Skip cross-origin requests (unless from CDN)
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Check if URL should NEVER be cached (additional safety checks)
  if (shouldNeverCache(url.pathname, url.href)) {
    return; // Let browser handle naturally
  }
  
  // Determine caching strategy based on request type
  if (isNavigationRequest(request)) {
    // HTML pages: Network first, fallback to cache
    event.respondWith(networkFirstStrategy(request));
  } else if (isImageRequest(url.pathname)) {
    // Images: Cache first, fallback to network
    event.respondWith(cacheFirstStrategy(request));
  } else if (isStaticAsset(url.pathname)) {
    // Other static assets: Cache first
    event.respondWith(cacheFirstStrategy(request));
  }
  // Everything else: Let browser handle (no SW intervention)
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a URL should never be cached
 */
function shouldNeverCache(pathname, href) {
  // Check against never-cache patterns
  for (const pattern of NEVER_CACHE) {
    if (href.includes(pattern)) {
      return true;
    }
  }
  
  // Check file extensions
  for (const ext of NEVER_CACHE_EXTENSIONS) {
    if (pathname.endsWith(ext)) {
      return true;
    }
  }
  
  // Check for query params that indicate dynamic/versioned assets
  if (href.includes('?v=') || href.includes('?t=') || 
      href.includes('?import') || href.includes('&v=')) {
    return true;
  }
  
  // Check for Vite hash pattern (e.g., index-B2xj8K9s.js)
  if (/[.-][A-Za-z0-9_-]{8,}\.(js|css|mjs)/.test(pathname)) {
    return true;
  }
  
  return false;
}

/**
 * Check if request is a navigation request
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         request.destination === 'document' ||
         (request.headers.get('accept') || '').includes('text/html');
}

/**
 * Check if pathname is an image
 */
function isImageRequest(pathname) {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];
  return imageExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Check if pathname is a cacheable static asset
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.woff', '.woff2', '.ttf', '.eot', '.json'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Network first strategy - try network, fallback to cache
 * Best for HTML pages that should be fresh
 */
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone()).catch(() => {
        // Silent fail - don't block response
      });
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a navigation request and we have index.html cached, serve that
    if (isNavigationRequest(request)) {
      const indexResponse = await caches.match('/index.html');
      if (indexResponse) {
        return indexResponse;
      }
    }
    
    // Return offline page or error
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No internet connection and no cached version available' 
      }), 
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Cache first strategy - try cache, fallback to network
 * Best for images and static assets that don't change often
 */
async function cacheFirstStrategy(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Check if cached response is too old
      const dateHeader = cachedResponse.headers.get('date');
      if (dateHeader) {
        const cachedDate = new Date(dateHeader).getTime();
        const now = Date.now();
        
        // If cache is older than max age, fetch fresh in background
        if (now - cachedDate > CACHE_MAX_AGE) {
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, response).catch(() => {});
              });
            }
          }).catch(() => {
            // Silent fail for background fetch
          });
        }
      }
      
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone()).catch(() => {
        // Silent fail - don't block response
      });
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: 'Failed to load resource',
        message: error.message 
      }), 
      {
        status: 408,
        statusText: 'Request Timeout',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (!data || !data.type) return;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      console.log('[SW] Skipping waiting...');
      self.skipWaiting().then(() => self.clients.claim());
      break;
      
    case 'CLEAR_CACHE':
      console.log('[SW] Clearing all caches...');
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        }).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;
      
    case 'UNREGISTER':
      console.log('[SW] Unregistering service worker...');
      event.waitUntil(
        Promise.all([
          // Clear all caches
          caches.keys().then((cacheNames) => {
            return Promise.all(
              cacheNames.map((cacheName) => caches.delete(cacheName))
            );
          }),
          // Unregister
          self.registration.unregister(),
        ]).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;
      
    default:
      console.log('[SW] Unknown message type:', data.type);
  }
});

// ============================================================================
// BACKGROUND SYNC (Optional - for offline data sync)
// ============================================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  try {
    console.log('[SW] Syncing offline data...');
    
    // Implement your offline data sync logic here
    // For example: sync form submissions, user actions, etc.
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ 
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error; // Re-throw to retry sync later
  }
}

// ============================================================================
// PUSH NOTIFICATIONS (Optional)
// ============================================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data?.text() || 'New notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Drena', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('[SW] Service worker script loaded');