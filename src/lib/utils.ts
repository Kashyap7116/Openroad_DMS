
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { errorAnalysisAlerts } from "@/ai/flows/error-analysis-alerts";
import { saveErrorLog } from "./alerts-actions";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * A centralized utility to handle API errors. It analyzes the error using an AI flow
 * and logs the structured analysis to a dedicated error log file.
 * @param error The error object or string.
 * @param context A string describing the context in which the error occurred.
 * @returns A standardized error response object.
 */
export async function handleAndLogApiError(error: any, context: string) {
    console.error(`Error in ${context}:`, error);
    try {
        const analysis = await errorAnalysisAlerts({
            errorText: (error as Error).stack || (error as Error).message || String(error),
            context: `An error occurred in the function: ${context}.`
        });

        await saveErrorLog({
            errorText: (error as Error).stack || (error as Error).message,
            context,
            ...analysis,
        });

        return {
            success: false,
            error: `An unexpected error occurred in ${context}.`,
            analysis: {
                probableCause: analysis.probableCause,
                suggestedSolution: analysis.suggestedSolution,
            },
        };
    } catch (analysisError) {
        console.error("CRITICAL: Failed to analyze or log the original error.", analysisError);
        // Fallback error message if the analysis itself fails
        return {
            success: false,
            error: `An unexpected error occurred, and the AI error analysis also failed. Original context: ${context}. Original error: ${(error as Error).message}`,
        };
    }
}


/**
 * Generates a new standardized ID for records.
 * @param prefix The module prefix ('PH', 'MT', 'SL').
 * @param existingIds An array of existing IDs for the module to check for serial number.
 * @returns A new ID string in the format <Prefix><ddmmyy><SerialNo>.
 */
export function generateNewId(prefix: 'PH' | 'MT' | 'SL' | 'BN', existingIds: string[]): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;
    
    const idPrefix = `${prefix}${dateStr}`;

    const todayIds = existingIds.filter(id => id.startsWith(idPrefix));
    
    let maxSerial = 0;
    if (todayIds.length > 0) {
        maxSerial = Math.max(...todayIds.map(id => {
            const serialStr = id.substring(idPrefix.length);
            return parseInt(serialStr, 10) || 0;
        }));
    }

    const newSerial = String(maxSerial + 1).padStart(2, '0');
    
    return `${idPrefix}${newSerial}`;
}


/**
 * Calculates the payroll month and year for a given transaction date.
 * The payroll period runs from the 21st of one month to the 20th of the next.
 * e.g., A transaction on March 20th belongs to the "March" payroll.
 * A transaction on March 21st belongs to the "April" payroll.
 * @param date The date of the transaction.
 * @returns An object with the `payrollMonth` and `payrollYear`.
 */
export function getPayrollMonthYearForDate(date: Date) {
    const day = date.getDate();
    let month = date.getMonth() + 1; // 1-indexed month (1-12)
    let year = date.getFullYear();

    if (day > 20) {
        // Belongs to the next month's payroll period
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    
    return { payrollMonth: month, payrollYear: year };
}

    