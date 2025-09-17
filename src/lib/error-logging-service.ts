import {
  AuthenticationError,
  DatabaseError,
  ValidationError,
} from "@/lib/enhanced-supabase-operations";
import { createSupabaseAdmin } from "@/lib/supabase";

export interface ErrorLogEntry {
  id?: string;
  error_type: string;
  error_message: string;
  error_details?: any;
  stack_trace?: string;
  user_id?: string;
  session_id?: string;
  url?: string;
  user_agent?: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  resolved: boolean;
  context?: any;
}

export class ErrorLoggingService {
  private static instance: ErrorLoggingService;
  private supabase = createSupabaseAdmin();

  static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  /**
   * Log an error to the database and console
   */
  async logError(
    error: Error | unknown,
    context: {
      userId?: string;
      url?: string;
      userAgent?: string;
      severity?: "low" | "medium" | "high" | "critical";
      additionalContext?: any;
    } = {}
  ): Promise<void> {
    try {
      const errorEntry: ErrorLogEntry = {
        error_type: this.getErrorType(error),
        error_message: this.getErrorMessage(error),
        error_details: this.getErrorDetails(error),
        stack_trace: error instanceof Error ? error.stack : undefined,
        user_id: context.userId,
        session_id: this.generateSessionId(),
        url: context.url,
        user_agent: context.userAgent,
        timestamp: new Date().toISOString(),
        severity: context.severity || this.determineSeverity(error),
        resolved: false,
        context: context.additionalContext,
      };

      // Log to console immediately
      console.error("Error logged:", errorEntry);

      // Attempt to save to database
      const { error: dbError } = await this.supabase
        .from("error_logs")
        .insert([errorEntry]);

      if (dbError) {
        console.error("Failed to save error to database:", dbError);
        // Fallback to local storage or file system if needed
        this.logToFallback(errorEntry);
      }
    } catch (loggingError) {
      console.error("Critical error in logging service:", loggingError);
      // Ensure we don't lose the original error
      console.error("Original error:", error);
    }
  }

  /**
   * Log multiple errors in batch
   */
  async logBatchErrors(
    errors: Array<{ error: Error | unknown; context?: any }>
  ): Promise<void> {
    const errorEntries = errors.map(({ error, context = {} }) => ({
      error_type: this.getErrorType(error),
      error_message: this.getErrorMessage(error),
      error_details: this.getErrorDetails(error),
      stack_trace: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      severity: context.severity || this.determineSeverity(error),
      resolved: false,
      context,
    }));

    try {
      const { error: dbError } = await this.supabase
        .from("error_logs")
        .insert(errorEntries);

      if (dbError) {
        console.error("Failed to save batch errors to database:", dbError);
        errorEntries.forEach((entry) => this.logToFallback(entry));
      }
    } catch (loggingError) {
      console.error("Critical error in batch logging:", loggingError);
      errors.forEach(({ error }) => console.error("Batch error:", error));
    }
  }

  /**
   * Get error logs with filtering
   */
  async getErrorLogs(
    filters: {
      severity?: string;
      errorType?: string;
      resolved?: boolean;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<ErrorLogEntry[]> {
    try {
      let query = this.supabase
        .from("error_logs")
        .select("*")
        .order("timestamp", { ascending: false });

      if (filters.severity) {
        query = query.eq("severity", filters.severity);
      }

      if (filters.errorType) {
        query = query.eq("error_type", filters.errorType);
      }

      if (filters.resolved !== undefined) {
        query = query.eq("resolved", filters.resolved);
      }

      if (filters.startDate) {
        query = query.gte("timestamp", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("timestamp", filters.endDate);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseError("Failed to retrieve error logs", error.message);
      }

      return data || [];
    } catch (error) {
      console.error("Error retrieving error logs:", error);
      return [];
    }
  }

  /**
   * Mark error as resolved
   */
  async markErrorResolved(errorId: string, resolvedBy?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("error_logs")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
        })
        .eq("id", errorId);

      if (error) {
        throw new DatabaseError(
          "Failed to mark error as resolved",
          error.message
        );
      }
    } catch (error) {
      console.error("Error marking error as resolved:", error);
      throw error;
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(timeRange: "24h" | "7d" | "30d" = "24h"): Promise<{
    totalErrors: number;
    unresolvedErrors: number;
    severityBreakdown: Record<string, number>;
    errorTypeBreakdown: Record<string, number>;
  }> {
    try {
      const startDate = new Date();
      switch (timeRange) {
        case "24h":
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      const { data, error } = await this.supabase
        .from("error_logs")
        .select("severity, error_type, resolved")
        .gte("timestamp", startDate.toISOString());

      if (error) {
        throw new DatabaseError(
          "Failed to retrieve error statistics",
          error.message
        );
      }

      const stats = {
        totalErrors: data?.length || 0,
        unresolvedErrors: data?.filter((e) => !e.resolved).length || 0,
        severityBreakdown: {} as Record<string, number>,
        errorTypeBreakdown: {} as Record<string, number>,
      };

      data?.forEach((entry) => {
        stats.severityBreakdown[entry.severity] =
          (stats.severityBreakdown[entry.severity] || 0) + 1;
        stats.errorTypeBreakdown[entry.error_type] =
          (stats.errorTypeBreakdown[entry.error_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("Error retrieving error statistics:", error);
      return {
        totalErrors: 0,
        unresolvedErrors: 0,
        severityBreakdown: {},
        errorTypeBreakdown: {},
      };
    }
  }

  private getErrorType(error: unknown): string {
    if (error instanceof DatabaseError) return "DatabaseError";
    if (error instanceof ValidationError) return "ValidationError";
    if (error instanceof AuthenticationError) return "AuthenticationError";
    if (error instanceof TypeError) return "TypeError";
    if (error instanceof ReferenceError) return "ReferenceError";
    if (error instanceof SyntaxError) return "SyntaxError";
    if (error instanceof Error) return error.constructor.name;
    return "UnknownError";
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "An unknown error occurred";
  }

  private getErrorDetails(error: unknown): any {
    if (error instanceof DatabaseError || error instanceof ValidationError) {
      return {
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      };
    }
    if (typeof error === "object") return error;
    return null;
  }

  private determineSeverity(
    error: unknown
  ): "low" | "medium" | "high" | "critical" {
    if (error instanceof AuthenticationError) return "high";
    if (error instanceof DatabaseError) return "high";
    if (error instanceof ValidationError) return "medium";
    if (error instanceof TypeError || error instanceof ReferenceError)
      return "medium";
    return "low";
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logToFallback(errorEntry: ErrorLogEntry): void {
    try {
      // In a production environment, you might want to save to a file or external service
      if (typeof window !== "undefined" && window.localStorage) {
        const existingLogs = JSON.parse(
          localStorage.getItem("error_logs_fallback") || "[]"
        );
        existingLogs.push(errorEntry);
        // Keep only the last 100 entries
        if (existingLogs.length > 100) {
          existingLogs.splice(0, existingLogs.length - 100);
        }
        localStorage.setItem(
          "error_logs_fallback",
          JSON.stringify(existingLogs)
        );
      }
    } catch (fallbackError) {
      console.error("Even fallback logging failed:", fallbackError);
    }
  }
}

// Export singleton instance
export const errorLogger = ErrorLoggingService.getInstance();

// Helper function for easy error logging
export const logError = (
  error: Error | unknown,
  context?: {
    userId?: string;
    url?: string;
    userAgent?: string;
    severity?: "low" | "medium" | "high" | "critical";
    additionalContext?: any;
  }
) => {
  return errorLogger.logError(error, context);
};

// Helper for batch error logging
export const logBatchErrors = (
  errors: Array<{ error: Error | unknown; context?: any }>
) => {
  return errorLogger.logBatchErrors(errors);
};
