/**
 * Structured Logging with Winston
 * Provides consistent, structured logging across the application
 */

const winston = require('winston');
const path = require('path');

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logs directory if it doesn't exist
const logsDir = process.env.LOG_DIR || '/app/logs';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    level: logLevel,
  })
);

// File transports (production only)
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'buildflow-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: process.env.NODE_ENV === 'production' ? [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat,
    })
  ] : [],
  rejectionHandlers: process.env.NODE_ENV === 'production' ? [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat,
    })
  ] : [],
});

/**
 * Log HTTP request
 */
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    agencyDatabase: req.user?.agencyDatabase,
  };

  if (res.statusCode >= 500) {
    logger.error('HTTP Request Error', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('HTTP Request Warning', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

/**
 * Log database query
 */
logger.logQuery = (query, duration, params = null) => {
  const logData = {
    query: query.substring(0, 200), // Truncate long queries
    duration: `${duration}ms`,
    hasParams: params !== null,
  };

  if (duration > 1000) {
    logger.warn('Slow Query', logData);
  } else if (duration > 500) {
    logger.info('Query', logData);
  } else {
    logger.debug('Query', logData);
  }
};

/**
 * Log security event
 */
logger.logSecurity = (event, details) => {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log authentication event
 */
logger.logAuth = (event, details) => {
  logger.info('Authentication', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

module.exports = logger;

