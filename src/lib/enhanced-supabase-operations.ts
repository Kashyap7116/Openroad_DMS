import type {
  EmployeeInsert,
  EmployeeUpdate,
  VehicleInsert,
  VehicleUpdate,
} from "@/lib/supabase";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase";
import { PostgrestError } from "@supabase/supabase-js";

// Enhanced error handling with specific error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: string,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

// Enhanced logging interface
interface DatabaseOperation {
  operation: string;
  table: string;
  duration: number;
  success: boolean;
  error?: string;
  recordsAffected?: number;
}

// Logger utility
export class DatabaseLogger {
  private static instance: DatabaseLogger;
  private operations: DatabaseOperation[] = [];

  static getInstance(): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger();
    }
    return DatabaseLogger.instance;
  }

  getRecentOperations(count: number = 10): DatabaseOperation[] {
    return this.operations.slice(-count);
  }

  getFailedOperations(): DatabaseOperation[] {
    return this.operations.filter((op) => !op.success);
  }

  // Async wrapper for logging operations
  async logOperation(
    operation: string,
    table: string,
    status: "start" | "success" | "error" | "complete",
    metadata?: Record<string, any>
  ): Promise<void>;

  // Synchronous overload for backward compatibility
  logOperation(operation: DatabaseOperation): void;

  // Implementation
  logOperation(
    operationOrString: string | DatabaseOperation,
    table?: string,
    status?: "start" | "success" | "error" | "complete",
    metadata: Record<string, any> = {}
  ): Promise<void> | void {
    // Handle legacy DatabaseOperation object
    if (typeof operationOrString === "object") {
      const operation = operationOrString;
      this.operations.push(operation);

      // Console logging with structured format
      const logMessage = `[DB ${operation.operation.toUpperCase()}] ${
        operation.table
      } - ${operation.duration}ms`;

      if (operation.success) {
        console.log(
          `✅ ${logMessage} - ${operation.recordsAffected || 0} record(s)`
        );
      } else {
        console.error(`❌ ${logMessage} - Error: ${operation.error}`);
      }

      // Keep only last 100 operations in memory
      if (this.operations.length > 100) {
        this.operations = this.operations.slice(-100);
      }
      return;
    }

    // Handle new async format
    const logData = {
      operation: operationOrString,
      table: table!,
      status: status!,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    if (status === "error") {
      console.error(
        `❌ [DB ${operationOrString.toUpperCase()}] ${table}:`,
        logData
      );
    } else {
      console.log(
        `✅ [DB ${operationOrString.toUpperCase()}] ${table}:`,
        logData
      );
    }

    return Promise.resolve();
  }
}

// Retry utility with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  context: string = "operation"
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on validation or authentication errors
      if (
        error instanceof ValidationError ||
        error instanceof AuthenticationError
      ) {
        throw error;
      }

      if (attempt === maxRetries) {
        console.error(
          `❌ ${context} failed after ${maxRetries} attempts:`,
          lastError
        );
        break;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ ${context} attempt ${attempt} failed, retrying in ${delay}ms:`,
        lastError.message
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new DatabaseError(
    `Operation failed after ${maxRetries} attempts: ${
      lastError?.message || "Unknown error"
    }`,
    undefined,
    context,
    lastError
  );
}

// Enhanced error handler with detailed error mapping
function handleSupabaseError(error: PostgrestError, context: string): never {
  const logger = DatabaseLogger.getInstance();

  // Map common PostgreSQL error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    "23505": "A record with this identifier already exists",
    "23503": "Referenced record does not exist",
    "23514": "Data validation failed",
    "42P01": "Table does not exist",
    PGRST116: "Table or view not found",
    PGRST301: "Row level security violation",
  };

  const userMessage = errorMessages[error.code] || error.message;

  throw new DatabaseError(userMessage, error.code, context, error);
}

// Connection pool simulation (Supabase handles this internally)
class ConnectionManager {
  private static instance: ConnectionManager;
  private serverClient: ReturnType<typeof createSupabaseServerClient> | null =
    null;
  private adminClient: ReturnType<typeof createSupabaseAdminClient> | null =
    null;

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  getServerClient() {
    if (!this.serverClient) {
      this.serverClient = createSupabaseServerClient();
    }
    return this.serverClient;
  }

  getAdminClient() {
    if (!this.adminClient) {
      this.adminClient = createSupabaseAdminClient();
    }
    return this.adminClient;
  }

  // Health check for connections
  async healthCheck(): Promise<{ server: boolean; admin: boolean }> {
    const results = { server: false, admin: false };

    try {
      const serverClient = this.getServerClient();
      await serverClient.from("profiles").select("count").limit(1);
      results.server = true;
    } catch (error) {
      console.error("Server client health check failed:", error);
    }

    try {
      const adminClient = this.getAdminClient();
      await adminClient.from("profiles").select("count").limit(1);
      results.admin = true;
    } catch (error) {
      console.error("Admin client health check failed:", error);
    }

    return results;
  }
}

// Enhanced operation wrapper with timing and logging
async function executeOperation<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  operationName: string,
  tableName: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const logger = DatabaseLogger.getInstance();
  const startTime = Date.now();

  try {
    const result = await withRetry(
      async () => {
        const { data, error } = await operation();
        if (error) {
          handleSupabaseError(error, operationName);
        }
        return data;
      },
      3,
      1000,
      `${operationName} on ${tableName}`
    );

    const duration = Date.now() - startTime;
    logger.logOperation({
      operation: operationName,
      table: tableName,
      duration,
      success: true,
      recordsAffected: Array.isArray(result) ? result.length : result ? 1 : 0,
    });

    return { success: true, data: result || undefined };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.logOperation({
      operation: operationName,
      table: tableName,
      duration,
      success: false,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Enhanced validation utilities
function validateId(id: string, fieldName: string = "id"): void {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new ValidationError(
      `${fieldName} is required and must be a non-empty string`,
      fieldName
    );
  }
}

function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format", "email");
  }
}

function validateDateString(date: string, fieldName: string = "date"): void {
  if (!date || isNaN(Date.parse(date))) {
    throw new ValidationError(
      `${fieldName} must be a valid date string`,
      fieldName
    );
  }
}

// Enhanced authentication check
async function ensureAuthenticated() {
  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationError(
      "Authentication required to perform this operation"
    );
  }

  return user;
}

// =============================================
// ENHANCED VEHICLE OPERATIONS
// =============================================

export async function getVehicles(filters?: {
  status?: string;
  license_plate?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  // Validate inputs
  if (filters?.limit && (filters.limit <= 0 || filters.limit > 1000)) {
    throw new ValidationError("Limit must be between 1 and 1000", "limit");
  }

  if (filters?.date_from) {
    validateDateString(filters.date_from, "date_from");
  }

  if (filters?.date_to) {
    validateDateString(filters.date_to, "date_to");
  }

  return executeOperation(
    async () => {
      let query = supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters with proper SQL injection protection
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.license_plate) {
        query = query.ilike(
          "license_plate",
          `%${filters.license_plate.replace(/[%_]/g, "\\$&")}%`
        );
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

      return query;
    },
    "SELECT",
    "vehicles"
  );
}

export async function getVehicle(id: string) {
  validateId(id);

  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
      return supabase.from("vehicles").select("*").eq("id", id).single();
    },
    "SELECT_SINGLE",
    "vehicles"
  );
}

export async function saveVehicle(
  id: string,
  vehicleData: Partial<VehicleInsert>,
  isUpdate: boolean = false
) {
  validateId(id);

  // Validate required fields for new records
  if (!isUpdate) {
    if (!vehicleData.license_plate) {
      throw new ValidationError("License plate is required", "license_plate");
    }
    if (!vehicleData.vehicle) {
      throw new ValidationError("Vehicle information is required", "vehicle");
    }
    if (!vehicleData.date) {
      throw new ValidationError("Date is required", "date");
    }
    validateDateString(vehicleData.date, "date");
  }

  // Validate numeric fields
  if (
    vehicleData.purchase_price !== undefined &&
    vehicleData.purchase_price < 0
  ) {
    throw new ValidationError(
      "Purchase price cannot be negative",
      "purchase_price"
    );
  }
  if (vehicleData.final_price !== undefined && vehicleData.final_price < 0) {
    throw new ValidationError("Final price cannot be negative", "final_price");
  }

  const user = await ensureAuthenticated();
  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

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

  return executeOperation(
    async () => {
      return supabase.from("vehicles").upsert(record).select().single();
    },
    isUpdate ? "UPDATE" : "INSERT",
    "vehicles"
  );
}

export async function deleteVehicle(id: string) {
  validateId(id);
  await ensureAuthenticated();

  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
      return supabase.from("vehicles").delete().eq("id", id);
    },
    "DELETE",
    "vehicles"
  );
}

// =============================================
// ENHANCED EMPLOYEE OPERATIONS
// =============================================

export async function getEmployees(filters?: {
  search?: string;
  limit?: number;
}) {
  // Validate inputs
  if (filters?.limit && (filters.limit <= 0 || filters.limit > 1000)) {
    throw new ValidationError("Limit must be between 1 and 1000", "limit");
  }

  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
      let query = supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.search) {
        const searchTerm = filters.search.replace(/[%_]/g, "\\$&");
        query = query.or(
          `personal_info->>name.ilike.%${searchTerm}%,employee_id.ilike.%${searchTerm}%`
        );
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      return query;
    },
    "SELECT",
    "employees"
  );
}

export async function getEmployee(employeeId: string) {
  validateId(employeeId, "employee_id");

  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
      return supabase
        .from("employees")
        .select("*")
        .eq("employee_id", employeeId)
        .single();
    },
    "SELECT_SINGLE",
    "employees"
  );
}

export async function saveEmployee(
  employeeId: string,
  employeeData: Partial<EmployeeInsert>,
  isUpdate: boolean = false
) {
  validateId(employeeId, "employee_id");

  // Validate required fields for new records
  if (!isUpdate && !employeeData.personal_info) {
    throw new ValidationError(
      "Personal information is required",
      "personal_info"
    );
  }

  // Validate email if provided
  if (employeeData.personal_info?.email) {
    validateEmail(employeeData.personal_info.email);
  }

  const user = await ensureAuthenticated();
  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

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

  return executeOperation(
    async () => {
      return supabase.from("employees").upsert(record).select().single();
    },
    isUpdate ? "UPDATE" : "INSERT",
    "employees"
  );
}

export async function deleteEmployee(employeeId: string) {
  validateId(employeeId, "employee_id");
  await ensureAuthenticated();

  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
      return supabase.from("employees").delete().eq("employee_id", employeeId);
    },
    "DELETE",
    "employees"
  );
}

// =============================================
// ENHANCED FINANCIAL OPERATIONS
// =============================================

export async function getFinancialRecords(filters?: {
  type?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  reference_type?: string;
  reference_id?: string;
  limit?: number;
}) {
  // Validate inputs
  if (filters?.limit && (filters.limit <= 0 || filters.limit > 1000)) {
    throw new ValidationError("Limit must be between 1 and 1000", "limit");
  }

  if (filters?.date_from) {
    validateDateString(filters.date_from, "date_from");
  }

  if (filters?.date_to) {
    validateDateString(filters.date_to, "date_to");
  }

  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
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

      return query;
    },
    "SELECT",
    "financial_records"
  );
}

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
  // Validate required fields
  if (!recordData.category) {
    throw new ValidationError("Category is required", "category");
  }
  if (typeof recordData.amount !== "number") {
    throw new ValidationError("Amount must be a number", "amount");
  }
  validateDateString(recordData.date, "date");

  const user = await ensureAuthenticated();
  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
      return supabase
        .from("financial_records")
        .insert({
          ...recordData,
          created_by: user.id,
        })
        .select()
        .single();
    },
    "INSERT",
    "financial_records"
  );
}

// Alias for backward compatibility
export const saveFinancialRecord = createFinancialRecord;

// =============================================
// ENHANCED ATTENDANCE OPERATIONS
// =============================================

export async function getAttendanceRecords(filters?: {
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  limit?: number;
}) {
  // Validate inputs
  if (filters?.limit && (filters.limit <= 0 || filters.limit > 1000)) {
    throw new ValidationError("Limit must be between 1 and 1000", "limit");
  }

  if (filters?.date_from) {
    validateDateString(filters.date_from, "date_from");
  }

  if (filters?.date_to) {
    validateDateString(filters.date_to, "date_to");
  }

  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
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

      return query;
    },
    "SELECT",
    "attendance_records"
  );
}

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
  validateId(recordData.employee_id, "employee_id");
  validateDateString(recordData.date, "date");

  // Validate time formats if provided
  if (
    recordData.check_in &&
    !/^\d{2}:\d{2}(:\d{2})?$/.test(recordData.check_in)
  ) {
    throw new ValidationError(
      "Check-in must be in HH:MM or HH:MM:SS format",
      "check_in"
    );
  }
  if (
    recordData.check_out &&
    !/^\d{2}:\d{2}(:\d{2})?$/.test(recordData.check_out)
  ) {
    throw new ValidationError(
      "Check-out must be in HH:MM or HH:MM:SS format",
      "check_out"
    );
  }

  // Validate numeric fields
  if (
    recordData.break_duration !== undefined &&
    recordData.break_duration < 0
  ) {
    throw new ValidationError(
      "Break duration cannot be negative",
      "break_duration"
    );
  }
  if (
    recordData.overtime_hours !== undefined &&
    recordData.overtime_hours < 0
  ) {
    throw new ValidationError(
      "Overtime hours cannot be negative",
      "overtime_hours"
    );
  }

  const user = await ensureAuthenticated();
  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
      return supabase
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
    },
    "UPSERT",
    "attendance_records"
  );
}

// =============================================
// ENHANCED UTILITY FUNCTIONS
// =============================================

export async function executeTransaction<T>(
  operations: (
    client: ReturnType<typeof ConnectionManager.prototype.getServerClient>
  ) => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
      const result = await operations(supabase);
      return { data: result, error: null };
    },
    "TRANSACTION",
    "multiple"
  );
}

export async function getSystemStats() {
  const connectionManager = ConnectionManager.getInstance();
  const supabase = connectionManager.getServerClient();

  return executeOperation(
    async () => {
      return supabase.rpc("get_system_stats");
    },
    "RPC",
    "system_stats"
  );
}

export async function testDatabaseConnection() {
  const connectionManager = ConnectionManager.getInstance();

  try {
    const healthCheck = await connectionManager.healthCheck();

    return {
      success: healthCheck.server || healthCheck.admin,
      message: "Database connection successful",
      details: {
        server: healthCheck.server,
        admin: healthCheck.admin,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Database performance monitoring
export async function getDatabasePerformanceStats() {
  const logger = DatabaseLogger.getInstance();
  const recentOps = logger.getRecentOperations(50);
  const failedOps = logger.getFailedOperations();

  const avgDuration =
    recentOps.length > 0
      ? recentOps.reduce((sum, op) => sum + op.duration, 0) / recentOps.length
      : 0;

  const successRate =
    recentOps.length > 0
      ? (recentOps.filter((op) => op.success).length / recentOps.length) * 100
      : 100;

  return {
    totalOperations: recentOps.length,
    averageDuration: Math.round(avgDuration),
    successRate: Math.round(successRate * 100) / 100,
    recentFailures: failedOps.slice(-10),
    operationBreakdown: recentOps.reduce((acc, op) => {
      acc[op.operation] = (acc[op.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}

// Error classes are already exported above - no need to re-export
