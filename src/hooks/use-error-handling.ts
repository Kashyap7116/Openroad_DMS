"use client";

import { errorLogger } from "@/lib/error-logging-service";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface UseErrorHandlerOptions {
  showToast?: boolean;
  logToDatabase?: boolean;
  fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error) => void;
  userId?: string;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, logToDatabase = true, onError, userId } = options;

  const [hasError, setHasError] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  const handleError = useCallback(
    async (
      error: Error | unknown,
      context?: {
        operation?: string;
        severity?: "low" | "medium" | "high" | "critical";
        additionalContext?: any;
      }
    ) => {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));

      setHasError(true);
      setLastError(errorObj);

      // Log to database if enabled
      if (logToDatabase) {
        try {
          await errorLogger.logError(errorObj, {
            userId,
            url:
              typeof window !== "undefined" ? window.location.href : undefined,
            userAgent:
              typeof navigator !== "undefined"
                ? navigator.userAgent
                : undefined,
            severity: context?.severity,
            additionalContext: {
              operation: context?.operation,
              ...context?.additionalContext,
            },
          });
        } catch (loggingError) {
          console.error("Failed to log error to database:", loggingError);
        }
      }

      // Show toast notification if enabled
      if (showToast) {
        const errorMessage = errorObj.message || "An unexpected error occurred";
        toast.error(errorMessage, {
          description: context?.operation
            ? `Operation: ${context.operation}`
            : undefined,
          action: {
            label: "Retry",
            onClick: () => setHasError(false),
          },
        });
      }

      // Call custom error handler if provided
      if (onError) {
        try {
          onError(errorObj);
        } catch (handlerError) {
          console.error("Error in custom error handler:", handlerError);
        }
      }

      console.error("Error handled:", errorObj);
    },
    [showToast, logToDatabase, onError, userId]
  );

  const clearError = useCallback(() => {
    setHasError(false);
    setLastError(null);
  }, []);

  const retry = useCallback(() => {
    clearError();
  }, [clearError]);

  return {
    hasError,
    lastError,
    handleError,
    clearError,
    retry,
  };
}

// Hook for handling async operations with automatic error handling
export function useAsyncOperation<T = any>(
  options: UseErrorHandlerOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const { handleError, hasError, lastError, retry } = useErrorHandler(options);

  const execute = useCallback(
    async (
      operation: () => Promise<T>,
      context?: {
        operation?: string;
        severity?: "low" | "medium" | "high" | "critical";
        additionalContext?: any;
      }
    ): Promise<T | null> => {
      setIsLoading(true);
      try {
        const result = await operation();
        setData(result);
        return result;
      } catch (error) {
        await handleError(error, context);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  return {
    isLoading,
    data,
    hasError,
    lastError,
    execute,
    retry: () => {
      retry();
      setData(null);
    },
    reset: () => {
      retry();
      setData(null);
      setIsLoading(false);
    },
  };
}

// Hook for form error handling
export function useFormErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { handleError } = useErrorHandler(options);

  const setFieldError = useCallback((field: string, error: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const handleFormError = useCallback(
    async (
      error: Error | unknown,
      context?: {
        operation?: string;
        formData?: any;
      }
    ) => {
      // Handle validation errors specially
      if (error instanceof Error && error.message.includes("validation")) {
        try {
          // Try to parse validation error details
          const validationDetails = (error as any).details;
          if (validationDetails && typeof validationDetails === "object") {
            Object.entries(validationDetails).forEach(([field, message]) => {
              setFieldError(field, String(message));
            });
          }
        } catch (parseError) {
          console.error("Failed to parse validation errors:", parseError);
        }
      }

      // Always log the error
      await handleError(error, {
        operation: context?.operation,
        additionalContext: {
          formData: context?.formData,
        },
      });
    },
    [handleError, setFieldError]
  );

  return {
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    handleFormError,
    hasFieldErrors: Object.keys(fieldErrors).length > 0,
  };
}

// Global error boundary hook
export function useGlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);

      errorLogger.logError(event.reason, {
        url: window.location.href,
        userAgent: navigator.userAgent,
        severity: "high",
        additionalContext: {
          type: "unhandled_promise_rejection",
        },
      });

      toast.error("An unexpected error occurred", {
        description: "The error has been logged and will be investigated.",
      });
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);

      errorLogger.logError(event.error || event.message, {
        url: window.location.href,
        userAgent: navigator.userAgent,
        severity: "high",
        additionalContext: {
          type: "global_error",
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });

      toast.error("An unexpected error occurred", {
        description: "The error has been logged and will be investigated.",
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
  }, []);
}
