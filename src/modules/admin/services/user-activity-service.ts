"use server";

import { createClient } from "@supabase/supabase-js";
import { getLogs } from "./admin-actions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface UnifiedActivity {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  module: string;
  action: string;
  timestamp: string;
  source: "file_log" | "database_audit" | "session_log";
  details?: Record<string, any>;
  table_name?: string;
  record_id?: string;
  action_type?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
  session_info?: {
    session_start?: string;
    session_end?: string;
    is_active?: boolean;
  };
}

/**
 * Get all user activity from all sources:
 * 1. File-based activity logs (existing admin logs)
 * 2. Database audit logs (database operations)
 * 3. User session logs (login/logout activity)
 */
export async function getAllUserActivity(filters?: {
  user_id?: string;
  user_email?: string;
  module?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  source?: string;
  limit?: number;
}): Promise<UnifiedActivity[]> {
  const allActivities: UnifiedActivity[] = [];

  try {
    // 1. Get file-based activity logs
    const fileLogs = await getLogs();
    const fileActivities: UnifiedActivity[] = fileLogs.map((log) => ({
      id:
        log.id ||
        `file-${log.timestamp}-${Math.random().toString(36).substring(2, 9)}`,
      user_id: log.user_id,
      user_name: log.user_name,
      module: log.module || "Unknown",
      action: log.action,
      timestamp: log.timestamp,
      source: "file_log" as const,
      details: log.details,
      ip_address: log.ip_address,
    }));
    allActivities.push(...fileActivities);

    // 2. Get database audit logs
    let auditQuery = supabase
      .from("audit_logs")
      .select(
        `
        id,
        table_name,
        record_id,
        action_type,
        old_data,
        new_data,
        user_id,
        user_email,
        ip_address,
        user_agent,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (filters?.limit) {
      auditQuery = auditQuery.limit(filters.limit);
    } else {
      auditQuery = auditQuery.limit(1000); // Default limit
    }

    const { data: auditLogs, error: auditError } = await auditQuery;

    if (!auditError && auditLogs) {
      const auditActivities: UnifiedActivity[] = auditLogs.map((log) => ({
        id: log.id,
        user_id: log.user_id || "system",
        user_name: log.user_email
          ? log.user_email.split("@")[0]
          : "System User",
        user_email: log.user_email,
        module: getModuleFromTableName(log.table_name),
        action: `${log.action_type} ${log.table_name}${
          log.record_id ? ` (ID: ${log.record_id})` : ""
        }`,
        timestamp: log.created_at,
        source: "database_audit" as const,
        table_name: log.table_name,
        record_id: log.record_id,
        action_type: log.action_type,
        old_data: log.old_data,
        new_data: log.new_data,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
      }));
      allActivities.push(...auditActivities);
    }

    // 3. Get user session logs
    let sessionQuery = supabase
      .from("user_sessions")
      .select(
        `
        id,
        user_id,
        session_start,
        session_end,
        ip_address,
        user_agent,
        is_active,
        profiles!inner(name, email)
      `
      )
      .order("session_start", { ascending: false })
      .limit(filters?.limit || 500);

    const { data: sessionLogs, error: sessionError } = await sessionQuery;

    if (!sessionError && sessionLogs) {
      // Create login activities
      const loginActivities: UnifiedActivity[] = sessionLogs.map((session) => ({
        id: `login-${session.id}`,
        user_id: session.user_id,
        user_name: (session.profiles as any)?.name || "Unknown User",
        user_email: (session.profiles as any)?.email,
        module: "Auth",
        action: `User logged in${
          session.session_end ? " and logged out" : " (active session)"
        }`,
        timestamp: session.session_start,
        source: "session_log" as const,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        session_info: {
          session_start: session.session_start,
          session_end: session.session_end,
          is_active: session.is_active,
        },
      }));
      allActivities.push(...loginActivities);

      // Create logout activities for ended sessions
      const logoutActivities: UnifiedActivity[] = sessionLogs
        .filter((session) => session.session_end)
        .map((session) => ({
          id: `logout-${session.id}`,
          user_id: session.user_id,
          user_name: (session.profiles as any)?.name || "Unknown User",
          user_email: (session.profiles as any)?.email,
          module: "Auth",
          action: "User logged out",
          timestamp: session.session_end!,
          source: "session_log" as const,
          ip_address: session.ip_address,
          user_agent: session.user_agent,
          session_info: {
            session_start: session.session_start,
            session_end: session.session_end,
            is_active: false,
          },
        }));
      allActivities.push(...logoutActivities);
    }

    // Sort all activities by timestamp (newest first)
    allActivities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply filters
    let filteredActivities = allActivities;

    if (filters?.user_id) {
      filteredActivities = filteredActivities.filter((activity) =>
        activity.user_id.toLowerCase().includes(filters.user_id!.toLowerCase())
      );
    }

    if (filters?.user_email) {
      filteredActivities = filteredActivities.filter(
        (activity) =>
          activity.user_email
            ?.toLowerCase()
            .includes(filters.user_email!.toLowerCase()) ||
          activity.user_name
            .toLowerCase()
            .includes(filters.user_email!.toLowerCase())
      );
    }

    if (filters?.module) {
      filteredActivities = filteredActivities.filter((activity) =>
        activity.module.toLowerCase().includes(filters.module!.toLowerCase())
      );
    }

    if (filters?.action) {
      filteredActivities = filteredActivities.filter((activity) =>
        activity.action.toLowerCase().includes(filters.action!.toLowerCase())
      );
    }

    if (filters?.source) {
      filteredActivities = filteredActivities.filter(
        (activity) => activity.source === filters.source
      );
    }

    if (filters?.fromDate) {
      filteredActivities = filteredActivities.filter(
        (activity) =>
          new Date(activity.timestamp) >= new Date(filters.fromDate!)
      );
    }

    if (filters?.toDate) {
      const toDate = new Date(filters.toDate!);
      toDate.setHours(23, 59, 59, 999);
      filteredActivities = filteredActivities.filter(
        (activity) => new Date(activity.timestamp) <= toDate
      );
    }

    return filteredActivities;
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return [];
  }
}

/**
 * Map database table names to appropriate modules
 */
function getModuleFromTableName(tableName?: string): string {
  if (!tableName) return "Database";

  const tableToModule: Record<string, string> = {
    // HR tables
    employees: "HR",
    attendance_records: "HR",
    payroll_records: "HR",
    employee_bonuses: "HR",
    attendance_rules: "HR",
    holidays: "HR",

    // Vehicle tables
    vehicles: "Vehicles",
    vehicle_maintenance: "Vehicles",
    vehicle_documents: "Vehicles",

    // Finance tables
    financial_records: "Finance",
    commissions: "Finance",
    office_expenses: "Finance",
    employee_adjustments: "Finance",

    // Sales tables
    sales: "Sales",
    sales_records: "Sales",

    // Purchase tables
    purchases: "Purchase",
    purchase_records: "Purchase",

    // User/Auth tables
    profiles: "Admin",
    user_sessions: "Auth",
    audit_logs: "Admin",
  };

  return tableToModule[tableName] || "Database";
}

/**
 * Get user activity summary/stats
 */
export async function getUserActivitySummary() {
  const allActivity = await getAllUserActivity({ limit: 5000 });

  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const summary = {
    total_activities: allActivity.length,
    last_24_hours: allActivity.filter(
      (a) => new Date(a.timestamp) >= last24Hours
    ).length,
    last_7_days: allActivity.filter((a) => new Date(a.timestamp) >= last7Days)
      .length,
    last_30_days: allActivity.filter((a) => new Date(a.timestamp) >= last30Days)
      .length,
    by_source: {
      file_logs: allActivity.filter((a) => a.source === "file_log").length,
      database_audits: allActivity.filter((a) => a.source === "database_audit")
        .length,
      session_logs: allActivity.filter((a) => a.source === "session_log")
        .length,
    },
    by_module: allActivity.reduce((acc, activity) => {
      acc[activity.module] = (acc[activity.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    active_users: [...new Set(allActivity.map((a) => a.user_id))].length,
    recent_activities: allActivity.slice(0, 10),
  };

  return summary;
}
