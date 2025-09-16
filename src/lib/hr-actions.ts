
'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import sanitizeFilename from 'sanitize-filename';
import { enrichAttendanceRecord, calculateAttendanceLogic } from './payroll-logic';
import type { AttendanceRecord, EnrichedAttendanceRecord, GroupedAttendance, PayrollRecord } from '@/app/(dashboard)/hr/attendance/page';
import { getEmployeeAdjustments, saveEmployeeAdjustment } from './finance-actions';
import type { Adjustment } from '@/components/finance/employee-finance-client';
import { handleAndLogApiError } from './utils';
import { getCurrentUser } from './supabase-auth-actions';
import { addLog } from './admin-actions';


// Helper to check if a path is a descendant of a root directory
function isSubPath(child: string, parent: string): boolean {
    const relative = path.relative(parent, child);
    // The target must not traverse out (no leading ".."), and not be absolute, and not empty (not the parent itself)
    return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

// Only allow employee IDs to contain letters, numbers, hyphens, and underscores
function sanitizeEmployeeId(id: string): string | null {
    if (typeof id !== 'string') return null;
    const trimmed = id.trim();
    // Accept only IDs matching safe pattern (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
    const sanitized = sanitizeFilename(trimmed);
    // filename must be the same, not empty, and not a reserved name
    if (
        sanitized !== trimmed ||
        !sanitized ||
        sanitized === '.' || sanitized === '..' ||
        /^[.]/.test(sanitized) || // no leading dot (hidden file)
        /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(sanitized) // Windows reserved
    ) {
        return null;
    }
    return sanitized;
}

// Only allow year values to be integers in a safe range
function sanitizeYear(year: unknown): number | null {
    if (typeof year !== 'number' || !Number.isInteger(year)) return null;
    // Optionally set reasonable bounds, e.g., 1900–2100
    if (year < 1900 || year > 2100) return null;
    return year;
}

// Only allow month values to be integers in range 1-12
function sanitizeMonth(month: unknown): number | null {
    if (typeof month !== 'number' || !Number.isInteger(month)) return null;
    if (month < 1 || month > 12) return null;
    return month;
}

const hrDbDir = path.join(process.cwd(), 'database', 'hr');
const employeesDbDir = path.join(hrDbDir, 'employees');
const attendanceDataDir = path.join(hrDbDir, 'attendance_data');
const payrollDataDir = path.join(hrDbDir, 'payroll_data');
const holidaysDataDir = path.join(hrDbDir, 'holidays');
const attendanceRulesPath = path.join(hrDbDir, 'attendance-rules.json');
const countriesListPath = path.join(hrDbDir, 'countries.json');

const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'hr', 'employees');


/**
 * Ensures a directory exists, with optional root directory containment check.
 * @param dirPath Path to the directory to ensure exists.
 * @param rootDir (optional) If set, ensures dirPath is a subdirectory of this root.
 */
async function ensureDirectoryExists(dirPath: string, rootDir?: string) {
    // Canonicalize the provided directory path using realpath
    let canonicalDirPath: string;
    try {
        canonicalDirPath = await fs.realpath(dirPath);
    } catch {
        canonicalDirPath = path.resolve(dirPath);
    }
    let canonicalRootDir: string | undefined = undefined;
    if (rootDir) {
        try {
            canonicalRootDir = await fs.realpath(rootDir);
        } catch {
            canonicalRootDir = path.resolve(rootDir);
        }
    }
    try {
        // Strict containment check (best practice, AFTER canonicalization)
        if (canonicalRootDir && !isSubPath(canonicalDirPath, canonicalRootDir)) {
            throw new Error(`Trying to ensure/create directory outside of root: ${canonicalDirPath} (root: ${canonicalRootDir})`);
        }
        await fs.access(canonicalDirPath);
    } catch {
        // Strict containment check again before mkdir (in case of race conditions or unexpected fs state)
        if (canonicalRootDir && !isSubPath(canonicalDirPath, canonicalRootDir)) {
            throw new Error(`Trying to ensure/create directory outside of root in mkdir: ${canonicalDirPath} (root: ${canonicalRootDir})`);
        }
        await fs.mkdir(canonicalDirPath, { recursive: true });
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
    const safeId = sanitizeFilename(employeeId);
    if (!safeId) return null; // Reject empty/invalid filenames
    const filePath = path.resolve(employeesDbDir, `${safeId}.json`);
    if (!isSubPath(filePath, employeesDbDir)) {
        return null; // Prevent directory traversal
    }
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
    // Re-validate employeeId server-side to ensure sanitization is always enforced
    const safeEmployeeId = sanitizeEmployeeId(employeeId);
    if (!safeEmployeeId) {
        throw new Error('Invalid or unsafe employee ID specified.');
    }
    const allowedSubfolders = [
        'photo',
        'id_proof',
        'address_proof',
        'education_cert',
        'professional_cert'
    ];
    if (!allowedSubfolders.includes(subfolder)) {
        throw new Error('Unsafe subfolder argument detected.');
    }
    const employeeUploadsDir = path.join(uploadsDir, safeEmployeeId, subfolder);
    // Resolve the final upload directory path and check it's inside the root uploads directory
    const resolvedUploadsDir = path.resolve(employeeUploadsDir);
    const resolvedRoot = path.resolve(uploadsDir);
    // Use realpath for actual filesystem path resolution (symlinks, etc.)
    const canonicalUploadsDir = await fs.realpath(resolvedUploadsDir);
    const canonicalRoot = await fs.realpath(resolvedRoot);
    if (!isSubPath(canonicalUploadsDir, canonicalRoot)) {
        throw new Error('Unsafe upload directory path detected.');
    }
    await ensureDirectoryExists(canonicalUploadsDir);

    // Use sanitize-filename module for rigorous sanitization
    const sanitizedFileName = sanitizeFilename(file.name);
    // Ensure we don't accidentally create a hidden or empty filename
    if (!sanitizedFileName || sanitizedFileName.startsWith('.')) {
        throw new Error('Unsafe or invalid filename detected.');
    }
    const uniqueFileName = `${Date.now()}-${sanitizedFileName}`;
    const filePath = path.join(canonicalUploadsDir, uniqueFileName);
    // Resolve and canonicalize final file path for defense-in-depth
    const canonicalFilePath = await fs.realpath(path.resolve(filePath));
    if (!isSubPath(canonicalFilePath, canonicalRoot)) {
        throw new Error('Unsafe resolved file path detected.');
    }
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(canonicalFilePath, fileBuffer);

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
        const unsanitizedEmployeeId = existingId || await generateNewEmployeeId(formData.personal_info.nationality);
        const newEmployeeId = sanitizeEmployeeId(unsanitizedEmployeeId);
        if (!newEmployeeId) {
            throw new Error('Invalid employee ID specified.');
        }
        const targetPath = path.join(employeesDbDir, `${newEmployeeId}.json`);
        // Canonicalize both target and base directory to ensure containment security
        const canonicalBaseDir = await fs.realpath(employeesDbDir);
        let canonicalFilePath;
        try {
            canonicalFilePath = await fs.realpath(targetPath);
        } catch (e) {
            // If file does not exist yet, canonicalize using path.resolve to check directory (for writes)
            canonicalFilePath = path.resolve(targetPath);
        }
        if (!isSubPath(canonicalFilePath, canonicalBaseDir)) {
            throw new Error('Resolved file path is outside the allowed employee database directory.');
        }

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

        await fs.writeFile(canonicalFilePath, JSON.stringify(finalRecord, null, 2), 'utf-8');

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
    const sanitizedId = sanitizeEmployeeId(employeeId);
    if (!sanitizedId) {
        return { success: false, error: "Invalid employee ID specified." };
    }

    try {
        const user = await getCurrentUser();
        const employee = await getEmployee(sanitizedId);
        if (!employee) {
            return { success: false, error: "Employee not found." };
        }
        
        employee.job_details.status = 'Left';
        
        // Ensure employeesDbDir is absolute--resolve once if necessary
        const employeeDbRoot = path.resolve(employeesDbDir);
        const filePath = path.resolve(employeeDbRoot, `${sanitizedId}.json`);
        const realFilePath = await fs.realpath(filePath);
        if (!isSubPath(realFilePath, employeeDbRoot)) {
            return { success: false, error: "Invalid file path resolved for employee data." };
        }
        await fs.writeFile(realFilePath, JSON.stringify(employee, null, 2), 'utf-8');

        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'HR',
            action: `Marked employee as 'Left'`,
            details: { employee_id: sanitizedId }
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
    const validYear = sanitizeYear(year);
    if (!validYear) {
        console.error(`Invalid year argument passed to getHolidays: ${year}`);
        return [];
    }
    const filePath = path.join(holidaysDataDir, `${validYear}.json`);
    // Ensure file path is inside holidaysDataDir
    const normalizedFilePath = path.resolve(filePath);
    const normalizedDir = path.resolve(holidaysDataDir);
    if (!normalizedFilePath.startsWith(normalizedDir + path.sep)) {
        console.error(`Attempted access to holidays file outside allowed directory: ${normalizedFilePath}`);
        return [];
    }
    try {
        await fs.access(normalizedFilePath);
        const fileContent = await fs.readFile(normalizedFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            await fs.mkdir(path.dirname(normalizedFilePath), { recursive: true });
            await fs.writeFile(normalizedFilePath, '[]', 'utf-8');
            return [];
        }
        console.error("Failed to read holidays for %s:", validYear, error);
        return [];
    }
}

/**
 * Saves the list of holidays to a JSON file for a specific year.
 * @param holidays The array of holiday objects to save.
 * @returns An object indicating success or failure.
 */
export async function saveHolidays(year: number, holidays: { date: string; name: string; }[]) {
    const validYear = sanitizeYear(year);
    if (!validYear) {
        return { success: false, error: 'Invalid year argument.' };
    }
    // Use path.resolve to normalize the file path and prevent directory traversal
    const filePath = path.resolve(holidaysDataDir, `${validYear}.json`);
    // Defensive: Ensure the resolved filePath is contained inside holidaysDataDir
    const absoluteHolidaysDir = path.resolve(holidaysDataDir);
    if (!filePath.startsWith(absoluteHolidaysDir + path.sep)) {
        return { success: false, error: 'Resolved file path is outside holidays directory.' };
    }
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(holidays, null, 2), 'utf-8');

        const user = await getCurrentUser();
        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'HR',
            action: 'Updated holiday list',
            details: { year: validYear, holiday_count: holidays.length }
        });

        return { success: true };
    } catch (error) {
        return await handleAndLogApiError(error, `saveHolidays for year ${validYear}`);
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
  // Validate year and month to prevent path traversal
  if (
    typeof year !== "number" ||
    typeof month !== "number" ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 1900 || year > 2100 ||
    month < 1 || month > 12
  ) {
    throw new Error("Invalid year or month");
  }
  const monthKey = `${String(month).padStart(2, '0')}${year}`;
  let filePath = path.join(attendanceDataDir, `${monthKey}.json`);
  // Ensure the filePath is strictly under attendanceDataDir to prevent traversal
  filePath = path.resolve(filePath);
  if (!filePath.startsWith(path.resolve(attendanceDataDir + path.sep))) {
    throw new Error("Unsafe attendance data file path");
  }
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
  // Validate year and month to prevent path traversal
  if (
    typeof year !== "number" ||
    typeof month !== "number" ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 1900 || year > 2100 ||
    month < 1 || month > 12
  ) {
    throw new Error("Invalid year or month");
  }
  const monthKey = `${String(month).padStart(2, '0' )}${year}`;
  let filePath = path.join(attendanceDataDir, `${monthKey}.json`);
  // Ensure the filePath is strictly under attendanceDataDir to prevent traversal
  filePath = path.resolve(filePath);
  if (!filePath.startsWith(path.resolve(attendanceDataDir + path.sep))) {
    throw new Error("Unsafe attendance data file path");
  }
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
  // Sanitize year and month input
  const safeYear = sanitizeYear(year);
  const safeMonth = sanitizeMonth(month);
  if (safeYear === null || safeMonth === null) {
    // Invalid year or month, abort save
    return await handleAndLogApiError(
        new Error("Invalid year or month for payroll save"), 
        `savePayrollData for invalid year (${year}) or month (${month})`
    );
  }
  const monthKey = `${String(safeMonth).padStart(2, '0')}${safeYear}`;
  const rawEmployeeId = payrollRecord.employee_id;
  const employeeId = sanitizeEmployeeId(rawEmployeeId);
  if (!employeeId) {
    // Invalid employee ID, abort save
    return await handleAndLogApiError(
        new Error("Invalid employee ID for payroll save"), 
        `savePayrollData for invalid employee ID (${rawEmployeeId}) for ${monthKey}`
    );
  }
  const monthDir = path.join(payrollDataDir, monthKey);
  // Canonicalize the directory path (resolves symlinks)
  let resolvedMonthDir: string;
  try {
    resolvedMonthDir = await fs.realpath(monthDir);
  } catch {
    // Directory may not exist yet; use path.resolve fallback
    resolvedMonthDir = path.resolve(monthDir);
  }
  // Ensure the canonical path is a subdirectory of payrollDataDir
  let canonicalPayrollDataDir: string;
  try {
    canonicalPayrollDataDir = await fs.realpath(payrollDataDir);
  } catch {
    canonicalPayrollDataDir = path.resolve(payrollDataDir);
  }
  // Validate: ensure resolvedMonthDir is a subdirectory of canonicalPayrollDataDir
  if (!isSubPath(resolvedMonthDir, canonicalPayrollDataDir)) {
    // Abort and log error if path is outside allowed root
    return await handleAndLogApiError(
        new Error("Invalid month directory for payroll save"),
        `savePayrollData tried to save payroll to unauthorized directory: ${resolvedMonthDir}`
    );
  }
  if (!isSubPath(resolvedMonthDir, canonicalPayrollDataDir)) {
    // Attempted path traversal or out-of-bounds access on directory
    return await handleAndLogApiError(
      new Error("Payroll month directory points outside payrollDataDir"),
      `savePayrollData invalid month directory (${resolvedMonthDir}) for ${employeeId} for ${monthKey}`
    );
  }
  const filePath = path.join(resolvedMonthDir, `${employeeId}.json`);
  // Canonicalize the file path (resolve symlinks), fallback if file does not exist
  let resolvedFilePath: string;
  try {
    resolvedFilePath = await fs.realpath(filePath);
  } catch {
    resolvedFilePath = path.resolve(filePath);
  }
  if (!isSubPath(resolvedFilePath, canonicalPayrollDataDir)) {
    // Attempted path traversal or out-of-bounds access
    return await handleAndLogApiError(
      new Error("Payroll file path points outside payrollDataDir"),
      `savePayrollData invalid file path (${resolvedFilePath}) for ${employeeId} for ${monthKey}`
    );
  }

  try {
    const user = await getCurrentUser();
    // Authorization: Only allow writing payroll data if the user is an admin or matches the employeeId
    if (!user || (user.role !== 'Admin' && user.user_id !== employeeId)) {
      return await handleAndLogApiError(
        new Error("Unauthorized payroll modification attempt"),
        `savePayrollData: user ${user?.user_id || 'UNKNOWN'} not authorized to write payroll for ${employeeId}`
      );
    }
    await ensureDirectoryExists(monthDir, payrollDataDir);
    
    await fs.writeFile(resolvedFilePath, JSON.stringify(payrollRecord, null, 2), 'utf-8');

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
  const safeEmployeeId = sanitizeEmployeeId(employeeId);
  if (!safeEmployeeId) {
    // Invalid employee ID
    return null;
  }
  const filePath = path.join(payrollDataDir, monthKey, `${safeEmployeeId}.json`);
  // Normalize and check that the path stays within payrollDataDir
  const resolvedFilePath = path.resolve(filePath);
  if (!resolvedFilePath.startsWith(payrollDataDir + path.sep)) {
    // Attempted path traversal or out-of-bounds access
    return null;
  }
  try {
    await fs.access(resolvedFilePath);
    const fileContent = await fs.readFile(resolvedFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // File not found or other error
    return null;
  }
}
