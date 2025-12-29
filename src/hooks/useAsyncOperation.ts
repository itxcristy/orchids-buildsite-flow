import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  success: boolean;
}

export interface AsyncOptions {
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export const useAsyncOperation = <T = any>(options: AsyncOptions = {}) => {
  const {
    retryCount = 3,
    retryDelay = 1000,
    timeout = 30000,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    loading: false,
    error: null,
    data: null,
    success: false
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRetryRef = useRef(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Execute async operation
  const execute = useCallback(async (
    asyncFunction: (signal?: AbortSignal) => Promise<T>
  ): Promise<T | null> => {
    cleanup();
    currentRetryRef.current = 0;

    const executeWithRetry = async (): Promise<T | null> => {
      try {
        // Create new abort controller for this operation
        abortControllerRef.current = new AbortController();
        
        setState(prev => ({
          ...prev,
          loading: true,
          error: null,
          success: false
        }));

        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        }, timeout);

        try {
          const result = await asyncFunction(abortControllerRef.current.signal);
          clearTimeout(timeoutId);
          
          setState({
            loading: false,
            error: null,
            data: result,
            success: true
          });

          onSuccess?.(result);
          return result;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error: any) {
        // Handle abort
        if (error.name === 'AbortError') {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Operation was cancelled'
          }));
          return null;
        }

        // Check if we should retry
        if (currentRetryRef.current < retryCount) {
          currentRetryRef.current++;
          
          setState(prev => ({
            ...prev,
            loading: true,
            error: `Attempt ${currentRetryRef.current}/${retryCount + 1} failed: ${error.message}`
          }));

          // Wait before retry
          return new Promise((resolve) => {
            retryTimeoutRef.current = setTimeout(async () => {
              const result = await executeWithRetry();
              resolve(result);
            }, retryDelay * currentRetryRef.current); // Exponential backoff
          });
        } else {
          // Max retries reached
          const errorMessage = error.message || 'Operation failed';
          setState({
            loading: false,
            error: errorMessage,
            data: null,
            success: false
          });

          onError?.(error);
          return null;
        }
      }
    };

    return executeWithRetry();
  }, [retryCount, retryDelay, timeout, onSuccess, onError, cleanup]);

  // Reset state
  const reset = useCallback(() => {
    cleanup();
    setState({
      loading: false,
      error: null,
      data: null,
      success: false
    });
  }, [cleanup]);

  // Cancel operation
  const cancel = useCallback(() => {
    cleanup();
    setState(prev => ({
      ...prev,
      loading: false,
      error: prev.error || 'Operation cancelled'
    }));
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ...state,
    execute,
    reset,
    cancel,
    isRetrying: currentRetryRef.current > 0 && state.loading
  };
};

// Utility hook for simple async operations
export const useAsyncCallback = <T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  options: AsyncOptions = {}
) => {
  const { execute, ...state } = useAsyncOperation<R>(options);

  const callback = useCallback((...args: T) => {
    return execute(() => asyncFunction(...args));
  }, [execute, asyncFunction]);

  return [callback, state] as const;
};

// Hook for loading states with debouncing
export const useLoadingState = (delay = 300) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (loading) {
      // Show loading after delay to prevent flashing
      timeoutRef.current = setTimeout(() => {
        setShowLoading(true);
      }, delay);
    } else {
      // Hide loading immediately
      setShowLoading(false);
    }
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    showLoading,
    setLoading
  };
};