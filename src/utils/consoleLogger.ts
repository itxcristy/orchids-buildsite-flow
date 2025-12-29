/**
 * Console Log Capture Utility
 * Intercepts console errors and warnings for ticket reporting
 */

export interface ConsoleLogEntry {
  level: 'error' | 'warn' | 'info' | 'log';
  message: string;
  timestamp: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
}

class ConsoleLogger {
  private logs: ConsoleLogEntry[] = [];
  private maxLogs = 100; // Keep last 100 logs
  private originalConsole: {
    error: typeof console.error;
    warn: typeof console.warn;
    log: typeof console.log;
    info: typeof console.info;
  };

  constructor() {
    try {
      // Store original console methods
      this.originalConsole = {
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        log: console.log.bind(console),
        info: console.info.bind(console),
      };

      this.setupInterceptors();
      this.setupErrorHandlers();
    } catch (error) {
      // Fallback if console interception fails
      console.warn('Console logger initialization failed:', error);
      this.originalConsole = {
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        log: console.log.bind(console),
        info: console.info.bind(console),
      };
    }
  }

  private setupInterceptors() {
    try {
      // Intercept console.error
      const originalError = console.error;
      console.error = (...args: any[]) => {
        this.captureLog('error', args);
        originalError.apply(console, args);
      };

      // Intercept console.warn
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        this.captureLog('warn', args);
        originalWarn.apply(console, args);
      };

      // Intercept console.log (optional, for debugging)
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        this.captureLog('log', args);
        originalLog.apply(console, args);
      };

      // Intercept console.info
      const originalInfo = console.info;
      console.info = (...args: any[]) => {
        this.captureLog('info', args);
        originalInfo.apply(console, args);
      };
    } catch (error) {
      // Silently fail if interception fails
      this.originalConsole.error('Failed to setup console interceptors:', error);
    }
  }

  private setupErrorHandlers() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureLog('error', [
        event.message,
        event.filename,
        event.lineno,
        event.colno,
        event.error?.stack,
      ]);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog('error', [
        `Unhandled Promise Rejection: ${event.reason}`,
        event.reason?.stack || '',
      ]);
    });
  }

  private captureLog(level: ConsoleLogEntry['level'], args: any[]) {
    try {
      const message = args
        .map((arg) => {
          if (arg instanceof Error) {
            return `${arg.message}\n${arg.stack || ''}`;
          }
          if (typeof arg === 'object') {
            return JSON.stringify(arg, null, 2);
          }
          return String(arg);
        })
        .join(' ');

      const entry: ConsoleLogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
      };

      // Try to extract stack trace from error objects
      if (args[0] instanceof Error && args[0].stack) {
        entry.stack = args[0].stack;
      } else if (typeof args[0] === 'string' && args[1]?.stack) {
        entry.stack = args[1].stack;
      }

      this.logs.push(entry);

      // Keep only last maxLogs entries
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
    } catch (error) {
      // Silently fail if logging fails
      this.originalConsole.error('Failed to capture log:', error);
    }
  }

  /**
   * Get all captured logs
   */
  getLogs(): ConsoleLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: ConsoleLogEntry['level']): ConsoleLogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Get recent error and warning logs (most relevant for tickets)
   */
  getErrorLogs(limit: number = 50): ConsoleLogEntry[] {
    return this.logs
      .filter((log) => log.level === 'error' || log.level === 'warn')
      .slice(-limit);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    try {
      return {
        userAgent: navigator?.userAgent || 'Unknown',
        platform: navigator?.platform || 'Unknown',
        language: navigator?.language || 'Unknown',
        cookieEnabled: navigator?.cookieEnabled ?? false,
        onLine: navigator?.onLine ?? false,
        screen: {
          width: window?.screen?.width || 0,
          height: window?.screen?.height || 0,
          availWidth: window?.screen?.availWidth || 0,
          availHeight: window?.screen?.availHeight || 0,
        },
        viewport: {
          width: window?.innerWidth || 0,
          height: window?.innerHeight || 0,
        },
        url: window?.location?.href || 'Unknown',
        referrer: document?.referrer || 'None',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: 'Failed to collect browser info',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create singleton instance
let consoleLoggerInstance: ConsoleLogger | null = null;

export function getConsoleLogger(): ConsoleLogger {
  if (!consoleLoggerInstance) {
    consoleLoggerInstance = new ConsoleLogger();
  }
  return consoleLoggerInstance;
}

// Initialize on module load
if (typeof window !== 'undefined') {
  getConsoleLogger();
}

/**
 * Environment-aware logging helpers for application code.
 * Use these instead of raw console.log / console.warn for non-critical messages.
 * - In development: logs go through the normal console (and are captured for tickets).
 * - In production: debug/info/warn logs are suppressed to keep the console clean.
 */

export const logDebug = (...args: unknown[]): void => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

export const logInfo = (...args: unknown[]): void => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(...args);
  }
};

export const logWarn = (...args: unknown[]): void => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
};

// For errors, we still allow logging in production, but callers should also
// surface a user-facing message (toast, notification, etc.) where appropriate.
export const logError = (...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.error(...args);
};
