import { runCompleteMigration } from "@/lib/migration-scripts";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Starting complete data migration to Supabase...");

    const result = await runCompleteMigration();

    console.log("Migration completed:", result);

    return NextResponse.json({
      success: result.success,
      message: `Migration completed: ${result.summary.successful}/${result.results.length} migrations successful`,
      summary: result.summary,
      results: result.results,
    });
  } catch (error) {
    console.error("Migration API error:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Data migration endpoint. Use POST to execute migration.",
    endpoints: {
      "POST /api/migrate": "Run complete data migration to Supabase",
    },
  });
}
