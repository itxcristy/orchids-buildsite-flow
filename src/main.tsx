import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Service Worker Management - Aggressive unregistration if causing issues
if ('serviceWorker' in navigator) {
  // First, immediately unregister ALL existing service workers
  // This prevents any old service workers from interfering
  const forceUnregisterAll = async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        try {
          // Send unregister message
          if (registration.active) {
            registration.active.postMessage({ type: 'UNREGISTER' });
          }
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'UNREGISTER' });
          }
          if (registration.installing) {
            registration.installing.postMessage({ type: 'UNREGISTER' });
          }
          
          // Force unregister
          await registration.unregister();
          console.log('[SW] Unregistered existing service worker');
        } catch (error) {
          console.error('[SW] Error unregistering:', error);
        }
      }
      
      // Clear all caches
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[SW] Cleared all caches');
      } catch (error) {
        console.error('[SW] Error clearing caches:', error);
      }
    } catch (error) {
      console.error('[SW] Error in force unregister:', error);
    }
  };

  // Run immediately on page load
  forceUnregisterAll();
  
  // Also run after a short delay to catch any that register later
  setTimeout(forceUnregisterAll, 100);
  setTimeout(forceUnregisterAll, 1000);
  
  // DISABLED: Service Worker registration for now to prevent asset loading issues
  // Uncomment below if you want to enable PWA features later
  /*
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      // Only register after ensuring old ones are gone
      setTimeout(() => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      }, 2000);
    });
  }
  */
}

// Unregister ServiceWorker in development to avoid caching issues
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // Immediately unregister all service workers
  const unregisterServiceWorkers = async () => {
    try {
      // Get all registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      // Unregister all service workers
      const unregisterPromises = registrations.map(async (registration) => {
        try {
          // First, try to update and skip waiting
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (registration.installing) {
            registration.installing.postMessage({ type: 'SKIP_WAITING' });
          }
          
          // Unregister the service worker
          const success = await registration.unregister();
          if (success) {
            console.log('ServiceWorker unregistered in development mode');
          }
          return success;
        } catch (error) {
          console.error('Error unregistering service worker:', error);
          return false;
        }
      });

      await Promise.all(unregisterPromises);

      // Clear all caches to ensure clean state
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            try {
              console.log('Clearing cache:', cacheName);
              await caches.delete(cacheName);
            } catch (error) {
              console.error('Error deleting cache:', cacheName, error);
            }
          })
        );
        console.log('All caches cleared');
      } catch (error) {
        console.error('Error clearing caches:', error);
      }

      // Force reload if there's still a controller
      if (navigator.serviceWorker.controller) {
        console.log('Service worker controller still active, reloading page...');
        // Give it a moment, then reload
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (error) {
      console.error('Error in service worker unregistration:', error);
    }
  };

  // Run immediately
  unregisterServiceWorkers();
  
  // Also run on page load to catch any that might have been registered
  window.addEventListener('load', () => {
    setTimeout(unregisterServiceWorkers, 100);
  });
}

if (typeof window !== "undefined") {
  const sendToParent = (data: any) => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(data, "*");
      }
    } catch {}
  };

  window.addEventListener("error", (event) => {
    // Send structured payload to parent iframe
    sendToParent({
      type: "ERROR_CAPTURED",
      error: {
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        source: "window.onerror",
      },
      timestamp: Date.now(),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = event.reason;
    const message =
      typeof reason === "object" && reason?.message
        ? String(reason.message)
        : String(reason);
    const stack = typeof reason === "object" ? reason?.stack : undefined;

    // Mirror to parent iframe as well
    sendToParent({
      type: "ERROR_CAPTURED",
      error: {
        message,
        stack,
        filename: undefined,
        lineno: undefined,
        colno: undefined,
        source: "unhandledrejection",
      },
      timestamp: Date.now(),
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);