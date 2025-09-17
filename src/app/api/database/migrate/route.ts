import {
  migrateAttendanceData,
  migrateEmployees,
  migrateFinancialRecords,
  migratePayrollData,
  migrateSalesData,
  migrateVehicles,
} from "@/lib/migration-scripts";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const results = [];
    let totalMigrated = 0;
    let totalErrors = 0;
    let tablesProcessed = 0;

    // Migrate Vehicles
    console.log("Starting vehicle migration...");
    try {
      const vehicleResult = await migrateVehicles();
      results.push({
        success: vehicleResult.success,
        table: "vehicles",
        migrated: vehicleResult.migrated || 0,
        errors: vehicleResult.errors || [],
      });
      totalMigrated += vehicleResult.migrated || 0;
      totalErrors += vehicleResult.errors?.length || 0;
      tablesProcessed++;
    } catch (error) {
      results.push({
        success: false,
        table: "vehicles",
        migrated: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
      totalErrors++;
      tablesProcessed++;
    }

    // Migrate Employees
    console.log("Starting employee migration...");
    try {
      const employeeResult = await migrateEmployees();
      results.push({
        success: employeeResult.success,
        table: "employees",
        migrated: employeeResult.migrated || 0,
        errors: employeeResult.errors || [],
      });
      totalMigrated += employeeResult.migrated || 0;
      totalErrors += employeeResult.errors?.length || 0;
      tablesProcessed++;
    } catch (error) {
      results.push({
        success: false,
        table: "employees",
        migrated: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
      totalErrors++;
      tablesProcessed++;
    }

    // Migrate Financial Records
    console.log("Starting financial records migration...");
    try {
      const financeResult = await migrateFinancialRecords();
      results.push({
        success: financeResult.success,
        table: "financial_records",
        migrated: financeResult.migrated || 0,
        errors: financeResult.errors || [],
      });
      totalMigrated += financeResult.migrated || 0;
      totalErrors += financeResult.errors?.length || 0;
      tablesProcessed++;
    } catch (error) {
      results.push({
        success: false,
        table: "financial_records",
        migrated: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
      totalErrors++;
      tablesProcessed++;
    }

    // Migrate Payroll Data
    console.log("Starting payroll migration...");
    try {
      const payrollResult = await migratePayrollData();
      results.push({
        success: payrollResult.success,
        table: "payroll_records",
        migrated: payrollResult.migrated || 0,
        errors: payrollResult.errors || [],
      });
      totalMigrated += payrollResult.migrated || 0;
      totalErrors += payrollResult.errors?.length || 0;
      tablesProcessed++;
    } catch (error) {
      results.push({
        success: false,
        table: "payroll_records",
        migrated: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
      totalErrors++;
      tablesProcessed++;
    }

    // Migrate Attendance Data
    console.log("Starting attendance migration...");
    try {
      const attendanceResult = await migrateAttendanceData();
      results.push({
        success: attendanceResult.success,
        table: "attendance_records",
        migrated: attendanceResult.migrated || 0,
        errors: attendanceResult.errors || [],
      });
      totalMigrated += attendanceResult.migrated || 0;
      totalErrors += attendanceResult.errors?.length || 0;
      tablesProcessed++;
    } catch (error) {
      results.push({
        success: false,
        table: "attendance_records",
        migrated: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
      totalErrors++;
      tablesProcessed++;
    }

    // Migrate Sales Data
    console.log("Starting sales migration...");
    try {
      const salesResult = await migrateSalesData();
      results.push({
        success: salesResult.success,
        table: "sales_records",
        migrated: salesResult.migrated || 0,
        errors: salesResult.errors || [],
      });
      totalMigrated += salesResult.migrated || 0;
      totalErrors += salesResult.errors?.length || 0;
      tablesProcessed++;
    } catch (error) {
      results.push({
        success: false,
        table: "sales_records",
        migrated: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
      totalErrors++;
      tablesProcessed++;
    }

    return NextResponse.json({
      success: totalErrors === 0,
      results,
      summary: {
        totalMigrated,
        totalErrors,
        tablesProcessed,
      },
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Migration process failed",
        results: [],
      },
      { status: 500 }
    );
  }
}
