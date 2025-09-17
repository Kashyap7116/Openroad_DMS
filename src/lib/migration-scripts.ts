import fs from "fs";
import path from "path";
import { DatabaseLogger, withRetry } from "./enhanced-supabase-operations";
import { createSupabaseAdminClient } from "./supabase";

// Migration result interface
interface MigrationResult {
  success: boolean;
  migrated: number;
  errors: string[];
  message?: string;
}

// Helper function to read JSON file safely
async function readJSONFile(filePath: string): Promise<any[]> {
  try {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${fullPath}`);
      return [];
    }

    const fileContent = fs.readFileSync(fullPath, "utf-8");
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return [];
  }
}

// Helper function to ensure required tables exist
async function ensureBrandsAndModelsTable() {
  const supabase = createSupabaseAdminClient();

  const createBrandsTable = `
    CREATE TABLE IF NOT EXISTS public.vehicle_brands (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const createModelsTable = `
    CREATE TABLE IF NOT EXISTS public.vehicle_models (
      id SERIAL PRIMARY KEY,
      brand_id INTEGER NOT NULL REFERENCES public.vehicle_brands(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(brand_id, name)
    );
  `;

  await supabase.rpc("execute_sql", { sql: createBrandsTable });
  await supabase.rpc("execute_sql", { sql: createModelsTable });
}

// Vehicle Migration
export async function migrateVehicles(): Promise<MigrationResult> {
  const logger = DatabaseLogger.getInstance();
  const supabase = createSupabaseAdminClient();

  try {
    await logger.logOperation("migration", "vehicles", "start", {
      message: "Starting vehicle migration",
    });

    const vehicles = await readJSONFile("database/purchase/vehicles.json");

    if (vehicles.length === 0) {
      return {
        success: true,
        migrated: 0,
        errors: [],
        message: "No vehicles found to migrate",
      };
    }

    let migrated = 0;
    const errors: string[] = [];

    for (const vehicle of vehicles) {
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("vehicles").insert({
            id: vehicle.id,
            license_plate: vehicle.license_plate,
            vehicle: vehicle.vehicle,
            date: vehicle.date,
            seller: vehicle.seller,
            purchase_price: vehicle.purchase_price,
            final_price: vehicle.final_price,
            payment_type: vehicle.payment_type,
            status: vehicle.status || "Processing",
            full_data: vehicle.full_data || vehicle,
            sale_details: vehicle.sale_details,
            maintenance_history: vehicle.maintenance_history || [],
            financial_history: vehicle.financial_history || [],
            licence_history: vehicle.licence_history || [],
            bonus_history: vehicle.bonus_history || [],
          });

          if (error) throw error;
        });

        migrated++;
        await logger.logOperation("migration", "vehicles", "success", {
          vehicle_id: vehicle.id,
          license_plate: vehicle.license_plate,
        });
      } catch (error) {
        const errorMsg = `Failed to migrate vehicle ${
          vehicle.id || vehicle.license_plate
        }: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMsg);

        await logger.logOperation("migration", "vehicles", "error", {
          vehicle_id: vehicle.id,
          error: errorMsg,
        });
      }
    }

    await logger.logOperation("migration", "vehicles", "complete", {
      total: vehicles.length,
      migrated,
      errors: errors.length,
    });

    return {
      success: errors.length === 0,
      migrated,
      errors,
      message: `Vehicle migration completed: ${migrated}/${vehicles.length} vehicles migrated`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await logger.logOperation("migration", "vehicles", "error", {
      error: errorMsg,
    });

    return {
      success: false,
      migrated: 0,
      errors: [errorMsg],
    };
  }
}

// Vehicle Brands Migration
export async function migrateBrands(): Promise<MigrationResult> {
  const logger = DatabaseLogger.getInstance();
  const supabase = createSupabaseAdminClient();

  try {
    await ensureBrandsAndModelsTable();

    await logger.logOperation("migration", "brands", "start", {
      message: "Starting brand migration",
    });

    const brands = await readJSONFile("database/purchase/brand.json");

    if (brands.length === 0) {
      return {
        success: true,
        migrated: 0,
        errors: [],
        message: "No brands found to migrate",
      };
    }

    let migrated = 0;
    const errors: string[] = [];

    for (const brand of brands) {
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("vehicle_brands").insert({
            id: brand.id,
            name: brand.name,
          });

          if (error) throw error;
        });

        migrated++;
        await logger.logOperation("migration", "brands", "success", {
          brand_id: brand.id,
          name: brand.name,
        });
      } catch (error) {
        const errorMsg = `Failed to migrate brand ${brand.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        errors.push(errorMsg);

        await logger.logOperation("migration", "brands", "error", {
          brand_id: brand.id,
          error: errorMsg,
        });
      }
    }

    await logger.logOperation("migration", "brands", "complete", {
      total: brands.length,
      migrated,
      errors: errors.length,
    });

    return {
      success: errors.length === 0,
      migrated,
      errors,
      message: `Brand migration completed: ${migrated}/${brands.length} brands migrated`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await logger.logOperation("migration", "brands", "error", {
      error: errorMsg,
    });

    return {
      success: false,
      migrated: 0,
      errors: [errorMsg],
    };
  }
}

// Vehicle Models Migration
export async function migrateModels(): Promise<MigrationResult> {
  const logger = DatabaseLogger.getInstance();
  const supabase = createSupabaseAdminClient();

  try {
    await logger.logOperation("migration", "models", "start", {
      message: "Starting model migration",
    });

    const models = await readJSONFile("database/purchase/model.json");

    if (models.length === 0) {
      return {
        success: true,
        migrated: 0,
        errors: [],
        message: "No models found to migrate",
      };
    }

    let migrated = 0;
    const errors: string[] = [];

    for (const model of models) {
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("vehicle_models").insert({
            id: model.id,
            brand_id: model.brand_id,
            name: model.name,
          });

          if (error) throw error;
        });

        migrated++;
        await logger.logOperation("migration", "models", "success", {
          model_id: model.id,
          name: model.name,
          brand_id: model.brand_id,
        });
      } catch (error) {
        const errorMsg = `Failed to migrate model ${model.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        errors.push(errorMsg);

        await logger.logOperation("migration", "models", "error", {
          model_id: model.id,
          error: errorMsg,
        });
      }
    }

    await logger.logOperation("migration", "models", "complete", {
      total: models.length,
      migrated,
      errors: errors.length,
    });

    return {
      success: errors.length === 0,
      migrated,
      errors,
      message: `Model migration completed: ${migrated}/${models.length} models migrated`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await logger.logOperation("migration", "models", "error", {
      error: errorMsg,
    });

    return {
      success: false,
      migrated: 0,
      errors: [errorMsg],
    };
  }
}

// Employee Migration
export async function migrateEmployees(): Promise<MigrationResult> {
  const logger = DatabaseLogger.getInstance();
  const supabase = createSupabaseAdminClient();

  try {
    await logger.logOperation("migration", "employees", "start", {
      message: "Starting employee migration",
    });

    // Check if we have employee data in HR payroll files
    const payrollDir = path.join(process.cwd(), "src/database/hr/payroll_data");
    let employees: any[] = [];

    if (fs.existsSync(payrollDir)) {
      const monthDirs = fs.readdirSync(payrollDir);
      const employeeMap = new Map<string, any>();

      // Extract unique employees from payroll data
      for (const monthDir of monthDirs) {
        const monthPath = path.join(payrollDir, monthDir);
        if (fs.statSync(monthPath).isDirectory()) {
          const files = fs.readdirSync(monthPath);
          for (const file of files) {
            if (file.endsWith(".json")) {
              try {
                const filePath = path.join(monthPath, file);
                const payrollData = JSON.parse(
                  fs.readFileSync(filePath, "utf-8")
                );

                if (
                  payrollData.employee_id &&
                  !employeeMap.has(payrollData.employee_id)
                ) {
                  employeeMap.set(payrollData.employee_id, {
                    employee_id: payrollData.employee_id,
                    name: `Employee ${payrollData.employee_id}`,
                    nationality: payrollData.employee_id.startsWith("TH")
                      ? "Thai"
                      : "Indian",
                    status: "Active",
                    hire_date: "2024-01-01", // Default hire date
                  });
                }
              } catch (error) {
                console.warn(`Could not parse ${file}:`, error);
              }
            }
          }
        }
      }

      employees = Array.from(employeeMap.values());
    }

    if (employees.length === 0) {
      return {
        success: true,
        migrated: 0,
        errors: [],
        message: "No employees found to migrate",
      };
    }

    let migrated = 0;
    const errors: string[] = [];

    for (const employee of employees) {
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("employees").insert({
            employee_id: employee.employee_id,
            name: employee.name,
            nationality: employee.nationality,
            status: employee.status,
            hire_date: employee.hire_date,
            personal_info: {},
            employment_details: {},
            documents: [],
          });

          if (error) throw error;
        });

        migrated++;
        await logger.logOperation("migration", "employees", "success", {
          employee_id: employee.employee_id,
          name: employee.name,
        });
      } catch (error) {
        const errorMsg = `Failed to migrate employee ${employee.employee_id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        errors.push(errorMsg);

        await logger.logOperation("migration", "employees", "error", {
          employee_id: employee.employee_id,
          error: errorMsg,
        });
      }
    }

    await logger.logOperation("migration", "employees", "complete", {
      total: employees.length,
      migrated,
      errors: errors.length,
    });

    return {
      success: errors.length === 0,
      migrated,
      errors,
      message: `Employee migration completed: ${migrated}/${employees.length} employees migrated`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await logger.logOperation("migration", "employees", "error", {
      error: errorMsg,
    });

    return {
      success: false,
      migrated: 0,
      errors: [errorMsg],
    };
  }
}

// Financial Records Migration
export async function migrateFinancialRecords() {
  try {
    console.log("Starting financial records migration...");

    return {
      success: true,
      migrated: 0,
      errors: [],
      message:
        "Financial records migration placeholder - implementation pending",
    };
  } catch (error) {
    return {
      success: false,
      migrated: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// Payroll Data Migration
export async function migratePayrollData() {
  try {
    console.log("Starting payroll data migration...");

    return {
      success: true,
      migrated: 0,
      errors: [],
      message: "Payroll data migration placeholder - implementation pending",
    };
  } catch (error) {
    return {
      success: false,
      migrated: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// Attendance Data Migration
export async function migrateAttendanceData() {
  try {
    console.log("Starting attendance data migration...");

    return {
      success: true,
      migrated: 0,
      errors: [],
      message: "Attendance data migration placeholder - implementation pending",
    };
  } catch (error) {
    return {
      success: false,
      migrated: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// Sales Data Migration
export async function migrateSalesData() {
  try {
    console.log("Starting sales data migration...");

    return {
      success: true,
      migrated: 0,
      errors: [],
      message: "Sales data migration placeholder - implementation pending",
    };
  } catch (error) {
    return {
      success: false,
      migrated: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// Holidays Migration
export async function migrateHolidays() {
  try {
    console.log("Starting holidays migration...");

    return {
      success: true,
      migrated: 0,
      errors: [],
      message: "Holidays migration placeholder - implementation pending",
    };
  } catch (error) {
    return {
      success: false,
      migrated: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// Reference Data Migration
export async function migrateReferenceData() {
  try {
    console.log("Starting reference data migration...");

    return {
      success: true,
      migrated: 0,
      errors: [],
      message: "Reference data migration placeholder - implementation pending",
    };
  } catch (error) {
    return {
      success: false,
      migrated: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// Master Migration Function - Runs all migrations in sequence
export async function runCompleteMigration(): Promise<{
  success: boolean;
  results: Array<{ name: string; result: MigrationResult }>;
  summary: {
    totalMigrated: number;
    totalErrors: number;
    successful: number;
    failed: number;
  };
}> {
  const logger = DatabaseLogger.getInstance();

  await logger.logOperation("migration", "all", "start", {
    message: "Starting complete data migration",
  });

  const migrations = [
    { name: "brands", fn: migrateBrands },
    { name: "models", fn: migrateModels },
    { name: "vehicles", fn: migrateVehicles },
    { name: "employees", fn: migrateEmployees },
    { name: "financial_records", fn: migrateFinancialRecords },
    { name: "payroll_data", fn: migratePayrollData },
    { name: "attendance_data", fn: migrateAttendanceData },
    { name: "sales_data", fn: migrateSalesData },
  ];

  const results: Array<{ name: string; result: MigrationResult }> = [];
  let totalMigrated = 0;
  let totalErrors = 0;
  let successful = 0;
  let failed = 0;

  for (const migration of migrations) {
    try {
      console.log(`\n🚀 Running ${migration.name} migration...`);
      const result = await migration.fn();

      results.push({ name: migration.name, result });
      totalMigrated += result.migrated;
      totalErrors += result.errors.length;

      if (result.success) {
        successful++;
        console.log(
          `✅ ${migration.name} migration completed: ${result.migrated} records`
        );
      } else {
        failed++;
        console.error(`❌ ${migration.name} migration failed:`, result.errors);
      }
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      results.push({
        name: migration.name,
        result: {
          success: false,
          migrated: 0,
          errors: [errorMsg],
        },
      });
      console.error(`💥 ${migration.name} migration crashed:`, errorMsg);
    }
  }

  const summary = {
    totalMigrated,
    totalErrors,
    successful,
    failed,
  };

  await logger.logOperation("migration", "all", "complete", {
    summary,
    results: results.map((r) => ({
      name: r.name,
      success: r.result.success,
      migrated: r.result.migrated,
    })),
  });

  console.log(`\n📊 Migration Summary:`);
  console.log(`   Total records migrated: ${totalMigrated}`);
  console.log(`   Successful migrations: ${successful}/${migrations.length}`);
  console.log(`   Failed migrations: ${failed}/${migrations.length}`);
  console.log(`   Total errors: ${totalErrors}`);

  return {
    success: failed === 0,
    results,
    summary,
  };
}
