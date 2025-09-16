
'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import sanitize from 'sanitize-filename';
import { getAllVehicles, getVehicle, saveVehicle } from './vehicle-actions';
import { getPayrollDataForMonth, savePayrollData } from './hr-actions';
import { handleAndLogApiError, getPayrollMonthYearForDate } from './utils';
import { getCurrentUser } from './auth-actions';
import { addLog } from './admin-actions';
import type { Adjustment } from '@/components/finance/employee-finance-client';

const financeDbDir = path.join(process.cwd(), 'database', 'finance');
const officeExpensesDir = path.join(financeDbDir, 'office_expenses');
const payrollDataDir = path.join(process.cwd(), 'database', 'hr', 'payroll_data');


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
 * Retrieves all employee financial adjustments by reading from all payroll files for a specific employee.
 * @returns An array of unique adjustment objects.
 */
export async function getEmployeeAdjustments(employeeId?: string) {
    await ensureDirectoryExists(payrollDataDir);
    const allAdjustments: any[] = [];
    const seenIds = new Set();
    
    try {
        const monthDirs = await fs.readdir(payrollDataDir);
        for (const monthDir of monthDirs) {
            const employeeFilesPath = path.join(payrollDataDir, monthDir);
            try {
                const stats = await fs.stat(employeeFilesPath);
                if (!stats.isDirectory()) continue;

                let employeeFiles;
                if (employeeId) {
                    const safeEmployeeId = sanitize(employeeId);
                    if (!safeEmployeeId || safeEmployeeId !== employeeId) {
                        // Skip invalid/malicious employeeId
                        continue;
                    }
                    employeeFiles = [`${safeEmployeeId}.json`];
                } else {
                    employeeFiles = await fs.readdir(employeeFilesPath);
                }
                
                for (const employeeFile of employeeFiles) {
                    const payrollFilePath = path.join(payrollDataDir, monthDir, employeeFile);
                    try {
                        await fs.access(payrollFilePath);
                        const fileContent = await fs.readFile(payrollFilePath, 'utf-8');
                        const payrollData = JSON.parse(fileContent);

                        if (payrollData.employee_financial_history && Array.isArray(payrollData.employee_financial_history)) {
                            for (const adj of payrollData.employee_financial_history) {
                                if (adj && adj.id && !seenIds.has(adj.id)) {
                                    allAdjustments.push(adj);
                                    seenIds.add(adj.id);
                                }
                            }
                        }
                    } catch {
                        // File might not exist for the employee in this month, continue.
                    }
                }
            } catch (e) {
                // Ignore if not a directory or other read error
            }
        }
    } catch (error) {
         console.error("Failed to read payroll directories:", error);
    }
    
    return allAdjustments.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
}


/**
 * Saves a single employee adjustment. This function now only writes the adjustment
 * to the payroll file corresponding to the adjustment's date.
 * If the adjustment is an 'Advance', it will also pre-populate future payroll files
 * with the scheduled installment deductions.
 * @param adjustment The adjustment object to save.
 * @param isEditing A flag to indicate if we are editing an existing adjustment.
 * @returns An object indicating success or failure.
 */
export async function saveEmployeeAdjustment(adjustment: Omit<Adjustment, 'id'> & { id?: string }, isEditing: boolean) {
  try {
    const user = await getCurrentUser();
    const adjDate = new Date(adjustment.date);
    const { payrollMonth, payrollYear } = getPayrollMonthYearForDate(adjDate);
    const employeeId = adjustment.employee_id;

    const newOrUpdatedAdjustmentId = adjustment.id || `ADJ-${Date.now()}`;
    const newOrUpdatedAdjustment: Adjustment = { ...adjustment, id: newOrUpdatedAdjustmentId } as Adjustment;

    // Save the primary adjustment record (e.g., the Advance itself)
    let payrollFile = await getPayrollDataForMonth(payrollYear, payrollMonth, employeeId) || { employee_id: employeeId, month: `${String(payrollMonth).padStart(2, '0')}${payrollYear}` };
    if (!payrollFile.employee_financial_history) {
      payrollFile.employee_financial_history = [];
    }

    if (isEditing) {
        const existingIndex = payrollFile.employee_financial_history.findIndex((a: any) => a.id === newOrUpdatedAdjustment.id);
        if (existingIndex > -1) {
            payrollFile.employee_financial_history[existingIndex] = newOrUpdatedAdjustment;
        } else {
            payrollFile.employee_financial_history.push(newOrUpdatedAdjustment);
        }
    } else {
        payrollFile.employee_financial_history.push(newOrUpdatedAdjustment);
    }
    await savePayrollData(payrollYear, payrollMonth, payrollFile);


    // If it's a new Advance, create future deduction records
    if (newOrUpdatedAdjustment.type === 'Advance' && !isEditing) {
        const installments = newOrUpdatedAdjustment.installments || 1;
        const installmentAmount = newOrUpdatedAdjustment.amount / installments;
        
        for (let i = 1; i <= installments; i++) {
            let nextPayrollMonth = payrollMonth + i;
            let nextPayrollYear = payrollYear;

            if (nextPayrollMonth > 12) {
                nextPayrollMonth = nextPayrollMonth % 12;
                if (nextPayrollMonth === 0) nextPayrollMonth = 12; // Handle December case
                nextPayrollYear = payrollYear + Math.floor((payrollMonth + i -1) / 12);
            }
            
            // Set the deduction date to the 21st of the month before the payroll period starts
            const deductionDate = new Date(nextPayrollYear, nextPayrollMonth - 2, 21);

            const deductionRecord = {
                id: `repay-${newOrUpdatedAdjustment.id}-${i}`,
                employee_id: employeeId,
                type: 'Deduction' as const,
                amount: installmentAmount,
                date: deductionDate.toISOString().split('T')[0],
                remarks: `Advance Installment ${i}/${installments}`,
            };
            
            let futurePayrollFile = await getPayrollDataForMonth(nextPayrollYear, nextPayrollMonth, employeeId) || { employee_id: employeeId, month: `${String(nextPayrollMonth).padStart(2, '0')}${nextPayrollYear}` };
            if (!futurePayrollFile.employee_financial_history) {
                futurePayrollFile.employee_financial_history = [];
            }
            futurePayrollFile.employee_financial_history.push(deductionRecord);
            await savePayrollData(nextPayrollYear, nextPayrollMonth, futurePayrollFile);
        }
    }


    await addLog({
        user_id: user?.user_id || 'SYSTEM',
        user_name: user?.name || 'System User',
        module: 'Finance',
        action: `${isEditing ? 'Updated' : 'Created'} employee adjustment`,
        details: { employee_id: newOrUpdatedAdjustment.employee_id, type: newOrUpdatedAdjustment.type, amount: newOrUpdatedAdjustment.amount }
    });

    return { success: true };
  } catch (error) {
    return await handleAndLogApiError(error, 'saveEmployeeAdjustment');
  }
}

/**
 * Deletes a specific employee adjustment by its ID.
 * It will first try to delete based on the employee_id if available.
 * If not, it will scan all payroll files to find and remove the orphan record.
 * @param adjustmentToDelete The full adjustment object to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteEmployeeAdjustment(adjustmentToDelete: Adjustment) {
    const user = await getCurrentUser();
    try {
        const adjDate = new Date(adjustmentToDelete.date);
        const { payrollMonth, payrollYear } = getPayrollMonthYearForDate(adjDate);
        const employeeId = adjustmentToDelete.employee_id;
        let foundAndDeleted = false;

        if (employeeId) {
            // Happy path: employee_id exists, we can directly target the file.
            let payrollFile = await getPayrollDataForMonth(payrollYear, payrollMonth, employeeId);
            if (payrollFile?.employee_financial_history) {
                const initialCount = payrollFile.employee_financial_history.length;
                payrollFile.employee_financial_history = payrollFile.employee_financial_history.filter((a: any) => a.id !== adjustmentToDelete.id);
                if (payrollFile.employee_financial_history.length < initialCount) {
                    foundAndDeleted = true;
                    await savePayrollData(payrollYear, payrollMonth, payrollFile);
                }
            }
        } 
        
        if (!employeeId || !foundAndDeleted) {
            // Sad path: No employee_id, or adjustment not found in its expected file (e.g., date was edited).
            // Scan all payroll files to find and remove the orphan record.
            const allMonthDirs = await fs.readdir(payrollDataDir);
            for (const monthDir of allMonthDirs) {
                const employeeFilesPath = path.join(payrollDataDir, monthDir);
                try {
                    const stats = await fs.stat(employeeFilesPath);
                    if (!stats.isDirectory()) continue;

                    const employeeFiles = await fs.readdir(employeeFilesPath);
                    for (const employeeFile of employeeFiles) {
                         const filePath = path.join(payrollDataDir, monthDir, employeeFile);
                         let payrollData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
                         if (payrollData.employee_financial_history) {
                            const initialCount = payrollData.employee_financial_history.length;
                            payrollData.employee_financial_history = payrollData.employee_financial_history.filter((a: any) => a.id !== adjustmentToDelete.id);
                             if (payrollData.employee_financial_history.length < initialCount) {
                                await fs.writeFile(filePath, JSON.stringify(payrollData, null, 2), 'utf-8');
                                foundAndDeleted = true;
                                break; 
                            }
                         }
                    }
                } catch {}
                if (foundAndDeleted) break;
            }
        }

        if (!foundAndDeleted) {
            return { success: false, error: 'Could not find the adjustment record to delete.' };
        }

        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'Finance',
            action: `Deleted employee adjustment`,
            details: { ...adjustmentToDelete }
        });

        return { success: true };

    } catch (error) {
        return await handleAndLogApiError(error, `deleteEmployeeAdjustment for ${adjustmentToDelete.id}`);
    }
}


/**
 * Calculates and returns the overall financial summary for the current fiscal period.
 * @returns An object with total income, expenses, and net profit/loss for the period.
 */
export async function getFinanceSummary() {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let startDate, endDate;
    if (currentDay > 20) {
        // Current period is from 21st of this month to 20th of next month
        startDate = new Date(currentYear, currentMonth, 21);
        endDate = new Date(currentYear, currentMonth + 1, 20, 23, 59, 59, 999);
    } else {
        // Current period is from 21st of last month to 20th of this month
        startDate = new Date(currentYear, currentMonth - 1, 21);
        endDate = new Date(currentYear, currentMonth, 20, 23, 59, 59, 999);
    }

    const vehicles = await getAllVehicles();
    const employeeAdjustments = await getEmployeeAdjustments();

    let total_income = 0;
    let total_expenses = 0;

    const isInPeriod = (dateStr: string) => {
        const date = new Date(dateStr);
        return date >= startDate && date <= endDate;
    };

    // Process vehicle-related transactions within the period
    vehicles.forEach(vehicle => {
        (vehicle.financial_history || []).forEach(tx => {
            if (isInPeriod(tx.date)) {
                if (tx.type === 'income') {
                    total_income += tx.amount;
                } else {
                    total_expenses += tx.amount;
                }
            }
        });
    });

    // Process employee-related adjustments within the period
    employeeAdjustments.forEach((adj: any) => {
        if (isInPeriod(adj.date)) {
             if (['Bonus', 'Addition', 'Employee Expense'].includes(adj.type)) {
                total_expenses += adj.amount;
            }
        }
    });
    
    const officeExpenses = await getOfficeExpensesForPeriod(startDate, endDate);
    const total_office_expenses = officeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    total_expenses += total_office_expenses;

    const net_profit_loss = total_income - total_expenses;

    return {
        total_income,
        total_expenses,
        net_profit_loss,
        total_office_expenses,
    };
}


/**
 * Saves an office expense transaction to the correct monthly file.
 * @param transaction The office transaction data.
 * @returns An object indicating success or failure.
 */
export async function saveOfficeTransaction(transaction: Omit<Adjustment, 'id' | 'employee_id'>) {
    try {
        const user = await getCurrentUser();
        await ensureDirectoryExists(officeExpensesDir);
        const date = new Date(transaction.date);
        const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
        const filePath = path.join(officeExpensesDir, `${monthKey}.json`);
        
        let monthExpenses: any[] = [];
        try {
            await fs.access(filePath);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            monthExpenses = JSON.parse(fileContent);
        } catch {
            // File does not exist, will be created
        }

        const newTransaction = { ...transaction, id: `OFFICE-${Date.now()}` };
        monthExpenses.push(newTransaction);
        
        await fs.writeFile(filePath, JSON.stringify(monthExpenses, null, 2), 'utf-8');

        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'Finance',
            action: 'Added Office Transaction',
            details: { category: transaction.category, amount: transaction.amount }
        });

        return { success: true };
    } catch(error) {
        return await handleAndLogApiError(error, 'saveOfficeTransaction');
    }
}


/**
 * Retrieves all office expenses for a given period.
 * @param startDate The start of the period.
 * @param endDate The end of the period.
 * @returns An array of office expense objects.
 */
async function getOfficeExpensesForPeriod(startDate: Date, endDate: Date) {
    const allExpenses: any[] = [];
    try {
        await ensureDirectoryExists(officeExpensesDir);
        const files = await fs.readdir(officeExpensesDir);
        for(const file of files) {
            if(file.endsWith('.json')) {
                const filePath = path.join(officeExpensesDir, file);
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const expenses = JSON.parse(fileContent);
                const expensesInPeriod = expenses.filter((exp: any) => {
                    const expDate = new Date(exp.date);
                    return expDate >= startDate && expDate <= endDate;
                });
                allExpenses.push(...expensesInPeriod);
            }
        }
    } catch (error) {
        console.error("Could not read office expenses:", error);
    }
    return allExpenses;
}
