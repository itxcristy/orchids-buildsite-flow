/**
 * Centralized Port Configuration
 * 
 * All port configuration should use this module to ensure consistency
 * across the application. Ports are read from environment variables with
 * sensible defaults matching the current hardcoded values.
 */

/**
 * Validate port number (must be integer between 1 and 65535)
 * @param {number} port - Port number to validate
 * @returns {boolean} - True if valid
 */
function validatePort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Parse port from environment variable with fallback
 * @param {string} envVar - Environment variable name
 * @param {number} defaultValue - Default port value
 * @returns {number} - Parsed port number
 */
function parsePort(envVar, defaultValue) {
  const value = process.env[envVar];
  if (!value) {
    return defaultValue;
  }
  
  const port = parseInt(value, 10);
  if (isNaN(port) || !validatePort(port)) {
    console.warn(`[PortConfig] Invalid port value for ${envVar}: ${value}. Using default: ${defaultValue}`);
    return defaultValue;
  }
  
  return port;
}

/**
 * Port Configuration Constants
 */
const PORTS = {
  // Frontend Ports
  FRONTEND_DEV: parsePort('VITE_DEV_PORT', 5173),
  FRONTEND_PROD: parsePort('FRONTEND_PORT', 80),
  
  // Backend Ports
  BACKEND: parsePort('PORT', parsePort('BACKEND_PORT', 3000)),
  
  // Database Ports
  POSTGRES: parsePort('POSTGRES_PORT', parsePort('DATABASE_PORT', 5432)),
  
  // Redis Ports
  REDIS: parsePort('REDIS_PORT', 6379),
  
  // SMTP Ports
  SMTP: parsePort('SMTP_PORT', 2525),
};

/**
 * Get frontend URL based on environment
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {string} - Frontend URL
 */
function getFrontendUrl(isDevelopment = false) {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  const port = isDevelopment ? PORTS.FRONTEND_DEV : PORTS.FRONTEND_PROD;
  const protocol = isDevelopment ? 'http' : 'https';
  const hostname = isDevelopment ? 'localhost' : (process.env.FRONTEND_HOST || 'localhost');
  
  // Don't include port for standard ports (80, 443)
  if ((!isDevelopment && port === 80) || (isDevelopment && port === 80)) {
    return `${protocol}://${hostname}`;
  }
  
  return `${protocol}://${hostname}:${port}`;
}

/**
 * Get backend API URL
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {string} - Backend API URL
 */
function getBackendUrl(isDevelopment = false) {
  if (process.env.API_URL) {
    return process.env.API_URL;
  }
  
  const port = PORTS.BACKEND;
  const protocol = isDevelopment ? 'http' : 'https';
  const hostname = isDevelopment ? 'localhost' : (process.env.BACKEND_HOST || 'localhost');
  
  return `${protocol}://${hostname}:${port}`;
}

/**
 * Build CORS origins dynamically from environment
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {string[]} - Array of allowed CORS origins
 */
function buildCorsOrigins(isDevelopment = false) {
  const origins = [];
  
  // Add origins from CORS_ORIGINS environment variable (highest priority)
  if (process.env.CORS_ORIGINS) {
    const envOrigins = process.env.CORS_ORIGINS
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
    origins.push(...envOrigins);
  }
  
  // Add frontend URL if set (production)
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
    // Also add www variant if not already present
    try {
      const frontendUrl = new URL(process.env.FRONTEND_URL);
      if (!frontendUrl.hostname.startsWith('www.')) {
        frontendUrl.hostname = `www.${frontendUrl.hostname}`;
        origins.push(frontendUrl.toString().replace(/\/$/, ''));
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  // Add API URL base (without /api) if set (for production)
  if (process.env.VITE_API_URL) {
    try {
      const apiUrl = new URL(process.env.VITE_API_URL);
      apiUrl.pathname = '';
      const baseUrl = apiUrl.toString().replace(/\/$/, '');
      origins.push(baseUrl);
      // Also add https variant if http
      if (apiUrl.protocol === 'http:') {
        apiUrl.protocol = 'https:';
        origins.push(apiUrl.toString().replace(/\/$/, ''));
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  // Add development origins if in development
  if (isDevelopment) {
    origins.push(
      `http://localhost:${PORTS.FRONTEND_DEV}`,
      `http://localhost:${PORTS.FRONTEND_DEV + 1}`, // Vite alternate
      `http://localhost:${PORTS.BACKEND}`,
      `http://localhost:${PORTS.BACKEND + 1}`, // React alternate
      `http://localhost:8080`,
      `http://localhost:8081`,
      `http://127.0.0.1:${PORTS.FRONTEND_DEV}`,
      `http://127.0.0.1:${PORTS.FRONTEND_DEV + 1}`,
      `http://127.0.0.1:${PORTS.BACKEND}`,
    );
  }
  
  // Remove duplicates and empty strings
  return [...new Set(origins.filter(Boolean))];
}

module.exports = {
  PORTS,
  validatePort,
  parsePort,
  getFrontendUrl,
  getBackendUrl,
  buildCorsOrigins,
};

