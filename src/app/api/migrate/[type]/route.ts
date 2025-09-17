import {
  migrateAttendanceData,
  migrateEmployees,
  migrateFinancialRecords,
  migrateHolidays,
  migratePayrollData,
  migrateReferenceData,
  migrateSalesData,
  migrateVehicles,
} from "@/lib/migration-scripts";
import { NextRequest, NextResponse } from "next/server";

const migrationFunctions = {
  vehicles: migrateVehicles,
  employees: migrateEmployees,
  financial: migrateFinancialRecords,
  payroll: migratePayrollData,
  attendance: migrateAttendanceData,
  sales: migrateSalesData,
  holidays: migrateHolidays,
  reference: migrateReferenceData,
};

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const { type } = params;

    if (!(type in migrationFunctions)) {
      return NextResponse.json(
        {
          error: "Invalid migration type",
          availableTypes: Object.keys(migrationFunctions),
        },
        { status: 400 }
      );
    }

    console.log(`🚀 Starting ${type} migration...`);

    const migrationFn =
      migrationFunctions[type as keyof typeof migrationFunctions];
    const result = await migrationFn();

    console.log(`Migration ${type} completed:`, result);

    return NextResponse.json({
      success: result.success,
      message: result.message || `${type} migration completed`,
      migrated: result.migrated,
      errors: result.errors || [],
      type: type,
    });
  } catch (error) {
    console.error(`Migration ${params.type} error:`, error);
    return NextResponse.json(
      {
        error: `Migration ${params.type} failed`,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  const { type } = params;

  return NextResponse.json({
    message: `Individual migration endpoint for ${type}`,
    availableTypes: Object.keys(migrationFunctions),
    usage: `POST /api/migrate/${type} to execute migration`,
  });
}
