/**
 * Rate Limiting Middleware
 * Protects against brute force attacks and DDoS
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 1000 requests per 15 minutes per IP (increased for dashboard usage)
 * Dashboard makes many queries (notifications, projects, etc.)
 * OPTIONS requests don't count (CORS preflight)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window (increased for dashboard usage)
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for OPTIONS requests (CORS preflight - don't count)
    if (req.method === 'OPTIONS') {
      return true;
    }
    
    // Skip rate limiting for health checks and system-health endpoints
    const path = req.path || req.url || '';
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    
    // Skip for health endpoints
    if (fullPath === '/health' || fullPath === '/api/health') {
      return true;
    }
    
    // Skip for system-health endpoints (monitoring needs frequent updates)
    if (fullPath.includes('/system-health')) {
      return true;
    }
    
    return false;
  },
  // Use IP from X-Forwarded-For header if behind proxy
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress;
  },
  // Skip successful requests for certain endpoints (reduce false positives)
  skipSuccessfulRequests: false, // Count all requests to be safe
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 login attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many login attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress;
  },
});

/**
 * Password reset rate limiter
 * 3 password reset requests per hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    success: false,
    error: 'Too many password reset requests',
    message: 'Too many password reset requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress;
  },
});

/**
 * File upload rate limiter
 * 50 uploads per hour per IP
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress;
  },
});

/**
 * Two-factor authentication rate limiter
 * 10 2FA attempts per 15 minutes per IP
 */
const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 2FA attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many 2FA attempts',
    message: 'Too many two-factor authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress;
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  twoFactorLimiter,
};

