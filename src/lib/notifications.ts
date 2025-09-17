import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";

// Enhanced toast types
export type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  dismissible?: boolean;
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center";
  richColors?: boolean;
}

interface DatabaseOperationOptions extends ToastOptions {
  operation?: string;
  entity?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private getIcon(type: ToastType) {
    switch (type) {
      case "success":
        return CheckCircle;
      case "error":
        return AlertCircle;
      case "warning":
        return AlertTriangle;
      case "info":
        return Info;
      default:
        return Info;
    }
  }

  private showToast(
    type: ToastType,
    message: string,
    options: ToastOptions = {}
  ): string | number {
    const {
      description,
      duration = 4000,
      action,
      cancel,
      dismissible = true,
    } = options;

    const toastOptions: any = {
      description,
      duration: type === "loading" ? Infinity : duration,
      dismissible,
    };

    // Add action button if provided
    if (action) {
      toastOptions.action = {
        label: action.label,
        onClick: action.onClick,
      };
    }

    // Add cancel button if provided
    if (cancel) {
      toastOptions.cancel = {
        label: cancel.label,
        onClick: cancel.onClick || (() => {}),
      };
    }

    switch (type) {
      case "success":
        return toast.success(message, toastOptions);
      case "error":
        return toast.error(message, toastOptions);
      case "warning":
        return toast.warning(message, toastOptions);
      case "info":
        return toast.info(message, toastOptions);
      case "loading":
        return toast.loading(message, toastOptions);
      default:
        return toast(message, toastOptions);
    }
  }

  // Basic notification methods
  success(message: string, options?: ToastOptions) {
    return this.showToast("success", message, options);
  }

  error(message: string, options?: ToastOptions) {
    return this.showToast("error", message, options);
  }

  warning(message: string, options?: ToastOptions) {
    return this.showToast("warning", message, options);
  }

  info(message: string, options?: ToastOptions) {
    return this.showToast("info", message, options);
  }

  loading(message: string, options?: ToastOptions) {
    return this.showToast("loading", message, options);
  }

  // Database operation notifications
  databaseSuccess(options: DatabaseOperationOptions = {}) {
    const { operation = "Operation", entity = "record" } = options;
    const message = `${operation} completed successfully`;
    const description = `The ${entity.toLowerCase()} has been processed.`;

    return this.success(message, {
      ...options,
      description: options.description || description,
    });
  }

  databaseError(error: string | Error, options: DatabaseOperationOptions = {}) {
    const {
      operation = "Operation",
      entity = "record",
      showRetry = true,
      onRetry,
    } = options;
    const errorMessage = error instanceof Error ? error.message : error;
    const message = `${operation} failed`;
    const description = `Could not process ${entity.toLowerCase()}: ${errorMessage}`;

    const toastOptions: ToastOptions = {
      ...options,
      description: options.description || description,
      duration: 6000,
    };

    if (showRetry && onRetry) {
      toastOptions.action = {
        label: "Retry",
        onClick: onRetry,
      };
    }

    return this.error(message, toastOptions);
  }

  // Form validation notifications
  validationError(errors: Record<string, string[]> | string) {
    if (typeof errors === "string") {
      return this.error("Validation Error", {
        description: errors,
        duration: 5000,
      });
    }

    const errorCount = Object.keys(errors).length;
    const message = `Form validation failed (${errorCount} error${
      errorCount > 1 ? "s" : ""
    })`;
    const firstError = Object.values(errors)[0]?.[0];

    return this.error(message, {
      description: firstError || "Please check the form and try again.",
      duration: 5000,
    });
  }

  // Authentication notifications
  authSuccess(action: string = "Authentication") {
    return this.success(`${action} successful`, {
      description: "You are now logged in.",
      duration: 3000,
    });
  }

  authError(error: string | Error, action: string = "Authentication") {
    const errorMessage = error instanceof Error ? error.message : error;
    return this.error(`${action} failed`, {
      description: errorMessage,
      duration: 5000,
    });
  }

  // File operation notifications
  fileUploadSuccess(fileName: string) {
    return this.success("File uploaded successfully", {
      description: `${fileName} has been uploaded.`,
      duration: 3000,
    });
  }

  fileUploadError(fileName: string, error: string | Error) {
    const errorMessage = error instanceof Error ? error.message : error;
    return this.error("File upload failed", {
      description: `Could not upload ${fileName}: ${errorMessage}`,
      duration: 5000,
    });
  }

  fileDownloadStart(fileName: string) {
    return this.loading(`Preparing ${fileName}`, {
      description: "Your download will start shortly...",
    });
  }

  // Permission notifications
  permissionDenied(action: string = "perform this action") {
    return this.warning("Permission denied", {
      description: `You don't have permission to ${action}.`,
      duration: 5000,
    });
  }

  // Network and connectivity notifications
  connectionLost() {
    return this.error("Connection lost", {
      description: "Please check your internet connection and try again.",
      duration: 8000,
      dismissible: true,
    });
  }

  connectionRestored() {
    return this.success("Connection restored", {
      description: "You are back online.",
      duration: 3000,
    });
  }

  // Batch operation notifications
  batchOperationStart(count: number, operation: string) {
    return this.loading(`Processing ${count} items`, {
      description: `${operation} in progress...`,
    });
  }

  batchOperationComplete(
    successful: number,
    failed: number,
    operation: string
  ) {
    if (failed === 0) {
      return this.success(`${operation} completed`, {
        description: `Successfully processed ${successful} items.`,
        duration: 4000,
      });
    } else if (successful === 0) {
      return this.error(`${operation} failed`, {
        description: `Failed to process ${failed} items.`,
        duration: 6000,
      });
    } else {
      return this.warning(`${operation} partially completed`, {
        description: `${successful} successful, ${failed} failed.`,
        duration: 6000,
      });
    }
  }

  // Update existing toast
  update(
    toastId: string | number,
    type: ToastType,
    message: string,
    options?: ToastOptions
  ) {
    switch (type) {
      case "success":
        return toast.success(message, { id: toastId, ...options });
      case "error":
        return toast.error(message, { id: toastId, ...options });
      case "warning":
        return toast.warning(message, { id: toastId, ...options });
      case "info":
        return toast.info(message, { id: toastId, ...options });
      default:
        return toast(message, { id: toastId, ...options });
    }
  }

  // Dismiss toast
  dismiss(toastId?: string | number) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }

  // Promise-based notifications (useful for async operations)
  async promise<T>(
    promise: Promise<T>,
    {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
      ...options
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    } & ToastOptions
  ): Promise<T> {
    return toast.promise(promise, {
      loading: loadingMessage,
      success: (data) => {
        const message =
          typeof successMessage === "function"
            ? successMessage(data)
            : successMessage;
        return {
          title: message,
          description: options.description,
          duration: options.duration || 3000,
        };
      },
      error: (error) => {
        const message =
          typeof errorMessage === "function"
            ? errorMessage(error)
            : errorMessage;
        return {
          title: message,
          description: error?.message || options.description,
          duration: options.duration || 5000,
        };
      },
    });
  }
}

// Create singleton instance
export const notifications = NotificationService.getInstance();

// Convenience functions for common patterns
export const notify = {
  // Database operations
  dbSave: (
    entity: string,
    options?: Omit<DatabaseOperationOptions, "operation" | "entity">
  ) => notifications.databaseSuccess({ operation: "Save", entity, ...options }),

  dbCreate: (
    entity: string,
    options?: Omit<DatabaseOperationOptions, "operation" | "entity">
  ) =>
    notifications.databaseSuccess({ operation: "Create", entity, ...options }),

  dbUpdate: (
    entity: string,
    options?: Omit<DatabaseOperationOptions, "operation" | "entity">
  ) =>
    notifications.databaseSuccess({ operation: "Update", entity, ...options }),

  dbDelete: (
    entity: string,
    options?: Omit<DatabaseOperationOptions, "operation" | "entity">
  ) =>
    notifications.databaseSuccess({ operation: "Delete", entity, ...options }),

  dbError: (
    entity: string,
    error: string | Error,
    options?: Omit<DatabaseOperationOptions, "entity">
  ) => notifications.databaseError(error, { entity, ...options }),

  // Form operations
  formSaved: () =>
    notifications.success("Changes saved", {
      description: "Your changes have been saved successfully.",
      duration: 3000,
    }),

  formError: (errors: Record<string, string[]> | string) =>
    notifications.validationError(errors),

  // General operations
  success: (message: string, description?: string) =>
    notifications.success(message, { description }),

  error: (message: string, description?: string) =>
    notifications.error(message, { description }),

  warning: (message: string, description?: string) =>
    notifications.warning(message, { description }),

  info: (message: string, description?: string) =>
    notifications.info(message, { description }),

  loading: (message: string, description?: string) =>
    notifications.loading(message, { description }),

  // Promise wrapper
  promise: notifications.promise.bind(notifications),
};

export default notifications;
