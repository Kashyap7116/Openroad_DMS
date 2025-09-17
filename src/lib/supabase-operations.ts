"use server";

import type {
  EmployeeInsert,
  EmployeeUpdate,
  VehicleInsert,
  VehicleUpdate,
} from "@/lib/supabase";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  handleSupabaseError,
} from "@/lib/supabase";

// Create Supabase clients
const getSupabaseClient = () => createSupabaseServerClient();
const getAdminClient = () => createSupabaseAdminClient();

// =============================================
// VEHICLE OPERATIONS
// =============================================

/**
 * Get all vehicles with optional filtering
 */
export async function getVehicles(filters?: {
  status?: string;
  license_plate?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  try {
    const supabase = getSupabaseClient();

    let query = supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.license_plate) {
      query = query.ilike("license_plate", `%${filters.license_plate}%`);
    }
    if (filters?.date_from) {
      query = query.gte("date", filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte("date", filters.date_to);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, "getVehicles");
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}

/**
 * Get a single vehicle by ID
 */
export async function getVehicle(id: string) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      handleSupabaseError(error, "getVehicle");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

/**
 * Create or update a vehicle
 */
export async function saveVehicle(
  id: string,
  vehicleData: Partial<VehicleInsert>,
  isUpdate: boolean = false
) {
  try {
    const supabase = getSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required");
    }

    const record: VehicleInsert | VehicleUpdate = isUpdate
      ? ({
          ...vehicleData,
          updated_at: new Date().toISOString(),
        } as VehicleUpdate)
      : ({
          id,
          license_plate: vehicleData.license_plate!,
          vehicle: vehicleData.vehicle!,
          date: vehicleData.date!,
          seller: vehicleData.seller || "",
          purchase_price: vehicleData.purchase_price || 0,
          final_price: vehicleData.final_price || 0,
          payment_type: vehicleData.payment_type || "Cash",
          status: vehicleData.status || "Processing",
          full_data: vehicleData.full_data || {},
          created_by: user.id,
        } as VehicleInsert);

    const { data, error } = await supabase
      .from("vehicles")
      .upsert(record)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, "saveVehicle");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error saving vehicle:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

/**
 * Delete a vehicle
 */
export async function deleteVehicle(id: string) {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) {
      handleSupabaseError(error, "deleteVehicle");
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================
// EMPLOYEE OPERATIONS
// =============================================

/**
 * Get all employees
 */
export async function getEmployees(filters?: {
  search?: string;
  limit?: number;
}) {
  try {
    const supabase = getSupabaseClient();

    let query = supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.search) {
      query = query.or(
        `personal_info->>name.ilike.%${filters.search}%,employee_id.ilike.%${filters.search}%`
      );
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, "getEmployees");
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching employees:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}

/**
 * Get a single employee by ID
 */
export async function getEmployee(employeeId: string) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("employee_id", employeeId)
      .single();

    if (error) {
      handleSupabaseError(error, "getEmployee");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching employee:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

/**
 * Create or update an employee
 */
export async function saveEmployee(
  employeeId: string,
  employeeData: Partial<EmployeeInsert>,
  isUpdate: boolean = false
) {
  try {
    const supabase = getSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required");
    }

    const record: EmployeeInsert | EmployeeUpdate = isUpdate
      ? ({
          ...employeeData,
          updated_at: new Date().toISOString(),
        } as EmployeeUpdate)
      : ({
          employee_id: employeeId,
          personal_info: employeeData.personal_info || {},
          documents: employeeData.documents || {},
          employment_info: employeeData.employment_info || {},
          created_by: user.id,
        } as EmployeeInsert);

    const { data, error } = await supabase
      .from("employees")
      .upsert(record)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, "saveEmployee");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error saving employee:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

/**
 * Delete an employee
 */
export async function deleteEmployee(employeeId: string) {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("employee_id", employeeId);

    if (error) {
      handleSupabaseError(error, "deleteEmployee");
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting employee:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================
// FINANCIAL OPERATIONS
// =============================================

/**
 * Get financial records with filtering
 */
export async function getFinancialRecords(filters?: {
  type?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  reference_type?: string;
  reference_id?: string;
  limit?: number;
}) {
  try {
    const supabase = getSupabaseClient();

    let query = supabase
      .from("financial_records")
      .select("*")
      .order("date", { ascending: false });

    // Apply filters
    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.category) {
      query = query.eq("category", filters.category);
    }
    if (filters?.date_from) {
      query = query.gte("date", filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte("date", filters.date_to);
    }
    if (filters?.reference_type) {
      query = query.eq("reference_type", filters.reference_type);
    }
    if (filters?.reference_id) {
      query = query.eq("reference_id", filters.reference_id);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, "getFinancialRecords");
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching financial records:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}

/**
 * Create a financial record
 */
export async function createFinancialRecord(recordData: {
  type: "Income" | "Expense" | "Commission" | "Bonus" | "Adjustment";
  category: string;
  amount: number;
  description?: string;
  date: string;
  reference_id?: string;
  reference_type?: string;
  metadata?: any;
}) {
  try {
    const supabase = getSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required");
    }

    const { data, error } = await supabase
      .from("financial_records")
      .insert({
        ...recordData,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, "createFinancialRecord");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error creating financial record:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

// =============================================
// ATTENDANCE OPERATIONS
// =============================================

/**
 * Get attendance records
 */
export async function getAttendanceRecords(filters?: {
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  limit?: number;
}) {
  try {
    const supabase = getSupabaseClient();

    let query = supabase
      .from("attendance_records")
      .select("*, employees!inner(employee_id, personal_info)")
      .order("date", { ascending: false });

    if (filters?.employee_id) {
      query = query.eq("employee_id", filters.employee_id);
    }
    if (filters?.date_from) {
      query = query.gte("date", filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte("date", filters.date_to);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, "getAttendanceRecords");
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    };
  }
}

/**
 * Create or update attendance record
 */
export async function saveAttendanceRecord(recordData: {
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  break_duration?: number;
  overtime_hours?: number;
  status?: string;
  notes?: string;
}) {
  try {
    const supabase = getSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required");
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(
        {
          ...recordData,
          created_by: user.id,
        },
        {
          onConflict: "employee_id,date",
        }
      )
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, "saveAttendanceRecord");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error saving attendance record:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Execute database transaction
 */
export async function executeTransaction<T>(
  operations: (client: ReturnType<typeof getSupabaseClient>) => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const supabase = getSupabaseClient();

    // Note: Supabase doesn't have explicit transaction support like traditional ORMs
    // We'll implement optimistic locking and error handling instead
    const result = await operations(supabase);

    return { success: true, data: result };
  } catch (error) {
    console.error("Transaction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get system statistics
 */
export async function getSystemStats() {
  try {
    const supabase = getSupabaseClient();

    // Use the database function we created
    const { data, error } = await supabase.rpc("get_system_stats");

    if (error) {
      handleSupabaseError(error, "getSystemStats");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching system stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    };
  }
}

/**
 * Test database connection
 */
export async function testDatabaseConnection() {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      // Table doesn't exist is okay for initial setup
      throw error;
    }

    return { success: true, message: "Database connection successful" };
  } catch (error) {
    console.error("Database connection test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
