import { env } from './env';

/**
 * Determine if a hostname represents localhost.
 */
function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Parse VITE_API_URL into a URL object if possible.
 */
function getEnvApiUrl(): URL | null {
  try {
    const raw = env.VITE_API_URL;
    if (!raw || typeof raw !== 'string') return null;
    
    // Validate the string is not empty
    if (raw.trim() === '') return null;
    
    try {
      const url = new URL(raw);
      // Validate the URL object was created correctly
      if (!url || typeof url !== 'object') return null;
      // Ensure searchParams exists (some environments might have issues)
      if (url.searchParams === undefined) {
        console.warn('[API Config] URL object missing searchParams, using fallback');
        return null;
      }
      return url;
    } catch (urlError) {
      // Invalid URL format - will fall back to default
      if (typeof window !== 'undefined' && window.console) {
        console.warn('[API Config] Invalid VITE_API_URL value:', raw, urlError);
      }
      return null;
    }
  } catch (error) {
    // Catch any errors accessing env.VITE_API_URL
    if (typeof window !== 'undefined' && window.console) {
      console.warn('[API Config] Error accessing VITE_API_URL:', error);
    }
    return null;
  }
}

/**
 * Compute the effective API root (including `/api`) for the current environment.
 * This function centralizes all logic for localhost, LAN IPs, and production domains.
 *
 * Examples:
 * - Local dev: http://localhost:3000/api
 * - LAN dev:   http://10.x.x.x:3000/api
 * - Prod:      https://api.example.com/api (if VITE_API_URL is set accordingly)
 */
export function getApiRoot(): string {
  const envUrl = getEnvApiUrl();

  // Browser-aware logic
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;

    const browserIsLocalhost = isLocalhostHost(hostname);
    const envIsValid = !!envUrl;
    const envIsLocalhost = envIsValid && envUrl && isLocalhostHost(envUrl.hostname);

    // Browser on localhost (developer machine)
    if (browserIsLocalhost) {
      // Always use localhost with backend port when browser is on localhost
      // This ensures local development works regardless of VITE_API_URL setting
      const backendPort = typeof process !== 'undefined' && process.env?.PORT 
        ? process.env.PORT 
        : typeof process !== 'undefined' && process.env?.BACKEND_PORT
        ? process.env.BACKEND_PORT
        : '3000';
      return `${protocol}//localhost:${backendPort}/api`;
    }

    // Browser on LAN IP or real domain (PRODUCTION)
    // In production, always prefer VITE_API_URL if it's set and valid
    if (envIsValid && envUrl) {
      try {
        // Ensure the URL includes /api if not already present
        let apiUrl = envUrl.toString().replace(/\/$/, '');
        if (!apiUrl.endsWith('/api')) {
          // If VITE_API_URL doesn't end with /api, add it
          apiUrl = `${apiUrl}${apiUrl.endsWith('/') ? '' : '/'}api`;
        }
        
        // Log in development for debugging
        if (import.meta.env.DEV || hostname === 'localhost') {
          console.log('[API Config] Using VITE_API_URL:', apiUrl);
        }
        
        return apiUrl;
      } catch (urlError) {
        console.warn('[API Config] Error converting URL to string:', urlError);
        // Fall through to default behavior
      }
    }

    // VITE_API_URL is missing or invalid, but browser is on a real domain.
    // Derive API root from the current host and the backend port from environment.
    const backendPort = typeof process !== 'undefined' && process.env?.PORT 
      ? process.env.PORT 
      : typeof process !== 'undefined' && process.env?.BACKEND_PORT
      ? process.env.BACKEND_PORT
      : '3000';
    const derivedRoot = `${protocol}//${hostname}:${backendPort}/api`;
    
    // Log warning in production if VITE_API_URL is missing
    if (import.meta.env.PROD && !envIsValid) {
      console.warn('[API Config] VITE_API_URL not set in production! Using derived URL:', derivedRoot);
    }
    
    return derivedRoot.replace(/\/$/, '');
  }

  // Non-browser / SSR fallback – use env when possible
  if (envUrl) {
    try {
      let apiUrl = envUrl.toString().replace(/\/$/, '');
      if (!apiUrl.endsWith('/api')) {
        apiUrl = `${apiUrl}${apiUrl.endsWith('/') ? '' : '/'}api`;
      }
      return apiUrl;
    } catch (urlError) {
      console.warn('[API Config] Error converting URL to string in SSR fallback:', urlError);
      // Fall through to default
    }
  }

  // Last-resort default - use environment variable or fallback to 3000
  const backendPort = typeof process !== 'undefined' && process.env?.PORT 
    ? process.env.PORT 
    : typeof process !== 'undefined' && process.env?.BACKEND_PORT
    ? process.env.BACKEND_PORT
    : '3000';
  return `http://localhost:${backendPort}/api`;
}

/**
 * Get the API base URL without the `/api` suffix.
 * Useful for code that manually appends `/api/...`.
 */
export function getApiBaseUrl(): string {
  const root = getApiRoot();
  return root.replace(/\/api\/?$/, '');
}

