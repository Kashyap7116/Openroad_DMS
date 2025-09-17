import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
}

// Client-side Supabase client (for browser usage)
export const createSupabaseClient = () => {
  return createClient(supabaseUrl!, supabaseAnonKey!);
};

// Server-side Supabase client (for API routes)
export const createSupabaseServerClient = () => {
  return createServerComponentClient({ cookies });
};

// Admin client with service role key (for admin operations)
export const createSupabaseAdminClient = () => {
  if (!supabaseServiceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Alias for backward compatibility
export const createSupabaseAdmin = createSupabaseAdminClient;

// Database types (will be updated as we create the schema)
export interface Database {
  public: {
    Tables: {
      vehicles: {
        Row: VehicleRow;
        Insert: VehicleInsert;
        Update: VehicleUpdate;
      };
      employees: {
        Row: EmployeeRow;
        Insert: EmployeeInsert;
        Update: EmployeeUpdate;
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      // Add more tables as we create them
    };
  };
}

// Type definitions based on your current data structures
export interface VehicleRow {
  id: string;
  license_plate: string;
  vehicle: string;
  date: string;
  seller: string;
  purchase_price: number;
  final_price: number;
  payment_type: string;
  status: "Processing" | "Completed" | "Sold";
  full_data: any;
  sale_details?: any;
  maintenance_history?: any[];
  financial_history?: any[];
  licence_history?: any[];
  bonus_history?: any[];
  created_at: string;
  updated_at: string;
  created_by: string;
  version: number;
}

export interface VehicleInsert {
  id: string;
  license_plate: string;
  vehicle: string;
  date: string;
  seller: string;
  purchase_price: number;
  final_price: number;
  payment_type: string;
  status?: "Processing" | "Completed" | "Sold";
  full_data: any;
  sale_details?: any;
  maintenance_history?: any[];
  financial_history?: any[];
  licence_history?: any[];
  bonus_history?: any[];
  created_by: string;
}

export interface VehicleUpdate {
  license_plate?: string;
  vehicle?: string;
  date?: string;
  seller?: string;
  purchase_price?: number;
  final_price?: number;
  payment_type?: string;
  status?: "Processing" | "Completed" | "Sold";
  full_data?: any;
  sale_details?: any;
  maintenance_history?: any[];
  financial_history?: any[];
  licence_history?: any[];
  bonus_history?: any[];
  updated_at?: string;
  version?: number;
}

export interface EmployeeRow {
  employee_id: string;
  personal_info: any;
  documents: any;
  employment_info: any;
  created_at: string;
  updated_at: string;
  created_by: string;
  version: number;
}

export interface EmployeeInsert {
  employee_id: string;
  personal_info: any;
  documents?: any;
  employment_info?: any;
  created_by: string;
}

export interface EmployeeUpdate {
  personal_info?: any;
  documents?: any;
  employment_info?: any;
  updated_at?: string;
  version?: number;
}

export interface ProfileRow {
  user_id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Staff";
  modules: string[];
  status: "Active" | "Inactive";
  created_at: string;
  updated_at: string;
  last_login?: string;
  image?: string;
  employee_id?: string;
  department?: string;
}

export interface ProfileInsert {
  user_id: string;
  name: string;
  email: string;
  role?: "Admin" | "Manager" | "Staff";
  modules?: string[];
  status?: "Active" | "Inactive";
  employee_id?: string;
  department?: string;
}

export interface ProfileUpdate {
  name?: string;
  email?: string;
  role?: "Admin" | "Manager" | "Staff";
  modules?: string[];
  status?: "Active" | "Inactive";
  updated_at?: string;
  last_login?: string;
  image?: string;
  employee_id?: string;
  department?: string;
}

// Utility functions
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase error in ${context}:`, error);
  throw new Error(
    `Database operation failed: ${error.message || "Unknown error"}`
  );
};

// Connection test function
export const testSupabaseConnection = async () => {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "table does not exist" which is expected initially
      throw error;
    }

    return { success: true, message: "Supabase connection successful" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
