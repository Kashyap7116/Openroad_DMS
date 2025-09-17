"use server";

import { createFinancialRecord } from "@/lib/supabase-operations";
import { createClient } from "@/lib/supabase/server";
import {
  formatValidationErrors,
  validateFinanceForm,
} from "@/lib/validation-schemas";
import { addLog } from "../../admin/services/admin-actions";
import { getCurrentUser } from "../../auth/services/supabase-auth-actions";
import { handleAndLogApiError } from "../../shared/utils/utils";

/**
 * Gets financial summary from Supabase database.
 * @returns Financial summary data.
 */
export async function getFinanceSummary() {
  try {
    console.log("💰 Getting finance summary from Supabase...");

    const supabase = await createClient();

    // Get financial records for summary
    const { data: records, error } = await supabase
      .from("financial_records")
      .select("transaction_type, amount, date")
      .eq("status", "Completed");

    if (error) {
      console.error("❌ Failed to fetch financial records:", error);
      throw error;
    }

    // Calculate summary statistics
    const currentMonth = new Date();
    const currentYear = currentMonth.getFullYear();
    const currentMonthStart = new Date(currentYear, currentMonth.getMonth(), 1);
    const currentMonthEnd = new Date(
      currentYear,
      currentMonth.getMonth() + 1,
      0
    );

    let totalIncome = 0;
    let totalExpenses = 0;
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    (records || []).forEach((record: any) => {
      const recordDate = new Date(record.date);
      const amount = parseFloat(record.amount) || 0;

      if (record.transaction_type === "Income") {
        totalIncome += amount;
        if (recordDate >= currentMonthStart && recordDate <= currentMonthEnd) {
          monthlyIncome += amount;
        }
      } else if (record.transaction_type === "Expense") {
        totalExpenses += amount;
        if (recordDate >= currentMonthStart && recordDate <= currentMonthEnd) {
          monthlyExpenses += amount;
        }
      }
    });

    const summary = {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      monthlyIncome,
      monthlyExpenses,
      monthlyProfit: monthlyIncome - monthlyExpenses,
      recordCount: records?.length || 0,
    };

    console.log("✅ Finance summary calculated:", summary);
    return summary;
  } catch (error) {
    console.error("❌ Error in getFinanceSummary:", error);
    return await handleAndLogApiError(error, "getFinanceSummary");
  }
}

/**
 * Saves an office transaction to Supabase database.
 * @param formData Transaction data from form.
 * @returns Success/error result.
 */
export async function saveOfficeTransaction(formData: FormData) {
  try {
    console.log("💾 Saving office transaction to Supabase...");

    const user = await getCurrentUser();

    // Extract and prepare form data for validation
    const rawData = {
      type: formData.get("type") as string,
      category: formData.get("category") as string,
      amount: parseFloat(formData.get("amount") as string),
      date: formData.get("date") as string,
      remarks: (formData.get("description") as string) || "",
      license_plate: "Office", // Office transactions are linked to "Office"
      uploaded_file: null, // FormData file handling would go here
    };

    // Validate form data using Zod schema
    console.log("🔍 Validating finance form data...");
    const validationResult = validateFinanceForm(rawData);

    if (!validationResult.success) {
      const errorMessages = formatValidationErrors(validationResult.error);
      console.error("❌ Finance validation failed:", errorMessages);
      throw new Error(
        `Validation failed: ${errorMessages
          .map((err) => err.message)
          .join(", ")}`
      );
    }

    console.log("✅ Finance form validation passed");

    // Extract form data
    const transactionData = {
      transaction_type: formData.get("type") as string,
      category: formData.get("category") as string,
      amount: parseFloat(formData.get("amount") as string),
      description: formData.get("description") as string,
      transaction_date: formData.get("date") as string,
      account: (formData.get("account") as string) || "Main Account",
      status: "Completed",
    };

    // Validate required fields
    if (
      !transactionData.transaction_type ||
      !transactionData.amount ||
      !transactionData.transaction_date
    ) {
      throw new Error("Missing required transaction fields");
    }

    // Map the data to match createFinancialRecord parameters
    const financialRecordData = {
      type: transactionData.transaction_type as
        | "Income"
        | "Expense"
        | "Commission"
        | "Bonus"
        | "Adjustment",
      category: transactionData.category,
      amount: transactionData.amount,
      description: transactionData.description,
      date: transactionData.transaction_date,
      metadata: {
        account: transactionData.account,
        status: transactionData.status,
      },
    };

    // Save to Supabase
    const { success, error } = await createFinancialRecord(financialRecordData);

    if (!success) {
      throw new Error(error || "Failed to save transaction");
    }

    // Log the activity
    await addLog({
      user_id: user?.user_id || "SYSTEM",
      user_name: user?.name || "System User",
      module: "Finance",
      action: `Added ${transactionData.transaction_type.toLowerCase()} transaction`,
      details: {
        category: transactionData.category,
        amount: transactionData.amount,
        date: transactionData.transaction_date,
      },
    });

    console.log("✅ Office transaction saved successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error in saveOfficeTransaction:", error);
    return await handleAndLogApiError(error, "saveOfficeTransaction");
  }
}

/**
 * Gets office expenses from Supabase database.
 * @param month Optional month filter.
 * @param year Optional year filter.
 * @returns Array of expense records.
 */
export async function getOfficeExpenses(month?: number, year?: number) {
  try {
    console.log("📊 Getting office expenses from Supabase...");

    const supabase = await createClient();

    let query = supabase
      .from("office_expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    // Apply date filters if provided
    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.gte("expense_date", startDate).lte("expense_date", endDate);
    }

    if (month && year) {
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      query = query.gte("expense_date", startDate).lte("expense_date", endDate);
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error("❌ Failed to fetch office expenses:", error);
      throw error;
    }

    console.log(
      `✅ Successfully fetched ${expenses?.length || 0} office expenses`
    );
    return expenses || [];
  } catch (error) {
    console.error("❌ Error in getOfficeExpenses:", error);
    return [];
  }
}

/**
 * Saves office expense to Supabase database.
 * @param expenseData Expense data to save.
 * @returns Success/error result.
 */
export async function saveOfficeExpense(expenseData: {
  expense_date: string;
  category: string;
  amount: number;
  description?: string;
  receipt_number?: string;
}) {
  try {
    console.log("💾 Saving office expense to Supabase...");

    const supabase = await createClient();
    const user = await getCurrentUser();

    const { error } = await supabase.from("office_expenses").insert({
      ...expenseData,
      status: "Pending",
      created_by: user?.user_id || null,
    });

    if (error) {
      console.error("❌ Failed to save office expense:", error);
      throw error;
    }

    // Log the activity
    await addLog({
      user_id: user?.user_id || "SYSTEM",
      user_name: user?.name || "System User",
      module: "Finance",
      action: "Added office expense",
      details: {
        category: expenseData.category,
        amount: expenseData.amount,
        date: expenseData.expense_date,
      },
    });

    console.log("✅ Office expense saved successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error in saveOfficeExpense:", error);
    return await handleAndLogApiError(error, "saveOfficeExpense");
  }
}

/**
 * Gets financial records from Supabase with optional filtering.
 * @param filters Optional filters for the query.
 * @returns Array of financial records.
 */
export async function getFinancialRecordsFiltered(filters?: {
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  category?: string;
}) {
  try {
    console.log("📊 Getting filtered financial records from Supabase...");

    const supabase = await createClient();

    let query = supabase
      .from("financial_records")
      .select("*")
      .order("date", { ascending: false });

    // Apply filters
    if (filters?.startDate) {
      query = query.gte("date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate);
    }
    if (filters?.transactionType) {
      query = query.eq("transaction_type", filters.transactionType);
    }
    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error("❌ Failed to fetch financial records:", error);
      throw error;
    }

    console.log(
      `✅ Successfully fetched ${records?.length || 0} financial records`
    );
    return records || [];
  } catch (error) {
    console.error("❌ Error in getFinancialRecordsFiltered:", error);
    return [];
  }
}

// Supabase-based employee adjustment functions

/**
 * Gets employee adjustments from Supabase database.
 * @param employeeId Optional employee ID to filter by.
 * @returns Array of employee adjustment records.
 */
export async function getEmployeeAdjustments(employeeId?: string) {
  try {
    console.log("📊 Getting employee adjustments from Supabase...");

    const supabase = await createClient();
    let query = supabase
      .from("financial_records")
      .select("*")
      .eq("category", "Employee Adjustment")
      .order("date", { ascending: false });

    if (employeeId) {
      query = query.eq("details->>employee_id", employeeId);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error("❌ Failed to fetch employee adjustments:", error);
      return [];
    }

    console.log(
      `✅ Successfully fetched ${records?.length || 0} employee adjustments`
    );
    return records || [];
  } catch (error) {
    console.error("❌ Error in getEmployeeAdjustments:", error);
    return [];
  }
}

/**
 * Saves an employee adjustment to Supabase database.
 * @param adjustmentData The adjustment data to save.
 * @param isUpdate Whether this is an update operation.
 * @returns Success/error result.
 */
export async function saveEmployeeAdjustment(
  adjustmentData: any,
  isUpdate: boolean = false
) {
  try {
    console.log("💾 Saving employee adjustment to Supabase...");

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }

    const supabase = await createClient();

    const record = {
      transaction_type: adjustmentData.type || "Expense",
      category: "Employee Adjustment",
      amount: parseFloat(adjustmentData.amount) || 0,
      description: adjustmentData.description || "Employee adjustment",
      date: adjustmentData.date || new Date().toISOString().split("T")[0],
      account: adjustmentData.account || "Main Account",
      status: "Completed",
      details: {
        employee_id: adjustmentData.employee_id,
        employee_name: adjustmentData.employee_name,
        adjustment_type: adjustmentData.adjustment_type,
        reason: adjustmentData.reason,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
      },
    };

    let result;
    if (isUpdate && adjustmentData.id) {
      result = await supabase
        .from("financial_records")
        .update(record)
        .eq("id", adjustmentData.id);
    } else {
      result = await supabase.from("financial_records").insert([record]);
    }

    if (result.error) {
      console.error("❌ Failed to save employee adjustment:", result.error);
      return { success: false, error: result.error.message };
    }

    await addLog({
      user_id: currentUser.id,
      user_name: currentUser.email,
      module: "Finance",
      action: isUpdate
        ? "Updated employee adjustment"
        : "Created employee adjustment",
      details: { adjustment: adjustmentData },
    });

    console.log("✅ Employee adjustment saved successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error in saveEmployeeAdjustment:", error);
    return await handleAndLogApiError(error, "saveEmployeeAdjustment");
  }
}

/**
 * Deletes an employee adjustment from Supabase database.
 * @param adjustmentId The ID of the adjustment to delete.
 * @returns Success/error result.
 */
export async function deleteEmployeeAdjustment(adjustmentId: string) {
  try {
    console.log("🗑️ Deleting employee adjustment from Supabase...");

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("financial_records")
      .delete()
      .eq("id", adjustmentId);

    if (error) {
      console.error("❌ Failed to delete employee adjustment:", error);
      return { success: false, error: error.message };
    }

    await addLog({
      user_id: currentUser.id,
      user_name: currentUser.email,
      module: "Finance",
      action: "Deleted employee adjustment",
      details: { adjustment_id: adjustmentId },
    });

    console.log("✅ Employee adjustment deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error in deleteEmployeeAdjustment:", error);
    return await handleAndLogApiError(error, "deleteEmployeeAdjustment");
  }
}
