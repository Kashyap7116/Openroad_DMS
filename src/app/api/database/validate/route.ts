import { createSupabaseAdminClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const validation: any = {};

    // Validate Vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .limit(1);

    if (vehiclesError) {
      validation.vehicles = { error: vehiclesError.message };
    } else {
      const { count } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true });

      validation.vehicles = {
        count,
        sample: vehicles?.[0] || null,
      };
    }

    // Validate Employees
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("*")
      .limit(1);

    if (employeesError) {
      validation.employees = { error: employeesError.message };
    } else {
      const { count } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true });

      validation.employees = {
        count,
        sample: employees?.[0] || null,
      };
    }

    // Validate Financial Records
    const { data: financial, error: financialError } = await supabase
      .from("financial_records")
      .select("*")
      .limit(1);

    if (financialError) {
      validation.financial_records = { error: financialError.message };
    } else {
      const { count } = await supabase
        .from("financial_records")
        .select("*", { count: "exact", head: true });

      validation.financial_records = {
        count,
        sample: financial?.[0] || null,
      };
    }

    // Validate Attendance Records
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("*")
      .limit(1);

    if (attendanceError) {
      validation.attendance_records = { error: attendanceError.message };
    } else {
      const { count } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true });

      validation.attendance_records = {
        count,
        sample: attendance?.[0] || null,
      };
    }

    // Validate Payroll Records
    const { data: payroll, error: payrollError } = await supabase
      .from("payroll_records")
      .select("*")
      .limit(1);

    if (payrollError) {
      validation.payroll_records = { error: payrollError.message };
    } else {
      const { count } = await supabase
        .from("payroll_records")
        .select("*", { count: "exact", head: true });

      validation.payroll_records = {
        count,
        sample: payroll?.[0] || null,
      };
    }

    // Validate Sales Records
    const { data: sales, error: salesError } = await supabase
      .from("sales_records")
      .select("*")
      .limit(1);

    if (salesError) {
      validation.sales_records = { error: salesError.message };
    } else {
      const { count } = await supabase
        .from("sales_records")
        .select("*", { count: "exact", head: true });

      validation.sales_records = {
        count,
        sample: sales?.[0] || null,
      };
    }

    return NextResponse.json({
      success: true,
      validation,
    });
  } catch (error) {
    console.error("Validation failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Validation process failed",
      },
      { status: 500 }
    );
  }
}
