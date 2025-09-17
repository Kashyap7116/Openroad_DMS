import { createSupabaseAdminClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();

    // Test database connection with a simple query
    const { data, error } = await supabase
      .from("profiles")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("Database connection test failed:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    // Additional connection tests
    const { data: authData, error: authError } = await supabase.auth.getUser();

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      details: {
        database_connected: true,
        auth_connected: !authError,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to database",
      },
      { status: 500 }
    );
  }
}
