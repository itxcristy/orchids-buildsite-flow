/**
 * Centralized Error Handling Middleware
 */

const logger = require('../utils/logger');

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors and pass them to error handler
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped route handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // Log error with structured logging
  logger.error('API Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id,
    agencyDatabase: req.user?.agencyDatabase,
    statusCode: err.statusCode || 500,
  });

  // Ensure CORS headers are set even on errors
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'false');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agency-Database, X-Requested-With, X-API-Key');
  }

  const statusCode = err.statusCode || 500;
  const errorResponse = {
    error: err.message || 'Internal server error',
    detail: err.detail,
    code: err.code,
  };

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.error = 'Internal server error';
    errorResponse.detail = undefined;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = {
  asyncHandler,
  errorHandler,
};
