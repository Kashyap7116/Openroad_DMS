
'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { handleAndLogApiError } from './utils';
import { getCurrentUser } from './auth-actions';

const adminDbDir = path.join(process.cwd(), 'database', 'admin');
const rolesFilePath = path.join(adminDbDir, 'roles.json');
const logsDir = path.join(process.cwd(), 'database', 'logs');
const adminLogsDir = path.join(process.cwd(), 'database', 'admin', 'logs');
const usersFilePath = path.join(adminDbDir, 'users.json');


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
 * Retrieves all users from the admin users file.
 * @returns An array of user objects.
 */
export async function getUsers() {
    await ensureDirectoryExists(adminDbDir);
    try {
        await fs.access(usersFilePath);
        const fileContent = await fs.readFile(usersFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            await fs.writeFile(usersFilePath, '[]', 'utf-8');
        } else {
            console.error("Failed to read users file:", error);
        }
        return [];
    }
}

/**
 * Saves the list of users to the admin users file.
 * @param users The full array of users to save.
 * @returns An object indicating success or failure.
 */
export async function saveUsers(users: any[]) {
    await ensureDirectoryExists(adminDbDir);
    try {
        const user = await getCurrentUser();
        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'Admin',
            action: `Updated user list. Total users: ${users.length}.`
        });
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        return await handleAndLogApiError(error, 'saveUsers');
    }
}


/**
 * Retrieves all roles.
 * @returns An array of role objects.
 */
export async function getRoles() {
    await ensureDirectoryExists(adminDbDir);
    try {
        await fs.access(rolesFilePath);
        const fileContent = await fs.readFile(rolesFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            await fs.writeFile(rolesFilePath, '[]', 'utf-8');
            return [];
        }
        console.error("Failed to read roles file:", error);
        return [];
    }
}

/**
 * Saves the entire list of roles.
 * @param roles The full array of roles to save.
 * @returns An object indicating success or failure.
 */
export async function saveRoles(roles: any[]) {
    await ensureDirectoryExists(adminDbDir);
    try {
        const user = await getCurrentUser();
        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'Admin',
            action: 'Updated role permissions.'
        });
        await fs.writeFile(rolesFilePath, JSON.stringify(roles, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        return await handleAndLogApiError(error, 'saveRoles');
    }
}


/**
 * Retrieves all logs from all monthly log directories, including the admin logs.
 * @returns An array of all log objects.
 */
export async function getAllLogs() {
    const allLogs: any[] = [];
    const logDirs = [logsDir, adminLogsDir];

    for (const dir of logDirs) {
        await ensureDirectoryExists(dir);
        try {
            const monthDirs = await fs.readdir(dir);
            for (const monthDir of monthDirs) {
                // Handle both structures: /logs/YYYY-MM/activity.json and /admin/logs/YYYY-MM.json
                let filePath = path.join(dir, monthDir, 'activity.json'); // Default to directory structure
                let isDirectory = false;
                try {
                   isDirectory = (await fs.stat(path.join(dir, monthDir))).isDirectory();
                   if (!isDirectory) {
                       filePath = path.join(dir, monthDir); // It's a file, not a directory
                   }
                } catch {
                   // file does not exist, stat fails
                }
                
                try {
                    await fs.access(filePath);
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    const logs = JSON.parse(fileContent);
                    if (Array.isArray(logs)) {
                        allLogs.push(...logs);
                    }
                } catch (error) {
                    // Ignore if file doesn't exist or is not valid JSON
                }
            }
        } catch (error) {
            console.error(`Failed to read logs from ${dir}:`, error);
        }
    }
    
    return allLogs;
}


type LogEntry = {
    user_id: string;
    user_name: string;
    module: string;
    action: string;
    details?: Record<string, any>;
    status?: 'success' | 'failure';
}

/**
 * Adds a new log entry to the current month's log file.
 * @param logEntry The log object to add.
 * @returns An object indicating success or failure.
 */
export async function addLog(logEntry: LogEntry) {
    const now = new Date();
    const monthKey = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
    const monthDir = path.join(logsDir, monthKey);
    await ensureDirectoryExists(monthDir);
    const filePath = path.join(monthDir, 'activity.json');

    try {
        let logs: any[] = [];
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            logs = JSON.parse(fileContent);
        } catch (error) {
            // File doesn't exist, will be created.
        }

        const newLog = {
            ...logEntry,
            log_id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: now.toISOString(),
            ip_address: "127.0.0.1", // Mock IP address
            status: logEntry.status || 'success',
        };

        logs.push(newLog);
        await fs.writeFile(filePath, JSON.stringify(logs, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error("Failed to add log:", error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Gets summary data for the admin dashboard.
 */
export async function getAdminDashboardData() {
    const users = await getUsers();
    const logs = await getAllLogs();
    const roles = await getRoles();

    const activeUsers = users.filter((u: any) => u.status === 'Active').length;
    const inactiveUsers = users.length - activeUsers;
    
    const recentLogs = logs
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

    return {
        stats: {
            totalUsers: users.length,
            activeUsers,
            inactiveUsers,
            totalRoles: roles.length,
        },
        recentLogs,
    };
}
