"use server";

import { getCurrentUser } from "@/modules/auth/services/supabase-auth-actions";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * HR Data Structure Manager
 * Ensures all HR modules follow the proper data structure specifications
 */

// Employee Module: database/hr/employee/{employee_id.json}
export async function saveEmployeeData(employeeId: string, employeeData: any) {
  const employeesDir = path.join(process.cwd(), "database", "hr", "employees");
  await fs.mkdir(employeesDir, { recursive: true });

  const user = await getCurrentUser();

  const standardizedEmployee = {
    employee_id: employeeId,
    personal_info: {
      name: employeeData.personal_info?.name || "",
      dob: employeeData.personal_info?.dob || "",
      nationality: employeeData.personal_info?.nationality || "",
      gender: employeeData.personal_info?.gender || "",
      contact: employeeData.personal_info?.contact || "",
      address: employeeData.personal_info?.address || "",
    },
    job_details: {
      department: employeeData.job_details?.department || "",
      position: employeeData.job_details?.position || "",
      joining_date: employeeData.job_details?.joining_date || "",
      contract_expiry_date:
        employeeData.job_details?.contract_expiry_date || "",
      salary:
        typeof employeeData.job_details?.salary === "number"
          ? employeeData.job_details.salary
          : parseFloat(employeeData.job_details?.salary || "0"),
      status: employeeData.job_details?.status || "Active",
      grade: employeeData.job_details?.grade || 1,
    },
    qualification: {
      education: employeeData.qualification?.education || "",
      skills: employeeData.qualification?.skills || "",
    },
    documents: {
      photo: employeeData.documents?.photo || "",
      id_proof: employeeData.documents?.id_proof || "",
      address_proof: employeeData.documents?.address_proof || "",
      education_cert: employeeData.documents?.education_cert || "",
      professional_cert: employeeData.documents?.professional_cert || "",
    },
    emergency_contact: {
      name: employeeData.emergency_contact?.name || "",
      relation: employeeData.emergency_contact?.relation || "",
      phone: employeeData.emergency_contact?.phone || "",
    },
    experience: {
      previous_jobs: employeeData.experience?.previous_jobs || "",
      years: employeeData.experience?.years || 0,
    },
    created_at: employeeData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: user?.user_id || "system",
    updated_by: user?.user_id || "system",
  };

  const filePath = path.join(employeesDir, `${employeeId}.json`);
  await fs.writeFile(
    filePath,
    JSON.stringify(standardizedEmployee, null, 2),
    "utf-8"
  );

  return { success: true, filePath, employee_id: employeeId };
}

// Attendance Module: database/hr/attendance_data/{mmyyyy.json}
export async function saveAttendanceData(
  month: string,
  attendanceRecords: any[]
) {
  const attendanceDir = path.join(
    process.cwd(),
    "database",
    "hr",
    "attendance_data"
  );
  await fs.mkdir(attendanceDir, { recursive: true });

  const standardizedAttendance = attendanceRecords.map((record) => ({
    employee_id: record.employee_id,
    name: record.name || "",
    date: record.date,
    status: record.status, // Present, Late, Absent, Leave
    in_time: record.in_time || "",
    out_time: record.out_time || "",
    remarks: record.remarks || "",
  }));

  const filePath = path.join(attendanceDir, `${month}.json`);
  await fs.writeFile(
    filePath,
    JSON.stringify(standardizedAttendance, null, 2),
    "utf-8"
  );

  return { success: true, filePath, month };
}

// Payroll Module: database/hr/payroll_data/mmyyyy/employee_id.json
export async function savePayrollData(
  month: string,
  employeeId: string,
  payrollData: any
) {
  const payrollDir = path.join(
    process.cwd(),
    "database",
    "hr",
    "payroll_data",
    month
  );
  await fs.mkdir(payrollDir, { recursive: true });

  // Get employee details from employee module
  const employeeFilePath = path.join(
    process.cwd(),
    "database",
    "hr",
    "employees",
    `${employeeId}.json`
  );
  let employeeDetails = {};

  try {
    const employeeData = await fs.readFile(employeeFilePath, "utf-8");
    employeeDetails = JSON.parse(employeeData);
  } catch (error) {
    console.warn(`Could not load employee details for ${employeeId}`);
  }

  // Get attendance summary from attendance module
  const attendanceFilePath = path.join(
    process.cwd(),
    "database",
    "hr",
    "attendance_data",
    `${month}.json`
  );
  let attendanceSummary: any[] = [];

  try {
    const attendanceData = await fs.readFile(attendanceFilePath, "utf-8");
    const allAttendance = JSON.parse(attendanceData);
    attendanceSummary = allAttendance.filter(
      (record: any) => record.employee_id === employeeId
    );
  } catch (error) {
    console.warn(`Could not load attendance data for ${month}`);
  }

  const standardizedPayroll = {
    employee_id: employeeId,
    month: month,
    employee_details: employeeDetails,
    attendance_summary: attendanceSummary,
    employee_financial_history: payrollData.employee_financial_history || [],
  };

  const filePath = path.join(payrollDir, `${employeeId}.json`);
  await fs.writeFile(
    filePath,
    JSON.stringify(standardizedPayroll, null, 2),
    "utf-8"
  );

  return { success: true, filePath, employee_id: employeeId, month };
}

// Upload handlers for documents
export async function saveEmployeeDocument(
  employeeId: string,
  subFolder: string,
  fileName: string,
  fileBuffer: Buffer
) {
  // Upload file Location: public/upload/hr/employee_id/{sub_folder}
  const uploadDir = path.join(
    process.cwd(),
    "public",
    "upload",
    "hr",
    employeeId,
    subFolder
  );
  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, fileBuffer);

  return {
    success: true,
    filePath: `/upload/hr/${employeeId}/${subFolder}/${fileName}`,
  };
}

// Upload attendance sheet
export async function saveAttendanceSheet(
  month: string,
  fileName: string,
  fileBuffer: Buffer
) {
  // database/hr/attendance_upload/{attendance_mmm_yyyy.csv}
  const uploadDir = path.join(
    process.cwd(),
    "database",
    "hr",
    "attendance_upload"
  );
  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, fileBuffer);

  return { success: true, filePath };
}

// Data retrieval functions
export async function getEmployeeData(employeeId: string) {
  const filePath = path.join(
    process.cwd(),
    "database",
    "hr",
    "employees",
    `${employeeId}.json`
  );
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export async function getAttendanceData(month: string) {
  const filePath = path.join(
    process.cwd(),
    "database",
    "hr",
    "attendance_data",
    `${month}.json`
  );
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function getPayrollData(month: string, employeeId: string) {
  const filePath = path.join(
    process.cwd(),
    "database",
    "hr",
    "payroll_data",
    month,
    `${employeeId}.json`
  );
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// Get all employees for dropdown lists
export async function getAllEmployees() {
  const employeesDir = path.join(process.cwd(), "database", "hr", "employees");
  try {
    const files = await fs.readdir(employeesDir);
    const employees = [];

    for (const file of files.filter((f) => f.endsWith(".json"))) {
      try {
        const data = await fs.readFile(path.join(employeesDir, file), "utf-8");
        employees.push(JSON.parse(data));
      } catch (error) {
        console.warn(`Could not read employee file: ${file}`);
      }
    }

    return employees;
  } catch (error) {
    return [];
  }
}

// Get payroll history for dropdown (Record history show Tab)
export async function getPayrollHistory(employeeId: string) {
  const payrollBaseDir = path.join(
    process.cwd(),
    "database",
    "hr",
    "payroll_data"
  );
  const history: any[] = [];

  try {
    const months = await fs.readdir(payrollBaseDir);

    for (const month of months) {
      try {
        const filePath = path.join(payrollBaseDir, month, `${employeeId}.json`);
        const data = await fs.readFile(filePath, "utf-8");
        history.push(JSON.parse(data));
      } catch (error) {
        // File doesn't exist for this month, continue
      }
    }
  } catch (error) {
    console.warn("Could not read payroll history");
  }

  return history.sort((a, b) => b.month.localeCompare(a.month));
}

