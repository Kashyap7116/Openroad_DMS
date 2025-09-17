import { createSupabaseAdminClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const stats: any = {};

    // Vehicle Statistics
    const { count: totalVehicles } = await supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true });

    const { count: activeVehicles } = await supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    stats.total_vehicles = totalVehicles || 0;
    stats.active_vehicles = activeVehicles || 0;

    // Employee Statistics
    const { count: totalEmployees } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true });

    stats.total_employees = totalEmployees || 0;

    // User Statistics
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    stats.total_users = totalUsers || 0;

    // Active Sessions
    const { count: activeSessions } = await supabase
      .from("user_sessions")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    stats.active_sessions = activeSessions || 0;
    stats.active_users = activeSessions || 0; // Assuming active sessions = active users

    // Sales Statistics
    const { count: totalSales } = await supabase
      .from("sales_records")
      .select("*", { count: "exact", head: true });

    stats.total_sales = totalSales || 0;

    // Pending Expenses
    const { count: pendingExpenses } = await supabase
      .from("office_expenses")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    stats.pending_expenses = pendingExpenses || 0;

    // Financial Summary
    const { data: totalRevenue } = await supabase
      .from("financial_records")
      .select("amount.sum()")
      .eq("type", "income")
      .single();

    const { data: totalExpenses } = await supabase
      .from("financial_records")
      .select("amount.sum()")
      .eq("type", "expense")
      .single();

    stats.total_revenue = totalRevenue || 0;
    stats.total_expenses = totalExpenses || 0;

    // Audit Log Count
    const { count: auditLogs } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true });

    stats.audit_logs = auditLogs || 0;

    // System Health
    stats.last_updated = new Date().toISOString();
    stats.database_size = "N/A"; // Would need database admin privileges
    stats.connection_pool = "Active";

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Failed to load system stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load system statistics",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request); // Alias POST to GET for convenience
}
