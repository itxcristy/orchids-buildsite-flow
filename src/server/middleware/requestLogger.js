/**
 * Request Logging Middleware
 * Logs all HTTP requests with structured data
 */

const logger = require('../utils/logger');

/**
 * Request logging middleware
 * Logs request details and response time
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log request start
  logger.debug('Request Started', {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
  });

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Log request completion
    logger.logRequest(req, res, responseTime);
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

module.exports = requestLogger;

