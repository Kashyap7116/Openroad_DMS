"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

/**
 * Security utilities for Openroad DMS
 * Provides input validation, audit logging, and permission checking
 */

// Rate limiting configurations
export const rateLimitConfig = {
  api: { requests: 100, window: "15m" },
  auth: { requests: 5, window: "15m" },
  upload: { requests: 10, window: "5m" },
  sensitive: { requests: 3, window: "15m" },
};

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .substring(0, 1000); // Limit length
}

// File validation
export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSize: number = 5 * 1024 * 1024
) {
  const errors: string[] = [];

  if (!file) {
    errors.push("No file provided");
    return { valid: false, errors };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
  }

  // Check file size
  if (file.size > maxSize) {
    errors.push(
      `File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`
    );
  }

  // Check file name
  const fileName = file.name;
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
    errors.push(
      "Invalid file name. Only alphanumeric, dots, dashes and underscores allowed."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Audit logging
export async function auditLog(action: string, details: any = {}) {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "";
    const ip =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("audit_logs").insert({
      action,
      user_id: user?.id,
      ip_address: ip,
      user_agent: userAgent,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Audit log failed:", error);
    // Continue execution even if audit logging fails
  }
}

// Check user permissions
export async function checkPermissions(
  requiredRole: string | string[],
  requiredModules?: string[]
) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { authorized: false, reason: "Not authenticated" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, modules, status")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.status !== "Active") {
      return { authorized: false, reason: "User inactive or not found" };
    }

    // Check role
    const allowedRoles = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];
    if (!allowedRoles.includes(profile.role)) {
      return { authorized: false, reason: "Insufficient role permissions" };
    }

    // Check modules if specified
    if (requiredModules && requiredModules.length > 0) {
      const hasRequiredModules = requiredModules.some((module) =>
        profile.modules?.includes(module)
      );
      if (!hasRequiredModules) {
        return { authorized: false, reason: "Insufficient module permissions" };
      }
    }

    return { authorized: true, profile };
  } catch (error) {
    console.error("Permission check failed:", error);
    return { authorized: false, reason: "Permission check failed" };
  }
}

// Secure session validation
export async function validateSession() {
  const supabase = await createClient();

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return { valid: false, reason: "No valid session" };
    }

    // Check if session is expired
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      return { valid: false, reason: "Session expired" };
    }

    return { valid: true, session };
  } catch (error) {
    console.error("Session validation failed:", error);
    return { valid: false, reason: "Session validation error" };
  }
}

// Data encryption/decryption utilities
export function encryptSensitiveData(data: string, key?: string): string {
  // Simple base64 encoding for now - in production, use proper encryption
  return Buffer.from(data).toString("base64");
}

export function decryptSensitiveData(
  encryptedData: string,
  key?: string
): string {
  try {
    return Buffer.from(encryptedData, "base64").toString();
  } catch (error) {
    console.error("Decryption failed:", error);
    return "";
  }
}

// Security headers for API responses
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export const corsHeaders = {
  "Access-Control-Allow-Origin":
    process.env.ALLOWED_ORIGINS || "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

