"use server";

import { createSupabaseAdminClient } from "@/lib/supabase";
import fs from "node:fs/promises";
import path from "node:path";

const adminClient = createSupabaseAdminClient();

interface MigrationResult {
  success: boolean;
  table: string;
  migrated: number;
  errors: string[];
  details?: any;
}

/**
 * Complete data migration from JSON files to Supabase
 */
export async function runCompleteMigration(): Promise<{
  success: boolean;
  results: MigrationResult[];
  summary: {
    totalMigrated: number;
    totalErrors: number;
    tablesProcessed: number;
  };
}> {
  console.log("🚀 Starting complete migration to Supabase...");

  const migrationResults: MigrationResult[] = [];

  try {
    // 1. Migrate Vehicles
    console.log("📦 Migrating vehicles...");
    const vehiclesResult = await migrateVehicles();
    migrationResults.push(vehiclesResult);

    // 2. Migrate Employees
    console.log("👥 Migrating employees...");
    const employeesResult = await migrateEmployees();
    migrationResults.push(employeesResult);

    // 3. Migrate Financial Records
    console.log("💰 Migrating financial records...");
    const financialResult = await migrateFinancialRecords();
    migrationResults.push(financialResult);

    // 4. Migrate HR Data
    console.log("🏢 Migrating HR data...");
    const hrResult = await migrateHRData();
    migrationResults.push(hrResult);

    // 5. Migrate User Profiles
    console.log("👤 Migrating user profiles...");
    const profilesResult = await migrateUserProfiles();
    migrationResults.push(profilesResult);

    // 6. Migrate Sales Data
    console.log("💼 Migrating sales data...");
    const salesResult = await migrateSalesData();
    migrationResults.push(salesResult);

    // Calculate summary
    const summary = {
      totalMigrated: migrationResults.reduce(
        (sum, result) => sum + result.migrated,
        0
      ),
      totalErrors: migrationResults.reduce(
        (sum, result) => sum + result.errors.length,
        0
      ),
      tablesProcessed: migrationResults.length,
    };

    console.log("✅ Migration completed!", summary);

    return {
      success: summary.totalErrors === 0,
      results: migrationResults,
      summary,
    };
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return {
      success: false,
      results: migrationResults,
      summary: {
        totalMigrated: 0,
        totalErrors: 1,
        tablesProcessed: 0,
      },
    };
  }
}

/**
 * Migrate vehicle data from JSON files to Supabase
 */
async function migrateVehicles(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    table: "vehicles",
    migrated: 0,
    errors: [],
  };

  try {
    const vehiclesDir = path.join(process.cwd(), "database", "purchase");

    // Check if directory exists
    try {
      await fs.access(vehiclesDir);
    } catch {
      result.errors.push("Vehicles directory not found");
      return result;
    }

    const files = await fs.readdir(vehiclesDir);
    const jsonFiles = files.filter(
      (file) => file.endsWith(".json") && file !== "bonus.json"
    );

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(vehiclesDir, file);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const vehicleData = JSON.parse(fileContent);

        // Transform data to match database schema
        const vehicleRecord = {
          id: path.parse(file).name,
          license_plate:
            vehicleData.license_plate || vehicleData.licensePlate || "UNKNOWN",
          vehicle: vehicleData.vehicle || "Unknown Vehicle",
          date: vehicleData.date || new Date().toISOString().split("T")[0],
          seller: vehicleData.seller || "",
          purchase_price: parseFloat(
            vehicleData.purchase_price || vehicleData.purchasePrice || "0"
          ),
          final_price: parseFloat(
            vehicleData.final_price || vehicleData.finalPrice || "0"
          ),
          payment_type:
            vehicleData.payment_type || vehicleData.paymentType || "Cash",
          status: vehicleData.status || "Processing",
          full_data: vehicleData,
          sale_details: vehicleData.sale_details || vehicleData.saleDetails,
          maintenance_history:
            vehicleData.maintenance_history ||
            vehicleData.maintenanceHistory ||
            [],
          financial_history:
            vehicleData.financial_history || vehicleData.financialHistory || [],
          licence_history:
            vehicleData.licence_history || vehicleData.licenceHistory || [],
          bonus_history:
            vehicleData.bonus_history || vehicleData.bonusHistory || [],
          created_by: null, // Will be updated when we have proper auth
          version: 1,
        };

        const { error } = await adminClient
          .from("vehicles")
          .upsert(vehicleRecord);

        if (error) {
          result.errors.push(`Vehicle ${file}: ${error.message}`);
        } else {
          result.migrated++;
        }
      } catch (fileError) {
        result.errors.push(
          `Vehicle ${file}: ${
            fileError instanceof Error ? fileError.message : "Unknown error"
          }`
        );
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(
      `Vehicles migration: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return result;
  }
}

/**
 * Migrate employee data from JSON files to Supabase
 */
async function migrateEmployees(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    table: "employees",
    migrated: 0,
    errors: [],
  };

  try {
    const employeesDir = path.join(
      process.cwd(),
      "database",
      "hr",
      "employees"
    );

    try {
      await fs.access(employeesDir);
    } catch {
      result.errors.push("Employees directory not found");
      return result;
    }

    const files = await fs.readdir(employeesDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(employeesDir, file);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const employeeData = JSON.parse(fileContent);

        const employeeRecord = {
          employee_id: path.parse(file).name,
          personal_info:
            employeeData.personal_info ||
            employeeData.personalInfo ||
            employeeData,
          documents: employeeData.documents || {},
          employment_info:
            employeeData.employment_info || employeeData.employmentInfo || {},
          created_by: null,
          version: 1,
        };

        const { error } = await adminClient
          .from("employees")
          .upsert(employeeRecord);

        if (error) {
          result.errors.push(`Employee ${file}: ${error.message}`);
        } else {
          result.migrated++;
        }
      } catch (fileError) {
        result.errors.push(
          `Employee ${file}: ${
            fileError instanceof Error ? fileError.message : "Unknown error"
          }`
        );
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(
      `Employees migration: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return result;
  }
}

/**
 * Migrate financial records
 */
async function migrateFinancialRecords(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    table: "financial_records",
    migrated: 0,
    errors: [],
  };

  try {
    const financeDir = path.join(process.cwd(), "database", "finance");

    // Migrate bonuses
    await migrateBonuses(financeDir, result);

    // Migrate employee adjustments
    await migrateEmployeeAdjustments(financeDir, result);

    // Migrate office expenses
    await migrateOfficeExpenses(financeDir, result);

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(
      `Financial records migration: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return result;
  }
}

async function migrateBonuses(financeDir: string, result: MigrationResult) {
  try {
    const bonusesPath = path.join(financeDir, "bonuses.json");
    const fileContent = await fs.readFile(bonusesPath, "utf-8");
    const bonuses = JSON.parse(fileContent);

    if (Array.isArray(bonuses)) {
      for (const bonus of bonuses) {
        const record = {
          type: "Bonus",
          category: "Employee Bonus",
          amount: parseFloat(bonus.amount || "0"),
          description: `Bonus for ${bonus.employee_name || "Unknown"}`,
          date: bonus.date || new Date().toISOString().split("T")[0],
          reference_id: bonus.employee_id,
          reference_type: "employee",
          status: "Active",
          metadata: bonus,
        };

        const { error } = await adminClient
          .from("financial_records")
          .insert(record);

        if (error) {
          result.errors.push(`Bonus record: ${error.message}`);
        } else {
          result.migrated++;
        }
      }
    }
  } catch (error) {
    // File might not exist, which is okay
  }
}

async function migrateEmployeeAdjustments(
  financeDir: string,
  result: MigrationResult
) {
  try {
    const adjustmentsPath = path.join(financeDir, "employee_adjustments.json");
    const fileContent = await fs.readFile(adjustmentsPath, "utf-8");
    const adjustments = JSON.parse(fileContent);

    if (Array.isArray(adjustments)) {
      for (const adjustment of adjustments) {
        const record = {
          type: "Adjustment",
          category: "Employee Adjustment",
          amount: parseFloat(adjustment.amount || "0"),
          description: adjustment.description || "Employee adjustment",
          date: adjustment.date || new Date().toISOString().split("T")[0],
          reference_id: adjustment.employee_id,
          reference_type: "employee",
          status: "Active",
          metadata: adjustment,
        };

        const { error } = await adminClient
          .from("financial_records")
          .insert(record);

        if (error) {
          result.errors.push(`Adjustment record: ${error.message}`);
        } else {
          result.migrated++;
        }
      }
    }
  } catch (error) {
    // File might not exist, which is okay
  }
}

async function migrateOfficeExpenses(
  financeDir: string,
  result: MigrationResult
) {
  try {
    const expensesDir = path.join(financeDir, "office_expenses");
    const files = await fs.readdir(expensesDir);

    for (const file of files.filter((f) => f.endsWith(".json"))) {
      const filePath = path.join(expensesDir, file);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const expenses = JSON.parse(fileContent);

      if (Array.isArray(expenses)) {
        for (const expense of expenses) {
          const record = {
            category: expense.category || "General",
            description: expense.description || "Office expense",
            amount: parseFloat(expense.amount || "0"),
            date: expense.date || new Date().toISOString().split("T")[0],
            receipt_url: expense.receipt_url,
            status: expense.status || "Approved",
            expense_data: expense,
          };

          const { error } = await adminClient
            .from("office_expenses")
            .insert(record);

          if (error) {
            result.errors.push(`Office expense: ${error.message}`);
          } else {
            result.migrated++;
          }
        }
      }
    }
  } catch (error) {
    // Directory might not exist
  }
}

/**
 * Migrate HR data (attendance, payroll, etc.)
 */
async function migrateHRData(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    table: "hr_data",
    migrated: 0,
    errors: [],
  };

  try {
    const hrDir = path.join(process.cwd(), "database", "hr");

    // Migrate holidays
    await migrateHolidays(hrDir, result);

    // Note: Attendance and payroll data might need more complex migration
    // depending on the current file structure

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(
      `HR data migration: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return result;
  }
}

async function migrateHolidays(hrDir: string, result: MigrationResult) {
  try {
    const holidaysDir = path.join(hrDir, "holidays");
    const files = await fs.readdir(holidaysDir);

    for (const file of files.filter((f) => f.endsWith(".json"))) {
      const filePath = path.join(holidaysDir, file);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const holidays = JSON.parse(fileContent);

      if (Array.isArray(holidays)) {
        for (const holiday of holidays) {
          const record = {
            name: holiday.name || "Holiday",
            date: holiday.date,
            type: holiday.type || "Public",
            description: holiday.description,
            is_active: true,
          };

          const { error } = await adminClient
            .from("holidays")
            .upsert(record, { onConflict: "date,type" });

          if (error) {
            result.errors.push(`Holiday: ${error.message}`);
          } else {
            result.migrated++;
          }
        }
      }
    }
  } catch (error) {
    // Directory might not exist
  }
}

/**
 * Migrate user profiles from admin data
 */
async function migrateUserProfiles(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    table: "profiles",
    migrated: 0,
    errors: [],
  };

  try {
    const usersPath = path.join(
      process.cwd(),
      "database",
      "admin",
      "users.json"
    );

    try {
      const fileContent = await fs.readFile(usersPath, "utf-8");
      const users = JSON.parse(fileContent);

      if (Array.isArray(users)) {
        for (const user of users) {
          // For now, we'll create profiles without actual auth users
          // This will be connected later when proper auth is implemented
          const record = {
            user_id: user.user_id || "00000000-0000-0000-0000-000000000000",
            name: user.name,
            email: user.email,
            role: user.role || "Staff",
            modules: user.modules || [],
            status: user.status || "Active",
            employee_id: user.employee_id,
            department: user.department,
          };

          // This will fail initially since we don't have auth users yet
          // But we'll track the attempt
          result.errors.push(
            `Profile migration requires proper auth setup for ${user.email}`
          );
        }
      }
    } catch (error) {
      result.errors.push("Users file not found or invalid");
    }

    result.success = false; // Will be true once auth is properly set up
    return result;
  } catch (error) {
    result.errors.push(
      `Profiles migration: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return result;
  }
}

/**
 * Migrate sales data if it exists
 */
async function migrateSalesData(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    table: "sales_records",
    migrated: 0,
    errors: [],
  };

  // For now, sales data will be extracted from vehicle sale_details
  // This is a placeholder for future sales data migration

  result.success = true;
  return result;
}

/**
 * Validate migrated data
 */
export async function validateMigration(): Promise<{
  success: boolean;
  validation: {
    vehicles: { count: number; sample?: any };
    employees: { count: number; sample?: any };
    financial_records: { count: number; sample?: any };
    office_expenses: { count: number; sample?: any };
    holidays: { count: number; sample?: any };
  };
}> {
  try {
    const validation = {
      vehicles: { count: 0 },
      employees: { count: 0 },
      financial_records: { count: 0 },
      office_expenses: { count: 0 },
      holidays: { count: 0 },
    };

    // Count vehicles
    const { count: vehicleCount } = await adminClient
      .from("vehicles")
      .select("*", { count: "exact", head: true });
    validation.vehicles.count = vehicleCount || 0;

    // Get sample vehicle
    if (vehicleCount && vehicleCount > 0) {
      const { data: vehicleSample } = await adminClient
        .from("vehicles")
        .select("*")
        .limit(1);
      validation.vehicles.sample = vehicleSample?.[0];
    }

    // Count employees
    const { count: employeeCount } = await adminClient
      .from("employees")
      .select("*", { count: "exact", head: true });
    validation.employees.count = employeeCount || 0;

    // Count financial records
    const { count: financialCount } = await adminClient
      .from("financial_records")
      .select("*", { count: "exact", head: true });
    validation.financial_records.count = financialCount || 0;

    // Count office expenses
    const { count: expenseCount } = await adminClient
      .from("office_expenses")
      .select("*", { count: "exact", head: true });
    validation.office_expenses.count = expenseCount || 0;

    // Count holidays
    const { count: holidayCount } = await adminClient
      .from("holidays")
      .select("*", { count: "exact", head: true });
    validation.holidays.count = holidayCount || 0;

    return {
      success: true,
      validation,
    };
  } catch (error) {
    console.error("Validation failed:", error);
    return {
      success: false,
      validation: {
        vehicles: { count: 0 },
        employees: { count: 0 },
        financial_records: { count: 0 },
        office_expenses: { count: 0 },
        holidays: { count: 0 },
      },
    };
  }
}
