
'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { enrichAttendanceRecord, calculateAttendanceLogic } from './payroll-logic';
import type { AttendanceRecord, EnrichedAttendanceRecord, GroupedAttendance, PayrollRecord } from '@/app/(dashboard)/hr/attendance/page';
import { getEmployeeAdjustments, saveEmployeeAdjustment } from './finance-actions';
import type { Adjustment } from '@/components/finance/employee-finance-client';
import { handleAndLogApiError } from './utils';
import { getCurrentUser } from './auth-actions';
import { addLog } from './admin-actions';

const hrDbDir = path.join(process.cwd(), 'database', 'hr');
const employeesDbDir = path.join(hrDbDir, 'employees');
const attendanceDataDir = path.join(hrDbDir, 'attendance_data');
const payrollDataDir = path.join(hrDbDir, 'payroll_data');
const holidaysDataDir = path.join(hrDbDir, 'holidays');
const attendanceRulesPath = path.join(hrDbDir, 'attendance-rules.json');
const countriesListPath = path.join(hrDbDir, 'countries.json');

const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'hr', 'employees');


async function ensureDirectoryExists(dirPath: string) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}


/**
 * Reads all individual employee JSON files from the database/hr/employees directory.
 * @returns A promise that resolves to an array of all employee records.
 */
export async function getEmployees(): Promise<any[]> {
    await ensureDirectoryExists(employeesDbDir);
    try {
        const files = await fs.readdir(employeesDbDir);
        const allEmployees: any[] = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(employeesDbDir, file);
                try {
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    allEmployees.push(JSON.parse(fileContent));
                } catch (readError) {
                    console.error(`Failed to read or parse ${file}:`, readError);
                }
            }
        }
        return allEmployees;
    } catch (error) {
        console.error('Failed to read employees directory:', error);
        return [];
    }
}

/**
 * Retrieves a single employee record from its JSON file.
 * @param employeeId The ID of the employee to retrieve.
 * @returns The employee record object, or null if not found.
 */
export async function getEmployee(employeeId: string): Promise<any | null> {
    if (!employeeId) return null;
    await ensureDirectoryExists(employeesDbDir);
    const filePath = path.join(employeesDbDir, `${employeeId}.json`);
    try {
        await fs.access(filePath);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        return null;
    }
}

export async function getCountries() {
    try {
        const fileContent = await fs.readFile(countriesListPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch(e) {
        console.error("Could not read countries list from database directory", e);
        return [];
    }
}

async function generateNewEmployeeId(nationality: string): Promise<string> {
    const allCountries = await getCountries();
    const country = allCountries.find((c: any) => c.name === nationality);
    const natCode = country ? country.code : 'XX';

    const employees = await getEmployees();
    const sameNatEmployees = employees.filter(e => e.employee_id.startsWith(`${natCode}-`));
    
    const maxId = sameNatEmployees.reduce((max, e) => {
        const numPart = parseInt(e.employee_id.split('-')[1], 10);
        return numPart > max ? numPart : max;
    }, 0);

    const newIdNumber = maxId + 1;
    return `${natCode}-${String(newIdNumber).padStart(4, '0')}`;
}

async function saveEmployeeFile(employeeId: string, subfolder: string, file: File): Promise<string> {
    const employeeUploadsDir = path.join(uploadsDir, employeeId, subfolder);
    await ensureDirectoryExists(employeeUploadsDir);

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const uniqueFileName = `${Date.now()}-${sanitizedFileName}`;
    const filePath = path.join(employeeUploadsDir, uniqueFileName);
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);
    
    return `/uploads/hr/employees/${employeeId}/${subfolder}/${uniqueFileName}`;
}


/**
 * Creates or updates an employee record, including handling all file uploads.
 * @param existingId The ID of the employee to update, or null for a new employee.
 * @param formData The complete data from the employee form.
 * @returns An object indicating success or failure.
 */
export async function saveEmployee(existingId: string | null, formData: any) {
    try {
        const user = await getCurrentUser();
        const newEmployeeId = existingId || await generateNewEmployeeId(formData.personal_info.nationality);
        const filePath = path.join(employeesDbDir, `${newEmployeeId}.json`);

        const processFileField = async (fieldKey: string, subfolder: string) => {
            const file = formData.documents[fieldKey];
            if (file === null) return null; // Handle file removal
            if (file && typeof file === 'object' && file.name) {
                return await saveEmployeeFile(newEmployeeId, subfolder, file);
            }
            return typeof file === 'string' ? file : null;
        };

        const documentPaths = {
            photo: await processFileField('photo', 'photo'),
            id_proof: await processFileField('id_proof', 'id_proof'),
            address_proof: await processFileField('address_proof', 'address_proof'),
            education_cert: await processFileField('education_cert', 'education_cert'),
            professional_cert: await processFileField('professional_cert', 'professional_cert'),
        };

        const finalRecord = {
            ...formData,
            employee_id: newEmployeeId,
            documents: documentPaths,
        };

        await fs.writeFile(filePath, JSON.stringify(finalRecord, null, 2), 'utf-8');

        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'HR',
            action: `${existingId ? 'Updated' : 'Created'} employee record`,
            details: { employee_id: newEmployeeId, name: finalRecord.personal_info.name }
        });

        return { success: true, employee_id: newEmployeeId };

    } catch (error) {
        return await handleAndLogApiError(error, `saveEmployee for ${existingId || 'new user'}`);
    }
}

/**
 * Marks an employee's status as "Left" instead of deleting their record.
 * @param employeeId The ID of the employee to mark as left.
 * @returns An object indicating success or failure.
 */
export async function deleteEmployee(employeeId: string) {
    if (!employeeId) {
        return { success: false, error: "Employee ID is required." };
    }

    try {
        const user = await getCurrentUser();
        const employee = await getEmployee(employeeId);
        if (!employee) {
            return { success: false, error: "Employee not found." };
        }
        
        employee.job_details.status = 'Left';
        
        const filePath = path.join(employeesDbDir, `${employeeId}.json`);
        await fs.writeFile(filePath, JSON.stringify(employee, null, 2), 'utf-8');

        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'HR',
            action: `Marked employee as 'Left'`,
            details: { employee_id: employeeId }
        });

        return { success: true };
    } catch (error) {
        return await handleAndLogApiError(error, `deleteEmployee for ${employeeId}`);
    }
}


/**
 * Gets the list of holidays from a JSON file for a specific year.
 * @returns The array of holiday objects.
 */
export async function getHolidays(year: number): Promise<{ date: string; name: string; }[]> {
    const filePath = path.join(holidaysDataDir, `${year}.json`);
    try {
        await fs.access(filePath);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, '[]', 'utf-8');
            return [];
        }
        console.error(`Failed to read holidays for ${year}:`, error);
        return [];
    }
}

/**
 * Saves the list of holidays to a JSON file for a specific year.
 * @param holidays The array of holiday objects to save.
 * @returns An object indicating success or failure.
 */
export async function saveHolidays(year: number, holidays: { date: string; name: string; }[]) {
    const filePath = path.join(holidaysDataDir, `${year}.json`);
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(holidays, null, 2), 'utf-8');

        const user = await getCurrentUser();
        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'HR',
            action: 'Updated holiday list',
            details: { year: year, holiday_count: holidays.length }
        });

        return { success: true };
    } catch (error) {
        return await handleAndLogApiError(error, `saveHolidays for year ${year}`);
    }
}


/**
 * Gets attendance rules from a JSON file.
 * @returns The attendance rules object.
 */
async function getAttendanceRules(): Promise<any> {
  await ensureDirectoryExists(hrDbDir);
  try {
    const fileContent = await fs.readFile(attendanceRulesPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        const defaultRules = {
          standard_work_hours: { in_time: "09:00", out_time: "18:00" },
          overtime_rules: { minimum_minutes_after_out_time: 0 },
          weekly_holidays: [],
        };
        await fs.writeFile(attendanceRulesPath, JSON.stringify(defaultRules, null, 2), 'utf-8');
        return defaultRules;
    }
    console.error("Failed to read attendance rules:", error);
    return {};
  }
}

/**
 * Saves attendance rules to a JSON file.
 * @param rules The new rules object to save.
 * @returns An object indicating success or failure.
 */
export async function saveAttendanceRules(rules: any) {
  try {
    const user = await getCurrentUser();
    await fs.writeFile(attendanceRulesPath, JSON.stringify(rules, null, 2), 'utf-8');

    await addLog({
        user_id: user?.user_id || 'SYSTEM',
        user_name: user?.name || 'System User',
        module: 'HR',
        action: 'Updated attendance calculation rules.'
    });

    return { success: true };
  } catch (error) {
    return await handleAndLogApiError(error, `saveAttendanceRules`);
  }
}


/**
 * Gets raw attendance data from a JSON file on the server.
 * @param year The year of the attendance data.
 * @param month The month of the attendance data.
 * @returns The attendance data array, or an empty array if the file doesn't exist.
 */
export async function getRawAttendanceData(year: number, month: number): Promise<any[]> {
  const monthKey = `${String(month).padStart(2, '0')}${year}`;
  const filePath = path.join(attendanceDataDir, `${monthKey}.json`);

  try {
    await fs.access(filePath);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, '[]', 'utf-8');
        return [];
    }
    console.log(`No attendance data found for ${monthKey}, returning empty array.`);
    return [];
  }
}

/**
 * Saves attendance data to a JSON file on the server.
 * This simulates writing to a database.
 * @param year The year of the attendance data.
 * @param month The month of the attendance data.
 * @param data The attendance data to save.
 */
export async function saveAttendanceData(year: number, month: number, data: any[]) {
  const monthKey = `${String(month).padStart(2, '0' )}${year}`;
  const filePath = path.join(attendanceDataDir, `${monthKey}.json`);
  
  try {
    const user = await getCurrentUser();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Successfully saved attendance data to ${filePath}`);

    await addLog({
        user_id: user?.user_id || 'SYSTEM',
        user_name: user?.name || 'System User',
        module: 'HR',
        action: `Saved/Updated attendance data`,
        details: { month: monthKey, record_count: data.length }
    });

    return { success: true, path: filePath };
  } catch (error) {
    return await handleAndLogApiError(error, `saveAttendanceData for ${monthKey}`);
  }
}


/**
 * Gets and processes all attendance data for a given month on the server.
 * @param year The year of the attendance data.
 * @param month The month of the attendance data.
 * @returns An object containing the processed data and the rules used.
 */
export async function getProcessedAttendance(year: number, month: number): Promise<{groupedData: GroupedAttendance[], rules: any}> {
    const rawData = await getRawAttendanceData(year, month);
    const rules = await getAttendanceRules();
    const holidays = await getHolidays(year);
    const allEmployees = await getEmployees();
    
    rules.holidays = holidays || [];

    if (!rawData.length) {
        const employeeData = allEmployees.map(emp => ({
            employee_id: emp.employee_id,
            name: emp.personal_info.name,
            photo: emp.documents.photo,
            present: 0,
            late: 0,
            absent: 0,
            leave: 0,
            holiday: 0,
            total_raw_overtime: 0,
            total_payable_overtime: 0,
            records: [],
        }));
        return { groupedData: employeeData, rules };
    }

    const enrichedData: EnrichedAttendanceRecord[] = await Promise.all(
        rawData.map(record => enrichAttendanceRecord(record, rules))
    );

    const grouped = await Promise.all(allEmployees.map(async (emp) => {
        const records = enrichedData.filter(rec => rec.employee_id === emp.employee_id);
        const { presentDays, lateDays, absentDays, leaveDays, holidayDays, rawTotalOT, payableOTHours } = await calculateAttendanceLogic(records);

        return {
            employee_id: emp.employee_id,
            name: emp.personal_info.name,
            photo: emp.documents.photo,
            present: presentDays,
            late: lateDays,
            absent: absentDays,
            leave: leaveDays,
            holiday: holidayDays,
            total_raw_overtime: rawTotalOT,
            total_payable_overtime: payableOTHours,
            records: records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        };
    }));
    
    const filteredGroupedData = grouped.filter(g => g.records.length > 0 || allEmployees.some(e => e.employee_id === g.employee_id));

    return { groupedData: filteredGroupedData, rules };
}

/**
 * Saves a generated payroll record for a specific employee and month.
 * @param year The year of the payroll period.
 * @param month The month of the payroll period.
 * @param payrollRecord The calculated payroll data for one employee.
 * @returns An object indicating success or failure.
 */
export async function savePayrollData(year: number, month: number, payrollRecord: PayrollRecord | any) {
  const monthKey = `${String(month).padStart(2, '0')}${year}`;
  const employeeId = payrollRecord.employee_id;
  const monthDir = path.join(payrollDataDir, monthKey);
  const filePath = path.join(monthDir, `${employeeId}.json`);

  try {
    const user = await getCurrentUser();
    await ensureDirectoryExists(monthDir);
    
    await fs.writeFile(filePath, JSON.stringify(payrollRecord, null, 2), 'utf-8');

    await addLog({
        user_id: user?.user_id || 'SYSTEM',
        user_name: user?.name || 'System User',
        module: 'HR',
        action: 'Calculated and saved payroll',
        details: { employee_id: employeeId, period: monthKey, net_salary: payrollRecord.net_salary }
    });

    return { success: true };
  } catch (error) {
    return await handleAndLogApiError(error, `savePayrollData for ${employeeId} for ${monthKey}`);
  }
}

/**
 * Retrieves the payroll data for a specific employee for a given month.
 * @param year The year of the payroll.
 * @param month The month of the payroll.
 * @param employeeId The ID of the employee.
 * @returns The payroll data object, or null if not found.
 */
export async function getPayrollDataForMonth(year: number, month: number, employeeId: string): Promise<any | null> {
  const monthKey = `${String(month).padStart(2, '0')}${year}`;
  const filePath = path.join(payrollDataDir, monthKey, `${employeeId}.json`);
  
  try {
    await fs.access(filePath);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // File not found or other error
    return null;
  }
}
