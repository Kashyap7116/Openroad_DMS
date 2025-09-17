
'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import type { ErrorAnalysisAlertsOutput } from '@/ai/flows/error-analysis-alerts';

const alertsDbDir = path.join(process.cwd(), 'database', 'alerts');
const errorLogFilePath = path.join(alertsDbDir, 'error_logs.json');


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
 * Retrieves all error logs.
 * @returns An array of error log objects.
 */
export async function getErrorLogs() {
    await ensureDirectoryExists(alertsDbDir);
    try {
        await fs.access(errorLogFilePath);
        const fileContent = await fs.readFile(errorLogFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            await fs.writeFile(errorLogFilePath, '[]', 'utf-8');
            return [];
        }
        console.error("Failed to read error logs file:", error);
        return [];
    }
}

type ErrorLogPayload = {
    errorText: string;
    context?: string;
} & ErrorAnalysisAlertsOutput;

/**
 * Saves a new error log entry.
 * @param logData The error data and its analysis.
 * @returns An object indicating success or failure.
 */
export async function saveErrorLog(logData: ErrorLogPayload) {
    await ensureDirectoryExists(alertsDbDir);
    try {
        const logs = await getErrorLogs();
        const newLog = {
            ...logData,
            log_id: `ERR-${Date.now()}`,
            created_at: new Date().toISOString(),
        };
        logs.push(newLog);
        await fs.writeFile(errorLogFilePath, JSON.stringify(logs, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error("Failed to save error log:", error);
        return { success: false, error: (error as Error).message };
    }
}
