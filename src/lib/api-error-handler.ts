import {
  AuthenticationError,
  DatabaseError,
  ValidationError,
} from "@/lib/enhanced-supabase-operations";
import { errorLogger } from "@/lib/error-logging-service";
import { NextRequest, NextResponse } from "next/server";

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  statusCode: number;
}

export class ApiErrorHandler {
  /**
   * Handle and log API errors with appropriate HTTP responses
   */
  static async handleApiError(
    error: unknown,
    request: NextRequest,
    context?: {
      operation?: string;
      userId?: string;
      additionalContext?: any;
    }
  ): Promise<NextResponse> {
    const requestUrl = request.url;
    const userAgent = request.headers.get("user-agent") || undefined;

    // Log the error
    await errorLogger.logError(error, {
      url: requestUrl,
      userAgent,
      userId: context?.userId,
      severity: this.getErrorSeverity(error),
      additionalContext: {
        operation: context?.operation,
        ...context?.additionalContext,
      },
    });

    // Convert to API error and return appropriate response
    const apiError = this.convertToApiError(error);

    return NextResponse.json(
      {
        error: {
          message: apiError.message,
          code: apiError.code,
          details: apiError.details,
        },
        success: false,
        timestamp: new Date().toISOString(),
      },
      { status: apiError.statusCode }
    );
  }

  /**
   * Wrap API route handlers with automatic error handling
   */
  static withErrorHandling(
    handler: (
      request: NextRequest,
      context?: { params?: any }
    ) => Promise<NextResponse>,
    operation?: string
  ) {
    return async (
      request: NextRequest,
      context?: { params?: any }
    ): Promise<NextResponse> => {
      try {
        return await handler(request, context);
      } catch (error) {
        console.error(
          `API Error in ${operation || "unknown operation"}:`,
          error
        );

        return this.handleApiError(error, request, {
          operation,
          additionalContext: { params: context?.params },
        });
      }
    };
  }

  /**
   * Create standardized success responses
   */
  static createSuccessResponse(data: any, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create standardized error responses
   */
  static createErrorResponse(
    message: string,
    statusCode: number = 400,
    code?: string,
    details?: any
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          message,
          code,
          details,
        },
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }

  private static convertToApiError(error: unknown): ApiError {
    if (error instanceof AuthenticationError) {
      return {
        message: error.message,
        code: "AUTHENTICATION_ERROR",
        details: (error as any).details,
        statusCode: 401,
      };
    }

    if (error instanceof ValidationError) {
      return {
        message: error.message,
        code: "VALIDATION_ERROR",
        details: (error as any).details,
        statusCode: 400,
      };
    }

    if (error instanceof DatabaseError) {
      return {
        message: "A database error occurred",
        code: "DATABASE_ERROR",
        details:
          process.env.NODE_ENV === "development"
            ? (error as any).details
            : undefined,
        statusCode: 500,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: "INTERNAL_ERROR",
        statusCode: 500,
      };
    }

    return {
      message: "An unknown error occurred",
      code: "UNKNOWN_ERROR",
      statusCode: 500,
    };
  }

  private static getErrorSeverity(
    error: unknown
  ): "low" | "medium" | "high" | "critical" {
    if (error instanceof AuthenticationError) return "high";
    if (error instanceof DatabaseError) return "high";
    if (error instanceof ValidationError) return "medium";
    if (error instanceof TypeError || error instanceof ReferenceError)
      return "medium";
    return "low";
  }
}

// Helper function for wrapping API handlers
export const withApiErrorHandling = (
  handler: (
    request: NextRequest,
    context?: { params?: any }
  ) => Promise<NextResponse>,
  operation?: string
) => ApiErrorHandler.withErrorHandling(handler, operation);

// Helper functions for responses
export const successResponse = (data: any, message?: string) =>
  ApiErrorHandler.createSuccessResponse(data, message);

export const errorResponse = (
  message: string,
  statusCode: number = 400,
  code?: string,
  details?: any
) => ApiErrorHandler.createErrorResponse(message, statusCode, code, details);
