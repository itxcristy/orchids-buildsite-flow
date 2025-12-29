import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Shield, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ROUTES, ERROR_TYPES, RETRY_CONFIG } from '@/constants';
import { ServiceUnavailable } from './ServiceUnavailable';

interface ErrorBoundaryState {
  hasError: boolean;
  errorType: 'network' | 'auth' | 'permission' | 'unknown';
  errorMessage?: string;
  errorDetails?: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo) => ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorType: 'unknown',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorMessage = error.message.toLowerCase();
    
    // Don't show error boundary for module loading errors - these are usually network/build issues
    // that should be handled by retrying or reloading, not by showing an error page
    if (errorMessage.includes('loading dynamically imported module') ||
        errorMessage.includes('disallowed mime type') ||
        errorMessage.includes('failed to fetch dynamically imported module') ||
        errorMessage.includes('error loading module')) {
      // Return null to prevent error boundary from catching these
      // The browser will handle retries automatically
      console.warn('[Error Boundary] Module loading error (will retry):', error.message);
      return {
        hasError: false, // Don't show error boundary for module loading errors
        errorType: 'unknown',
        errorMessage: error.message
      };
    }
    
    let errorType: ErrorBoundaryState['errorType'] = 'unknown';
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorType = 'network';
    } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      errorType = 'auth';
    } else if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
      errorType = 'permission';
    }

    return {
      hasError: true,
      errorType,
      errorMessage: error.message
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Log to audit system if available
    if (typeof window !== 'undefined' && (window as any).logError) {
      (window as any).logError({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }

    this.setState({
      errorDetails: errorInfo.componentStack
    });
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= 3) {
      // Max retries reached, suggest page reload
      this.handleReload();
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      retryCount: prevState.retryCount + 1
    }));

    // Auto-retry after delay for network errors
    if (this.state.errorType === 'network') {
      const timeout = setTimeout(() => {
        this.setState({ hasError: false });
      }, 2000);
      this.retryTimeouts.push(timeout);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = ROUTES.HOME;
  };

  renderErrorContent() {
    const { errorType, errorMessage, retryCount } = this.state;

    // For network errors (Docker/backend down), show the friendly early-man page
    if (errorType === 'network') {
      return (
        <ServiceUnavailable
          title="Service Temporarily Unavailable"
          description="Unable to connect to the server. The early man is working hard to reconnect everything!"
          showRetry={retryCount < 3}
          onRetry={this.handleRetry}
        />
      );
    }

    // For other errors, show the standard error UI
    const errorConfig = {
      auth: {
        icon: Shield,
        title: 'Authentication Required',
        description: 'You need to sign in to access this feature.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      },
      permission: {
        icon: Shield,
        title: 'Access Denied',
        description: 'You don\'t have permission to access this resource.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      },
      unknown: {
        icon: AlertTriangle,
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      }
    };

    const config = errorConfig[errorType];
    const IconComponent = config.icon;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className={`w-full max-w-md ${config.borderColor}`}>
          <CardHeader className={`text-center ${config.bgColor} rounded-t-lg`}>
            <div className={`mx-auto w-12 h-12 ${config.color} mb-4`}>
              <IconComponent size={48} />
            </div>
            <CardTitle className={config.color}>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {errorMessage && (
              <Alert className="mb-4">
                <AlertDescription className="text-sm font-mono">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {retryCount < 3 ? (
                <Button 
                  onClick={this.handleRetry} 
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again {retryCount > 0 && `(${retryCount}/3)`}
                </Button>
              ) : (
                <Button 
                  onClick={this.handleReload} 
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              )}

              {errorType === 'auth' ? (
                <Button 
                  onClick={() => window.location.href = ROUTES.AUTH} 
                  className="w-full"
                  variant="outline"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              ) : (
                <Button 
                  onClick={this.handleGoHome} 
                  className="w-full"
                  variant="outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorDetails && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {this.state.errorDetails}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ? 
        this.props.fallback(new Error(this.state.errorMessage || 'Unknown error'), { componentStack: this.state.errorDetails || '' }) :
        this.renderErrorContent();
    }

    return this.props.children;
  }
}