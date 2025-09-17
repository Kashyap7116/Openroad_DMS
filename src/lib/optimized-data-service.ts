/**
 * Optimized Data Service Layer for Openroad DMS
 * High-performance, cached database operations with Supabase
 */

import { getCurrentUser } from "@/modules/auth/services/supabase-auth-actions";
import { supabaseService } from "@/lib/supabase-service";

// Types
export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  department_id?: string;
  position?: string;
  hire_date?: string;
  salary?: number;
  nationality?: string;
  address?: string;
  emergency_contact?: any;
  documents?: any;
  status: string;
  created_at: string;
  updated_at: string;
  department?: Department;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  break_start?: string;
  break_end?: string;
  hours_worked?: number;
  overtime_hours?: number;
  status: string;
  notes?: string;
  employee?: Employee;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  basic_salary: number;
  overtime_pay: number;
  bonuses: number;
  deductions: number;
  gross_pay: number;
  tax_deduction: number;
  net_pay: number;
  payment_status: string;
  payment_date?: string;
  payment_method?: string;
  employee?: Employee;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  engine_number?: string;
  chassis_number?: string;
  purchase_price?: number;
  purchase_date?: string;
  status: string;
  current_owner?: string;
  documents?: any;
  maintenance_records?: any;
}

// Cache implementation
class DataCache {
  private cache = new Map<string, any>();
  private expiry = new Map<string, number>();

  set(key: string, data: any, ttlSeconds: number = 300) {
    // 5 minutes default
    this.cache.set(key, data);
    this.expiry.set(key, Date.now() + ttlSeconds * 1000);
  }

  get(key: string): any | null {
    if (this.isValid(key)) {
      return this.cache.get(key);
    }
    this.delete(key);
    return null;
  }

  private isValid(key: string): boolean {
    const expiration = this.expiry.get(key);
    return (
      this.cache.has(key) && expiration !== undefined && expiration > Date.now()
    );
  }

  delete(key: string) {
    this.cache.delete(key);
    this.expiry.delete(key);
  }

  clear() {
    this.cache.clear();
    this.expiry.clear();
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  getSize(): number {
    return this.cache.size;
  }
}

class OptimizedDataService {
  private cache = new DataCache();

  // ============================================================================
  // EMPLOYEE OPERATIONS
  // ============================================================================

  async getEmployees(
    options: {
      page?: number;
      limit?: number;
      departmentId?: string;
      status?: string;
      search?: string;
      includeDepartment?: boolean;
    } = {}
  ) {
    const {
      page = 1,
      limit = 50,
      departmentId,
      status,
      search,
      includeDepartment = false,
    } = options;

    // Create cache key
    const cacheKey = `employees_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService
        .from("employees")
        .select(includeDepartment ? `*, department:departments(*)` : "*", {
          count: "exact",
        })
        .range((page - 1) * limit, page * limit - 1)
        .order("created_at", { ascending: false });

      // Apply filters
      if (departmentId) query = query.eq("department_id", departmentId);
      if (status) query = query.eq("status", status);
      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,employee_id.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const result = await query;

      // Cache for 5 minutes
      this.cache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error("Error fetching employees:", error);
      return { data: [], error, count: 0 };
    }
  }

  async getEmployeeById(
    id: string,
    includeDepartment = true
  ): Promise<Employee | null> {
    const cacheKey = `employee_${id}_${includeDepartment}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabaseService
        .from("employees")
        .select(includeDepartment ? `*, department:departments(*)` : "*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Cache for 10 minutes
      this.cache.set(cacheKey, data, 600);
      return data;
    } catch (error) {
      console.error("Error fetching employee:", error);
      return null;
    }
  }

  async createEmployee(employeeData: Partial<Employee>) {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== "Admin") {
        return { data: null, error: { message: "Unauthorized" } };
      }

      const { data, error } = await supabaseService
        .from("employees")
        .insert(employeeData)
        .select()
        .single();

      if (!error) {
        // Invalidate related caches
        this.invalidateEmployeeCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async updateEmployee(id: string, updates: Partial<Employee>) {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== "Admin") {
        return { data: null, error: { message: "Unauthorized" } };
      }

      const { data, error } = await supabaseService
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (!error) {
        // Invalidate specific employee cache and related caches
        this.cache.delete(`employee_${id}_true`);
        this.cache.delete(`employee_${id}_false`);
        this.invalidateEmployeeCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // ============================================================================
  // ATTENDANCE OPERATIONS
  // ============================================================================

  async getAttendanceRecords(
    options: {
      employeeId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      page?: number;
      limit?: number;
      includeEmployee?: boolean;
    } = {}
  ) {
    const {
      employeeId,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 100,
      includeEmployee = false,
    } = options;

    const cacheKey = `attendance_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService
        .from("attendance_records")
        .select(
          includeEmployee
            ? `*, employee:employees(id, employee_id, full_name, department_id)`
            : "*",
          { count: "exact" }
        )
        .range((page - 1) * limit, page * limit - 1)
        .order("date", { ascending: false });

      // Apply filters
      if (employeeId) query = query.eq("employee_id", employeeId);
      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);
      if (status) query = query.eq("status", status);

      const result = await query;

      // Cache for 2 minutes (attendance data changes frequently)
      this.cache.set(cacheKey, result, 120);
      return result;
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      return { data: [], error, count: 0 };
    }
  }

  async createAttendanceRecord(recordData: Partial<AttendanceRecord>) {
    try {
      const { data, error } = await supabaseService
        .from("attendance_records")
        .insert(recordData)
        .select()
        .single();

      if (!error) {
        // Invalidate attendance caches
        this.invalidateAttendanceCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>) {
    try {
      const { data, error } = await supabaseService
        .from("attendance_records")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (!error) {
        this.invalidateAttendanceCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // ============================================================================
  // PAYROLL OPERATIONS
  // ============================================================================

  async getPayrollRecords(
    options: {
      employeeId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      page?: number;
      limit?: number;
      includeEmployee?: boolean;
    } = {}
  ) {
    const {
      employeeId,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50,
      includeEmployee = false,
    } = options;

    const cacheKey = `payroll_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService
        .from("payroll_records")
        .select(
          includeEmployee
            ? `*, employee:employees(id, employee_id, full_name, department_id)`
            : "*",
          { count: "exact" }
        )
        .range((page - 1) * limit, page * limit - 1)
        .order("pay_period_end", { ascending: false });

      // Apply filters
      if (employeeId) query = query.eq("employee_id", employeeId);
      if (startDate) query = query.gte("pay_period_start", startDate);
      if (endDate) query = query.lte("pay_period_end", endDate);
      if (status) query = query.eq("payment_status", status);

      const result = await query;

      // Cache for 10 minutes (payroll data is sensitive but doesn't change often)
      this.cache.set(cacheKey, result, 600);
      return result;
    } catch (error) {
      console.error("Error fetching payroll records:", error);
      return { data: [], error, count: 0 };
    }
  }

  async createPayrollRecord(payrollData: Partial<PayrollRecord>) {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || !["Admin", "Manager"].includes(currentUser.role)) {
        return { data: null, error: { message: "Unauthorized" } };
      }

      const { data, error } = await supabaseService
        .from("payroll_records")
        .insert(payrollData)
        .select()
        .single();

      if (!error) {
        this.invalidatePayrollCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // ============================================================================
  // VEHICLE OPERATIONS
  // ============================================================================

  async getVehicles(
    options: {
      status?: string;
      make?: string;
      model?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, make, model, search, page = 1, limit = 50 } = options;

    const cacheKey = `vehicles_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService
        .from("vehicles")
        .select("*", { count: "exact" })
        .range((page - 1) * limit, page * limit - 1)
        .order("created_at", { ascending: false });

      // Apply filters
      if (status) query = query.eq("status", status);
      if (make) query = query.eq("make", make);
      if (model) query = query.eq("model", model);
      if (search) {
        query = query.or(
          `registration_number.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`
        );
      }

      const result = await query;

      // Cache for 5 minutes
      this.cache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      return { data: [], error, count: 0 };
    }
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    const cacheKey = `vehicle_${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabaseService
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Cache for 10 minutes
      this.cache.set(cacheKey, data, 600);
      return data;
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      return null;
    }
  }

  async createVehicle(vehicleData: Partial<Vehicle>) {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || !["Admin", "Manager"].includes(currentUser.role)) {
        return { data: null, error: { message: "Unauthorized" } };
      }

      const { data, error } = await supabaseService
        .from("vehicles")
        .insert(vehicleData)
        .select()
        .single();

      if (!error) {
        // Invalidate vehicle caches
        this.invalidateVehicleCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>) {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || !["Admin", "Manager"].includes(currentUser.role)) {
        return { data: null, error: { message: "Unauthorized" } };
      }

      const { data, error } = await supabaseService
        .from("vehicles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (!error) {
        // Invalidate specific vehicle cache and related caches
        this.cache.delete(`vehicle_${id}`);
        this.invalidateVehicleCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async deleteVehicle(id: string) {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== "Admin") {
        return { data: null, error: { message: "Unauthorized" } };
      }

      const { data, error } = await supabaseService
        .from("vehicles")
        .delete()
        .eq("id", id)
        .select();

      if (!error) {
        this.cache.delete(`vehicle_${id}`);
        this.invalidateVehicleCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // ============================================================================
  // TRANSACTION OPERATIONS
  // ============================================================================

  async createPurchaseTransaction(transactionData: any) {
    try {
      const { data, error } = await supabaseService
        .from("purchase_transactions")
        .insert(transactionData)
        .select()
        .single();

      if (!error) {
        this.invalidateTransactionCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async createSalesTransaction(transactionData: any) {
    try {
      const { data, error } = await supabaseService
        .from("sales_transactions")
        .insert(transactionData)
        .select()
        .single();

      if (!error) {
        this.invalidateTransactionCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getPurchaseTransactions(
    options: {
      vehicle_id?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { vehicle_id, startDate, endDate, page = 1, limit = 50 } = options;

    const cacheKey = `purchase_transactions_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService
        .from("purchase_transactions")
        .select("*", { count: "exact" })
        .range((page - 1) * limit, page * limit - 1)
        .order("created_at", { ascending: false });

      if (vehicle_id) query = query.eq("vehicle_id", vehicle_id);
      if (startDate) query = query.gte("purchase_date", startDate);
      if (endDate) query = query.lte("purchase_date", endDate);

      const result = await query;

      // Cache for 5 minutes
      this.cache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error("Error fetching purchase transactions:", error);
      return { data: [], error, count: 0 };
    }
  }

  async getSalesTransactions(
    options: {
      vehicle_id?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { vehicle_id, startDate, endDate, page = 1, limit = 50 } = options;

    const cacheKey = `sales_transactions_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService
        .from("sales_transactions")
        .select("*", { count: "exact" })
        .range((page - 1) * limit, page * limit - 1)
        .order("created_at", { ascending: false });

      if (vehicle_id) query = query.eq("vehicle_id", vehicle_id);
      if (startDate) query = query.gte("sale_date", startDate);
      if (endDate) query = query.lte("sale_date", endDate);

      const result = await query;

      // Cache for 5 minutes
      this.cache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error("Error fetching sales transactions:", error);
      return { data: [], error, count: 0 };
    }
  }

  // ============================================================================
  // MAINTENANCE OPERATIONS
  // ============================================================================

  async createMaintenanceRecord(maintenanceData: any) {
    try {
      const { data, error } = await supabaseService
        .from("maintenance_records")
        .insert(maintenanceData)
        .select()
        .single();

      if (!error) {
        this.invalidateMaintenanceCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getMaintenanceRecords(
    options: {
      vehicle_id?: string;
      maintenance_type?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const {
      vehicle_id,
      maintenance_type,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const cacheKey = `maintenance_records_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService
        .from("maintenance_records")
        .select("*", { count: "exact" })
        .range((page - 1) * limit, page * limit - 1)
        .order("maintenance_date", { ascending: false });

      if (vehicle_id) query = query.eq("vehicle_id", vehicle_id);
      if (maintenance_type)
        query = query.eq("maintenance_type", maintenance_type);
      if (startDate) query = query.gte("maintenance_date", startDate);
      if (endDate) query = query.lte("maintenance_date", endDate);

      const result = await query;

      // Cache for 10 minutes
      this.cache.set(cacheKey, result, 600);
      return result;
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
      return { data: [], error, count: 0 };
    }
  }

  // ============================================================================
  // FINANCIAL OPERATIONS
  // ============================================================================

  async createFinancialAdjustment(adjustmentData: any) {
    try {
      const { data, error } = await supabaseService
        .from("financial_adjustments")
        .insert(adjustmentData)
        .select()
        .single();

      if (!error) {
        this.invalidateFinanceCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getFinancialAdjustments(
    options: {
      employee_id?: string;
      vehicle_id?: string;
      adjustment_type?: string;
      startDate?: string;
      endDate?: string;
      approval_status?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const {
      employee_id,
      vehicle_id,
      adjustment_type,
      startDate,
      endDate,
      approval_status,
      page = 1,
      limit = 50,
    } = options;

    const cacheKey = `financial_adjustments_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService
        .from("financial_adjustments")
        .select("*", { count: "exact" })
        .range((page - 1) * limit, page * limit - 1)
        .order("created_at", { ascending: false });

      if (employee_id) query = query.eq("employee_id", employee_id);
      if (vehicle_id) query = query.eq("vehicle_id", vehicle_id);
      if (adjustment_type) query = query.eq("adjustment_type", adjustment_type);
      if (approval_status) query = query.eq("approval_status", approval_status);
      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);

      const result = await query;

      // Cache for 5 minutes
      this.cache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error("Error fetching financial adjustments:", error);
      return { data: [], error, count: 0 };
    }
  }

  async updateFinancialAdjustment(id: string, updates: any) {
    try {
      const { data, error } = await supabaseService
        .from("financial_adjustments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (!error) {
        this.invalidateFinanceCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async createBudget(budgetData: any) {
    try {
      const { data, error } = await supabaseService
        .from("budgets")
        .insert(budgetData)
        .select()
        .single();

      if (!error) {
        this.invalidateBudgetCaches();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getBudgets(
    options: {
      status?: string;
      year?: number;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, year, page = 1, limit = 50 } = options;

    const cacheKey = `budgets_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService
        .from("budgets")
        .select("*", { count: "exact" })
        .range((page - 1) * limit, page * limit - 1)
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);
      if (year) {
        query = query
          .gte("period_start", `${year}-01-01`)
          .lt("period_start", `${year + 1}-01-01`);
      }

      const result = await query;

      // Cache for 10 minutes
      this.cache.set(cacheKey, result, 600);
      return result;
    } catch (error) {
      console.error("Error fetching budgets:", error);
      return { data: [], error, count: 0 };
    }
  }

  async getBudgetById(id: string) {
    const cacheKey = `budget_${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabaseService
        .from("budgets")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Cache for 10 minutes
      this.cache.set(cacheKey, data, 600);
      return data;
    } catch (error) {
      console.error("Error fetching budget:", error);
      return null;
    }
  }

  async getDepartments() {
    const cacheKey = "departments";
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabaseService
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;

      // Cache for 1 hour (reference data changes rarely)
      this.cache.set(cacheKey, { data, error: null }, 3600);
      return { data, error: null };
    } catch (error) {
      console.error("Error fetching departments:", error);
      return { data: [], error };
    }
  }

  async getCountries() {
    const cacheKey = "countries";
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabaseService
        .from("countries")
        .select("*")
        .order("name");

      if (error) throw error;

      // Cache for 1 hour
      this.cache.set(cacheKey, { data, error: null }, 3600);
      return { data, error: null };
    } catch (error) {
      console.error("Error fetching countries:", error);
      return { data: [], error };
    }
  }

  async getHolidays(year?: number) {
    const cacheKey = `holidays_${year || "all"}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService.from("holidays").select("*").order("date");

      if (year) {
        query = query
          .gte("date", `${year}-01-01`)
          .lt("date", `${year + 1}-01-01`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cache for 1 hour
      this.cache.set(cacheKey, { data, error: null }, 3600);
      return { data, error: null };
    } catch (error) {
      console.error("Error fetching holidays:", error);
      return { data: [], error };
    }
  }

  async getReferenceData(type: string, key?: string) {
    const cacheKey = `reference_${type}_${key || "all"}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = supabaseService
        .from("reference_data")
        .select("*")
        .eq("type", type)
        .eq("is_active", true);

      if (key) {
        query = query.eq("key", key);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cache for 30 minutes
      this.cache.set(cacheKey, { data, error: null }, 1800);
      return { data, error: null };
    } catch (error) {
      console.error("Error fetching reference data:", error);
      return { data: [], error };
    }
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  async getEmployeeStats() {
    const cacheKey = "employee_stats";
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Get total employees by status
      const { data: statusData } = await supabaseService
        .from("employees")
        .select("status");

      const statusStats = statusData?.reduce((acc: any, emp: any) => {
        acc[emp.status] = (acc[emp.status] || 0) + 1;
        return acc;
      }, {});

      // Get employees by department
      const { data: deptData } = await supabaseService
        .from("employees")
        .select(
          `
          department:departments(name),
          status
        `
        )
        .eq("status", "active");

      const departmentStats = deptData?.reduce((acc: any, emp: any) => {
        const deptName = emp.department?.name || "Unassigned";
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
      }, {});

      const stats = {
        statusStats,
        departmentStats,
        lastUpdated: new Date().toISOString(),
      };

      // Cache for 15 minutes
      this.cache.set(cacheKey, stats, 900);
      return stats;
    } catch (error) {
      console.error("Error fetching employee stats:", error);
      return { error };
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  private invalidateEmployeeCaches() {
    // Remove all employee-related cache entries
    const keys = this.cache.getKeys();
    keys.forEach((key) => {
      if (key.startsWith("employee") || key.startsWith("employees")) {
        this.cache.delete(key);
      }
    });
  }

  private invalidateAttendanceCaches() {
    const keys = this.cache.getKeys();
    keys.forEach((key) => {
      if (key.startsWith("attendance")) {
        this.cache.delete(key);
      }
    });
  }

  private invalidatePayrollCaches() {
    const keys = this.cache.getKeys();
    keys.forEach((key) => {
      if (key.startsWith("payroll")) {
        this.cache.delete(key);
      }
    });
  }

  private invalidateVehicleCaches() {
    const keys = this.cache.getKeys();
    keys.forEach((key) => {
      if (key.startsWith("vehicle") || key.startsWith("vehicles")) {
        this.cache.delete(key);
      }
    });
  }

  private invalidateTransactionCaches() {
    const keys = this.cache.getKeys();
    keys.forEach((key) => {
      if (
        key.startsWith("purchase_transactions") ||
        key.startsWith("sales_transactions")
      ) {
        this.cache.delete(key);
      }
    });
  }

  private invalidateMaintenanceCaches() {
    const keys = this.cache.getKeys();
    keys.forEach((key) => {
      if (key.startsWith("maintenance")) {
        this.cache.delete(key);
      }
    });
  }

  private invalidateFinanceCaches() {
    const keys = this.cache.getKeys();
    keys.forEach((key) => {
      if (key.startsWith("financial") || key.startsWith("finance")) {
        this.cache.delete(key);
      }
    });
  }

  private invalidateBudgetCaches() {
    const keys = this.cache.getKeys();
    keys.forEach((key) => {
      if (key.startsWith("budget")) {
        this.cache.delete(key);
      }
    });
  }

  clearAllCaches() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.getSize(),
      keys: this.cache.getKeys(),
    };
  }
}

// Singleton instance
export const dataService = new OptimizedDataService();

