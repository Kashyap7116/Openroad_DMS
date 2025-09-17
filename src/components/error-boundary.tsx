'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shared/components/ui/ui/card';
import { Button } from '@/modules/shared/components/ui/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service (if configured)
    this.logErrorToService(error, errorInfo);

    // Show user notification
    toast.error('An unexpected error occurred', {
      description: 'The development team has been notified.',
      duration: 5000,
    });
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // In a real application, you would send this to your error tracking service
    // like Sentry, LogRocket, or Bugsnag
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: 'user-id-if-available', // Add user context if available
    };

    // For now, we'll just log to console (replace with actual service)
    console.log('Error logged:', errorData);
    
    // Example: Send to error tracking service
    // errorTrackingService.captureException(error, {
    //   tags: { errorId: this.state.errorId },
    //   extra: errorData,
    // });
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
      toast.info(`Retrying... (${this.retryCount}/${this.maxRetries})`);
    } else {
      toast.error('Maximum retry attempts reached. Please refresh the page.');
    }
  };

  private handleReset = () => {
    this.retryCount = 0;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    const details = document.getElementById('error-details');
    if (details) {
      details.style.display = details.style.display === 'none' ? 'block' : 'none';
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} reset={this.handleReset} />;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Something went wrong
              </CardTitle>
              <p className="text-gray-600 mt-2">
                We apologize for the inconvenience. An error has occurred and our team has been notified.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{this.state.errorId}</code>
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {this.retryCount < this.maxRetries && (
                  <Button 
                    onClick={this.handleRetry}
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again ({this.maxRetries - this.retryCount} left)
                  </Button>
                )}
                
                <Button 
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>

              {/* Error Details Toggle */}
              {this.props.showDetails !== false && (
                <div className="border-t pt-4">
                  <Button
                    onClick={this.toggleDetails}
                    variant="ghost"
                    size="sm"
                    className="w-full flex items-center gap-2 text-gray-600"
                  >
                    <Bug className="w-4 h-4" />
                    Show Technical Details
                  </Button>
                  
                  <div id="error-details" style={{ display: 'none' }} className="mt-4 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Error Message:</h4>
                      <code className="text-sm text-red-600 break-all">
                        {this.state.error.message}
                      </code>
                    </div>
                    
                    {this.state.error.stack && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Stack Trace:</h4>
                        <pre className="text-xs text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {this.state.errorInfo?.componentStack && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Component Stack:</h4>
                        <pre className="text-xs text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Help Text */}
              <div className="text-center text-sm text-gray-500 border-t pt-4">
                <p>If this problem persists, please contact support with the error ID above.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for handling async errors in functional components
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: string) => {
    console.error('Async error handled:', error);
    
    // Create artificial error info for logging
    const artificialErrorInfo: React.ErrorInfo = {
      componentStack: errorInfo || 'Async operation',
    };
    
    // Trigger error boundary by throwing in next tick
    setTimeout(() => {
      throw error;
    }, 0);
    
    // Show immediate user feedback
    toast.error('An error occurred', {
      description: error.message,
      duration: 5000,
    });
  }, []);
}

// Custom hook for async operations with error handling
export function useAsyncOperation() {
  const handleError = useErrorHandler();
  
  return React.useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      successMessage?: string;
    }
  ) => {
    try {
      const result = await operation();
      
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      
      return { success: true, data: result, error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      if (options?.onError) {
        options.onError(err);
      } else {
        handleError(err, 'Async operation');
      }
      
      return { success: false, data: null, error: err };
    }
  }, [handleError]);
}

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    toast.error('An unexpected error occurred', {
      description: 'Please try again or contact support if the problem persists.',
      duration: 5000,
    });
    
    // Prevent default browser error handling
    event.preventDefault();
  });
  
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    toast.error('A system error occurred', {
      description: event.message || 'Unknown error',
      duration: 5000,
    });
  });
}

export default ErrorBoundary;