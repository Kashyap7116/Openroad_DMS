import { createSupabaseAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST() {
  return checkDatabase();
}

export async function GET() {
  return checkDatabase();
}

async function checkDatabase() {
  try {
    console.log("Checking database setup...");

    const supabase = createSupabaseAdminClient();

    // First, let's check what tables exist
    console.log("Testing connection and checking existing tables...");

    // Test connection with a simple query
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log("Auth test:", { authData: !!authData, authError });

    // Try to query the vehicles table to see the specific error
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .limit(1);

    console.log("Vehicles table test:", {
      hasData: !!vehiclesData,
      dataLength: vehiclesData?.length || 0,
      error: vehiclesError,
    });

    if (vehiclesError && vehiclesError.code === "PGRST205") {
      return NextResponse.json({
        success: false,
        error: "Database tables not found",
        message:
          "The vehicles table doesn't exist. Please create the database schema using the Supabase dashboard SQL editor with the SQL files in the /database folder.",
        suggestion:
          "Run the supabase-schema-complete.sql file in your Supabase project's SQL Editor",
        details: vehiclesError,
      });
    }

    // Try other tables
    const { data: employeesData, error: employeesError } = await supabase
      .from("employees")
      .select("*")
      .limit(1);

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      tables: {
        vehicles: { exists: !vehiclesError, count: vehiclesData?.length || 0 },
        employees: {
          exists: !employeesError,
          count: employeesData?.length || 0,
        },
        profiles: { exists: !profilesError, count: profilesData?.length || 0 },
      },
    });
  } catch (error) {
    console.error("Database check error:", error);
    return NextResponse.json({
      success: false,
      error: "Database check failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
