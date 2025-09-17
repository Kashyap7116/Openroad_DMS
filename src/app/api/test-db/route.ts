import { NextRequest, NextResponse } from "next/server";import { createSupabaseAdminClient } from "@/lib/supabase";

import { createSupabaseServerClient } from "@/lib/supabase";import { NextResponse } from "next/server";



export async function GET(request: NextRequest) {export async function GET() {

  try {  try {

    const supabase = createSupabaseServerClient();    const supabase = createSupabaseAdminClient();

    

    // Test basic connection    console.log("Testing Supabase connection to multiple tables...");

    const { data, error } = await supabase.from('profiles').select('count').limit(1);

        // Test vehicles table

    if (error) {    const { data: vehicles, error: vehiclesError } = await supabase

      console.error("Database error:", error);      .from("vehicles")

      return NextResponse.json({       .select("*")

        error: "Database connection failed",       .limit(1);

        details: error.message,

        code: error.code    // Test employees table

      }, { status: 500 });    const { data: employees, error: employeesError } = await supabase

    }      .from("employees")

          .select("*")

    return NextResponse.json({       .limit(1);

      success: true, 

      message: "Database connection successful",    // Test financial_records table

      data: data    const { data: financial, error: financialError } = await supabase

    });      .from("financial_records")

  } catch (error) {      .select("*")

    console.error("Test connection error:", error);      .limit(1);

    return NextResponse.json({ 

      error: "Test connection failed",     const results = {

      details: error instanceof Error ? error.message : "Unknown error"      vehicles: {

    }, { status: 500 });        exists: !vehiclesError,

  }        error: vehiclesError?.message || null,

}        count: vehicles?.length || 0,
      },
      employees: {
        exists: !employeesError,
        error: employeesError?.message || null,
        count: employees?.length || 0,
      },
      financial_records: {
        exists: !financialError,
        error: financialError?.message || null,
        count: financial?.length || 0,
      },
    };

    console.log("Database test results:", results);

    return NextResponse.json({
      success: true,
      message: "Database connectivity test completed",
      tables: results,
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json({
      success: false,
      error: "Database test failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
