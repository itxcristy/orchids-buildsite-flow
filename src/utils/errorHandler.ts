import { ERROR_TYPES, ERROR_MESSAGES, ROUTES, type ErrorType } from '@/constants';
import { useAppStore } from '@/stores/appStore';

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  details?: string;
  code?: string;
  statusCode?: number;
  retryable: boolean;
  requiresAuth: boolean;
  userMessage: string;
}

export class ErrorHandler {
  static analyzeError(error: any): ErrorInfo {
    const errorMessage = typeof error === 'string' ? error : error?.message || '';
    const errorCode = error?.code || error?.error_code || '';
    const statusCode = error?.status || error?.statusCode;

    // Determine error type
    let type: ErrorType = ERROR_TYPES.UNKNOWN;
    let retryable = false;
    let requiresAuth = false;
    let userMessage: string = ERROR_MESSAGES.SERVER_ERROR;

    if (errorMessage.toLowerCase().includes('network') || 
        errorMessage.toLowerCase().includes('fetch') ||
        statusCode >= 500) {
      type = ERROR_TYPES.NETWORK;
      retryable = true;
      userMessage = ERROR_MESSAGES.NETWORK_ERROR;
    } else if (errorMessage.toLowerCase().includes('auth') || 
               errorMessage.toLowerCase().includes('unauthorized') ||
               statusCode === 401) {
      type = ERROR_TYPES.AUTH;
      requiresAuth = true;
      userMessage = ERROR_MESSAGES.UNAUTHORIZED;
    } else if (errorMessage.toLowerCase().includes('permission') || 
               errorMessage.toLowerCase().includes('forbidden') ||
               statusCode === 403) {
      type = ERROR_TYPES.PERMISSION;
      userMessage = ERROR_MESSAGES.FORBIDDEN;
    } else if (errorMessage.toLowerCase().includes('validation') ||
               statusCode === 400) {
      type = ERROR_TYPES.VALIDATION;
      userMessage = ERROR_MESSAGES.VALIDATION_FAILED;
    } else if (statusCode === 404) {
      userMessage = ERROR_MESSAGES.NOT_FOUND;
    }

    return {
      type,
      message: errorMessage,
      details: error?.details || error?.error_description,
      code: errorCode,
      statusCode,
      retryable,
      requiresAuth,
      userMessage
    };
  }

  static handleError(error: any, options: {
    showNotification?: boolean;
    logToConsole?: boolean;
    redirectOnAuth?: boolean;
  } = {}): ErrorInfo {
    const {
      showNotification = true,
      logToConsole = true,
      redirectOnAuth = true
    } = options;

    const errorInfo = this.analyzeError(error);

    // Log to console in development
    if (logToConsole && process.env.NODE_ENV === 'development') {
      console.error('Error Handler:', {
        original: error,
        analyzed: errorInfo
      });
    }

    // Show notification
    if (showNotification) {
      const { addNotification } = useAppStore.getState();
      addNotification({
        type: 'error',
        title: this.getErrorTitle(errorInfo.type),
        message: errorInfo.userMessage,
        priority: errorInfo.type === ERROR_TYPES.AUTH ? 'high' : 'medium'
      });
    }

    // Handle auth redirects
    if (redirectOnAuth && errorInfo.requiresAuth) {
      this.redirectToAuth();
    }

    return errorInfo;
  }

  static handleSuccess(message: string, options: {
    showNotification?: boolean;
    title?: string;
  } = {}) {
    const { showNotification = true, title = 'Success' } = options;

    if (showNotification) {
      const { addNotification } = useAppStore.getState();
      addNotification({
        type: 'success',
        title,
        message,
        priority: 'low'
      });
    }
  }

  private static getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ERROR_TYPES.NETWORK:
        return 'Connection Error';
      case ERROR_TYPES.AUTH:
        return 'Authentication Required';
      case ERROR_TYPES.PERMISSION:
        return 'Access Denied';
      case ERROR_TYPES.VALIDATION:
        return 'Validation Error';
      default:
        return 'Error';
    }
  }

  private static redirectToAuth() {
    // Use setTimeout to avoid issues with React state updates
    setTimeout(() => {
      window.location.href = ROUTES.AUTH;
    }, 100);
  }

  static createRetryableOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): () => Promise<T> {
    return async () => {
      let lastError: any;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          const errorInfo = this.analyzeError(error);

          // Don't retry non-retryable errors
          if (!errorInfo.retryable || attempt === maxRetries) {
            throw error;
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      }

      throw lastError;
    };
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorOptions?: Parameters<typeof ErrorHandler.handleError>[1]
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, errorOptions);
      return null;
    }
  }
}