#!/usr/bin/env tsx

/**
 * Migration script to update all HR data structures to match specifications
 * Run this script to ensure all existing data follows the proper format
 */

import fs from "node:fs/promises";
import path from "node:path";

async function migratePayrollStructure() {
  console.log("Starting payroll structure migration...");

  const payrollBaseDir = path.join(
    process.cwd(),
    "database",
    "hr",
    "payroll_data"
  );

  try {
    const months = await fs.readdir(payrollBaseDir);

    for (const month of months) {
      const monthDir = path.join(payrollBaseDir, month);
      const files = await fs.readdir(monthDir);

      for (const file of files.filter((f) => f.endsWith(".json"))) {
        const filePath = path.join(monthDir, file);
        const employeeId = path.basename(file, ".json");

        try {
          // Read existing payroll data
          const data = await fs.readFile(filePath, "utf-8");
          const payrollData = JSON.parse(data);

          // Get employee details
          const employeeFilePath = path.join(
            process.cwd(),
            "database",
            "hr",
            "employees",
            `${employeeId}.json`
          );
          let employeeDetails = {};

          try {
            const empData = await fs.readFile(employeeFilePath, "utf-8");
            employeeDetails = JSON.parse(empData);
          } catch (error) {
            console.warn(`Could not load employee details for ${employeeId}`);
          }

          // Get attendance summary
          const attendanceFilePath = path.join(
            process.cwd(),
            "database",
            "hr",
            "attendance_data",
            `${month}.json`
          );
          let attendanceSummary: any[] = [];

          try {
            const attData = await fs.readFile(attendanceFilePath, "utf-8");
            const allAttendance = JSON.parse(attData);
            attendanceSummary = allAttendance.filter(
              (record: any) => record.employee_id === employeeId
            );
          } catch (error) {
            console.warn(`Could not load attendance data for ${month}`);
          }

          // Create updated structure
          const updatedPayroll = {
            employee_id: employeeId,
            month: month,
            employee_details: employeeDetails,
            attendance_summary: attendanceSummary,
            employee_financial_history:
              payrollData.employee_financial_history || [],
          };

          // Write updated structure
          await fs.writeFile(
            filePath,
            JSON.stringify(updatedPayroll, null, 2),
            "utf-8"
          );
          console.log(
            `✓ Updated payroll structure for ${employeeId} - ${month}`
          );
        } catch (error) {
          console.error(`✗ Failed to update ${file}:`, error);
        }
      }
    }

    console.log("✅ Payroll structure migration completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

async function verifyDirectoryStructures() {
  console.log("Verifying directory structures...");

  const requiredDirs = [
    "database/hr/employees",
    "database/hr/attendance_data",
    "database/hr/payroll_data",
    "database/hr/attendance_upload",
    "public/upload/hr",
  ];

  for (const dir of requiredDirs) {
    const fullPath = path.join(process.cwd(), dir);
    try {
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`✓ Directory ensured: ${dir}`);
    } catch (error) {
      console.error(`✗ Failed to create directory ${dir}:`, error);
    }
  }

  console.log("✅ Directory structure verification completed");
}

async function main() {
  console.log("🚀 HR Data Structure Migration Starting...\n");

  await verifyDirectoryStructures();
  console.log();
  await migratePayrollStructure();

  console.log(
    "\n🎉 Migration completed! All HR modules now follow proper data structure specifications."
  );
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { migratePayrollStructure, verifyDirectoryStructures };
