"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { handleAndLogApiError } from "../../shared/utils/utils";

const logsDir = path.join(process.cwd(), "database", "logs");
const adminLogsDir = path.join(process.cwd(), "database", "admin", "logs");

/**
 * Ensures a directory exists.
 */
async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Logs an activity to the local JSON log files.
 * Note: This is one of the few functions that still uses local JSON files,
 * as requested - logs should remain in local files.
 *
 * @param logData The activity log data.
 * @returns Success/error result.
 */
export async function addLog(logData: {
  user_id?: string;
  user_name?: string;
  module: string;
  action: string;
  details?: any;
}) {
  try {
    console.log("📝 Adding activity log:", logData);

    // Create log entry
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user_id: logData.user_id || "SYSTEM",
      user_name: logData.user_name || "System User",
      module: logData.module,
      action: logData.action,
      details: logData.details || {},
    };

    // Determine log file path based on current date
    const now = new Date();
    const monthDir = path.join(
      adminLogsDir,
      now.toISOString().slice(0, 7).replace("-", "") // YYYYMM format
    );
    await ensureDirectoryExists(monthDir);
    const filePath = path.join(monthDir, "activity.json");

    // Read existing logs
    let logs: any[] = [];
    try {
      await fs.access(filePath);
      const fileContent = await fs.readFile(filePath, "utf-8");
      logs = JSON.parse(fileContent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("Could not read existing log file:", error);
      }
      // File doesn't exist or is invalid, start with empty array
      logs = [];
    }

    // Add new log entry
    logs.push(logEntry);

    // Keep only last 1000 entries per file
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(logs, null, 2), "utf-8");

    console.log("✅ Activity logged successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error adding log:", error);
    return await handleAndLogApiError(error, "addLog");
  }
}

/**
 * Gets activity logs from local JSON files.
 * @param month Optional month filter (YYYYMM format).
 * @param limit Optional limit on number of entries.
 * @returns Array of log entries.
 */
export async function getLogs(month?: string, limit: number = 100) {
  try {
    console.log("📋 Getting activity logs...");

    let logs: any[] = [];

    if (month) {
      // Get logs for specific month
      const monthDir = path.join(adminLogsDir, month);
      const filePath = path.join(monthDir, "activity.json");

      try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        logs = JSON.parse(fileContent);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.warn("Could not read log file for month:", month, error);
        }
        logs = [];
      }
    } else {
      // Get logs from all available months (most recent first)
      try {
        const monthDirs = await fs.readdir(adminLogsDir);
        const sortedMonths = monthDirs.sort().reverse(); // Most recent first

        for (const monthDir of sortedMonths.slice(0, 3)) {
          // Last 3 months
          const filePath = path.join(adminLogsDir, monthDir, "activity.json");
          try {
            const fileContent = await fs.readFile(filePath, "utf-8");
            const monthLogs = JSON.parse(fileContent);
            logs.push(...monthLogs);
          } catch (error) {
            // Skip files that can't be read
            continue;
          }
        }
      } catch (error) {
        console.warn("Could not read logs directory:", error);
        logs = [];
      }
    }

    // Sort by timestamp (most recent first) and limit results
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    logs = logs.slice(0, limit);

    console.log(`✅ Retrieved ${logs.length} log entries`);
    return logs;
  } catch (error) {
    console.error("❌ Error getting logs:", error);
    return [];
  }
}

/**
 * Gets available log months.
 * @returns Array of available month strings (YYYYMM format).
 */
export async function getAvailableLogMonths() {
  try {
    await ensureDirectoryExists(adminLogsDir);
    const monthDirs = await fs.readdir(adminLogsDir);
    return monthDirs
      .filter((dir) => /^\d{6}$/.test(dir))
      .sort()
      .reverse();
  } catch (error) {
    console.error("❌ Error getting available log months:", error);
    return [];
  }
}

/**
 * Cleans up old log files (keeps last 6 months).
 * @returns Success/error result.
 */
export async function cleanupOldLogs() {
  try {
    console.log("🧹 Cleaning up old log files...");

    const monthDirs = await getAvailableLogMonths();
    const keepMonths = monthDirs.slice(0, 6); // Keep last 6 months
    const deleteMonths = monthDirs.slice(6);

    for (const month of deleteMonths) {
      const monthPath = path.join(adminLogsDir, month);
      try {
        await fs.rm(monthPath, { recursive: true });
        console.log(`🗑️ Deleted old logs for month: ${month}`);
      } catch (error) {
        console.warn(`Could not delete logs for month ${month}:`, error);
      }
    }

    console.log("✅ Log cleanup completed");
    return { success: true };
  } catch (error) {
    console.error("❌ Error cleaning up logs:", error);
    return await handleAndLogApiError(error, "cleanupOldLogs");
  }
}

// Legacy compatibility functions for components still using old APIs
// These return empty data but maintain function signatures to prevent build errors

/**
 * Legacy function - returns empty users array.
 * Use Supabase Auth and profiles table instead.
 * @returns Empty array for compatibility.
 */
export async function getUsers(): Promise<Array<{ active?: boolean }>> {
  console.log("⚠️ getUsers: Legacy function - use Supabase profiles instead");
  return [];
}

/**
 * Legacy function - returns empty roles array.
 * Use Supabase role-based permissions instead.
 * @returns Empty array for compatibility.
 */
export async function getRoles(): Promise<Array<any>> {
  console.log("⚠️ getRoles: Legacy function - use Supabase roles instead");
  return [];
}

/**
 * Legacy function - returns success without action.
 * Use Supabase role-based permissions instead.
 * @param roles Roles data (ignored).
 * @returns Success result for compatibility.
 */
export async function saveRoles(roles: any) {
  console.log("⚠️ saveRoles: Legacy function - use Supabase roles instead");
  return { success: true };
}

/**
 * Get admin dashboard data including stats and recent logs
 */
export async function getAdminDashboardData() {
  try {
    // Get user stats (these would normally come from Supabase)
    const users = await getUsers();
    const roles = await getRoles();

    // Get recent logs
    const recentLogs = await getLogs(undefined, 10);

    const stats = {
      totalUsers: users?.length || 0,
      activeUsers: users?.filter((user) => user.active !== false)?.length || 0,
      inactiveUsers:
        users?.filter((user) => user.active === false)?.length || 0,
      totalRoles: roles?.length || 0,
    };

    return {
      stats,
      recentLogs: recentLogs || [],
    };
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    return {
      stats: {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        totalRoles: 0,
      },
      recentLogs: [],
    };
  }
}
