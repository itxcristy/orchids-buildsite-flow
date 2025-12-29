/**
 * Express Middleware Configuration
 */

const cors = require('cors');
const express = require('express');
const { JSON_LIMIT } = require('./constants');
const { buildCorsOrigins, PORTS } = require('./ports');

/**
 * Build CORS options from environment variables.
 * Supports multiple frontends (localhost, LAN IPs, production domains).
 */
function buildCorsOptions() {
  const rawOrigins = process.env.CORS_ORIGINS || '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Debug logging
  console.log('[CORS] Raw CORS_ORIGINS from env:', rawOrigins);
  console.log('[CORS] Parsed allowed origins:', allowedOrigins);

  const isDevelopment = process.env.NODE_ENV !== 'production' || 
                        process.env.VITE_APP_ENVIRONMENT === 'development';
  
  // Build CORS origins dynamically from port configuration
  const dynamicOrigins = buildCorsOrigins(isDevelopment);
  
  // Common development origins (Vite, React, etc.) - always allow localhost for local dev/testing
  // These are now built dynamically from port configuration
  const commonDevOrigins = [
    `http://localhost:${PORTS.FRONTEND_DEV}`,  // Vite default
    `http://localhost:${PORTS.FRONTEND_DEV + 1}`,  // Vite alternate
    `http://localhost:${PORTS.BACKEND}`,  // Backend default
    `http://localhost:${PORTS.BACKEND + 1}`,  // Backend alternate
    'http://localhost:8080',  // Vue/other
    'http://localhost:8081',  // Vue alternate
    `http://127.0.0.1:${PORTS.FRONTEND_DEV}`,
    `http://127.0.0.1:${PORTS.FRONTEND_DEV + 1}`,
    `http://127.0.0.1:${PORTS.BACKEND}`,
  ];

  // Helper to check if origin is localhost or IP address (for VPS deployments)
  const isLocalhost = (origin) => {
    if (!origin) return false;
    try {
      const url = new URL(origin);
      const hostname = url.hostname.toLowerCase();
      const port = url.port || (url.protocol === 'https:' ? '443' : '80');
      
      // Only allow specific localhost ports for development
      const allowedLocalhostPorts = [
        '5173', // Vite default
        '5174', // Vite alternate
        '3000', // Backend
        '3001', // Backend alternate
        '8080', // Alternative dev server
        '8081', // Alternative dev server
        '80',   // HTTP default
        '443',  // HTTPS default
      ];
      
      // Strict localhost check - only allow if port is in whitelist
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return allowedLocalhostPorts.includes(port) || isDevelopment;
      }
      
      // Allow IP addresses (for VPS deployments without domain)
      // Match IPv4 pattern (e.g., 72.61.243.152)
      const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipv4Pattern.test(hostname)) {
        return true; // Always allow IP addresses
      }
      
      // In production, don't allow private IP ranges (unless it's explicitly an IP)
      if (!isDevelopment) {
        return false;
      }
      
      // In development only, allow private IPs
      return hostname.startsWith('192.168.') || 
             hostname.startsWith('10.') ||
             (hostname.startsWith('172.') && 
              parseInt(hostname.split('.')[1] || '0', 10) >= 16 && 
              parseInt(hostname.split('.')[1] || '0', 10) <= 31);
    } catch {
      return false;
    }
  };

  // Helper to check if origin matches any allowed origin (with or without port/protocol)
  const matchesAllowedOrigin = (origin, allowedList) => {
    if (!origin) return false;
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.hostname.toLowerCase();
      const originPort = originUrl.port || (originUrl.protocol === 'https:' ? '443' : '80');
      
      for (const allowed of allowedList) {
        try {
          const allowedUrl = new URL(allowed);
          const allowedHost = allowedUrl.hostname.toLowerCase();
          const allowedPort = allowedUrl.port || (allowedUrl.protocol === 'https:' ? '443' : '80');
          
          // Match hostname and port
          if (originHost === allowedHost && originPort === allowedPort) {
            return true;
          }
          // Also match without port (default ports)
          if (originHost === allowedHost && 
              ((originPort === '80' && !allowedUrl.port) || 
               (originPort === '443' && !allowedUrl.port))) {
            return true;
          }
        } catch {
          // If allowed is not a full URL, try string matching
          if (origin.includes(allowed) || allowed.includes(origin)) {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  // Merge dynamic origins with environment origins
  const allOrigins = [...new Set([...dynamicOrigins, ...allowedOrigins, ...commonDevOrigins])];
  
  // In development, allow all if no explicit origins, or merge with common dev origins
  const allowAll = isDevelopment && allOrigins.length === 0;
  const finalAllowedOrigins = isDevelopment && allOrigins.length > 0
    ? allOrigins
    : allOrigins.length > 0 ? allOrigins : allowedOrigins;

  /** @type {cors.CorsOptions} */
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser / same-origin requests (no Origin header)
      if (!origin) {
        return callback(null, true);
      }

      // Always allow localhost origins (for local development and Docker testing)
      if (isLocalhost(origin)) {
        return callback(null, true);
      }

      // Normalize origin for comparison (remove trailing slash, lowercase)
      const normalizedOrigin = origin.toLowerCase().replace(/\/$/, '');

      // Check exact match first (normalized)
      if (allowAll) {
        return callback(null, true);
      }

      // Check exact match in allowed origins (normalized)
      const normalizedAllowed = finalAllowedOrigins.map(o => o.toLowerCase().replace(/\/$/, ''));
      if (normalizedAllowed.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Check if origin matches any allowed origin (flexible matching)
      if (matchesAllowedOrigin(origin, finalAllowedOrigins)) {
        return callback(null, true);
      }

      // Additional check: match by hostname (ignore protocol/port differences for same domain)
      try {
        const originUrl = new URL(origin);
        const originHost = originUrl.hostname.toLowerCase();
        const originBaseHost = originHost.replace(/^www\./, '');
        
        for (const allowed of finalAllowedOrigins) {
          try {
            const allowedUrl = new URL(allowed);
            const allowedHost = allowedUrl.hostname.toLowerCase();
            const allowedBaseHost = allowedHost.replace(/^www\./, '');
            
            // Match if hostnames are the same (e.g., www.dezignbuild.site matches dezignbuild.site)
            if (originHost === allowedHost || 
                originBaseHost === allowedBaseHost ||
                originHost === allowedBaseHost ||
                originBaseHost === allowedHost) {
              console.log('[CORS] ✅ Allowed origin (hostname match):', origin, 'matched', allowed);
              return callback(null, true);
            }
          } catch {
            // If allowed is not a full URL, try string matching
            const allowedLower = allowed.toLowerCase();
            if (originHost.includes(allowedLower) || allowedLower.includes(originHost) ||
                originBaseHost.includes(allowedLower) || allowedLower.includes(originBaseHost)) {
              console.log('[CORS] ✅ Allowed origin (string match):', origin, 'matched', allowed);
              return callback(null, true);
            }
          }
        }
      } catch (e) {
        // If origin is not a valid URL, log and continue to error
        console.warn('[CORS] Invalid origin URL:', origin, e.message);
      }

      console.warn('[CORS] ❌ Blocked origin:', origin);
      console.warn('[CORS] Normalized origin:', normalizedOrigin);
      console.warn('[CORS] Allowed origins count:', finalAllowedOrigins.length);
      console.warn('[CORS] First 3 allowed origins:', finalAllowedOrigins.slice(0, 3));
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Agency-Database',
      'X-Requested-With',
      'X-API-Key',
    ],
    credentials: false, // Auth is header-based, not cookie-based
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  return corsOptions;
}

/**
 * Configure and return Express middleware
 * @param {Express} app - Express application instance
 */
function configureMiddleware(app) {
  // CORS middleware
  app.use(cors(buildCorsOptions()));

  // Handle preflight OPTIONS requests explicitly with error handling
  // This must NEVER crash - always return a valid CORS response
  app.options('*', (req, res) => {
    try {
      const origin = req.headers.origin;
      
      // Always set CORS headers for OPTIONS requests (let CORS middleware handle validation)
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agency-Database, X-Requested-With, X-API-Key');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      }
      res.sendStatus(204);
    } catch (error) {
      // Error handling for OPTIONS requests - always respond, never crash
      console.error('[CORS] Error handling OPTIONS request:', error.message);
      const origin = req.headers.origin;
      if (origin) {
        try {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agency-Database, X-Requested-With, X-API-Key');
        } catch (headerError) {
          console.error('[CORS] Error setting headers:', headerError.message);
        }
      }
      try {
        res.sendStatus(204); // Always respond, even on error
      } catch (sendError) {
        console.error('[CORS] Error sending response:', sendError.message);
      }
    }
  });

  // JSON body parser with 50MB limit for base64 encoded images
  app.use(express.json({ limit: JSON_LIMIT }));

  // URL-encoded body parser
  app.use(express.urlencoded({ extended: true, limit: JSON_LIMIT }));
}

module.exports = {
  configureMiddleware,
};
