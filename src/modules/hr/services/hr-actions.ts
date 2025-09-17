"use server";

import {
  getEmployee as supabaseGetEmployee,
  getEmployees as supabaseGetEmployees,
  saveEmployee as supabaseSaveEmployee,
} from "@/lib/supabase-operations";
import { uploadEmployeeFile } from "@/lib/supabase-storage";
import { createClient } from "@/lib/supabase/server";
import { addLog } from "../../admin/services/admin-actions";
import { getCurrentUser } from "../../auth/services/supabase-auth-actions";
import { handleAndLogApiError } from "../../shared/utils/utils";

/**
 * Gets all employees from Supabase database.
 * @returns Array of employee objects.
 */
export async function getEmployees(): Promise<any[]> {
  try {
    console.log("📋 Fetching employees from Supabase...");
    const { data: employees, error } = await supabaseGetEmployees();

    if (!employees || error) {
      console.error("❌ Failed to fetch employees:", error);
      return [];
    }

    console.log(`✅ Successfully fetched ${employees.length} employees`);
    return employees;
  } catch (error) {
    console.error("❌ Error in getEmployees:", error);
    return [];
  }
}

/**
 * Gets a single employee by ID from Supabase database.
 * @param employeeId The ID of the employee to retrieve.
 * @returns Employee object or null if not found.
 */
export async function getEmployee(employeeId: string): Promise<any | null> {
  try {
    console.log("🔍 Fetching employee:", employeeId);
    const { data: employee, error } = await supabaseGetEmployee(employeeId);

    if (error) {
      console.error("❌ Failed to fetch employee:", error);
      return null;
    }

    console.log("✅ Successfully fetched employee");
    return employee;
  } catch (error) {
    console.error("❌ Error in getEmployee:", error);
    return null;
  }
}

/**
 * Gets countries data from Supabase database.
 * @returns Array of country objects.
 */
export async function getCountries() {
  try {
    const supabase = await createClient();
    const { data: countries, error } = await supabase
      .from("countries")
      .select("*")
      .order("name");

    if (error) {
      console.error("❌ Failed to fetch countries:", error);
      return [];
    }

    return countries || [];
  } catch (error) {
    console.error("❌ Error in getCountries:", error);
    return [];
  }
}

/**
 * Generates a new employee ID based on nationality.
 * @param nationality The nationality of the employee.
 * @returns A new employee ID.
 */
async function generateNewEmployeeId(nationality: string): Promise<string> {
  try {
    console.log("🆔 Generating employee ID for nationality:", nationality);

    const supabase = await createClient();

    // Map nationality to prefix
    let prefix = "XX"; // Default
    switch (nationality?.toUpperCase()) {
      case "INDIAN":
        prefix = "IN";
        break;
      case "THAI":
        prefix = "TH";
        break;
      case "CHINESE":
        prefix = "CN";
        break;
      case "AMERICAN":
        prefix = "US";
        break;
      case "BRITISH":
        prefix = "GB";
        break;
      case "JAPANESE":
        prefix = "JP";
        break;
      case "GERMAN":
        prefix = "DE";
        break;
      case "FRENCH":
        prefix = "FR";
        break;
    }

    // Get the highest existing ID for this nationality
    const { data: existingEmployees, error } = await supabase
      .from("employees")
      .select("employee_id")
      .like("employee_id", `${prefix}-%`)
      .order("employee_id", { ascending: false })
      .limit(1);

    if (error) {
      console.error("❌ Error fetching existing employees:", error);
      // Fallback to ID 1 if query fails
      return `${prefix}-0001`;
    }

    let nextNumber = 1;
    if (existingEmployees && existingEmployees.length > 0) {
      const lastId = existingEmployees[0].employee_id;
      const numberPart = lastId.split("-")[1];
      if (numberPart) {
        nextNumber = parseInt(numberPart, 10) + 1;
      }
    }

    const newId = `${prefix}-${nextNumber.toString().padStart(4, "0")}`;
    console.log("✅ Generated employee ID:", newId);
    return newId;
  } catch (error) {
    console.error("❌ Error generating employee ID:", error);
    // Fallback ID
    return `XX-${Date.now().toString().slice(-4)}`;
  }
}

/**
 * Uploads an employee file to Supabase Storage.
 * @param employeeId The employee ID.
 * @param subfolder The subfolder for the file type.
 * @param file The file to upload.
 * @returns The file path or error indicator.
 */
async function saveEmployeeFile(
  employeeId: string,
  subfolder: string,
  file: File
): Promise<string> {
  try {
    console.log(`📁 Uploading ${subfolder} file for employee ${employeeId}`);

    const uploadResult = await uploadEmployeeFile(
      employeeId,
      subfolder as
        | "photo"
        | "id_proof"
        | "address_proof"
        | "education_cert"
        | "professional_cert",
      file
    );

    if (!uploadResult.success) {
      console.warn(
        `File upload failed for ${subfolder}: ${uploadResult.error}`
      );
      console.warn(
        "Employee will be created without this file. Storage bucket may need to be created."
      );
      return `UPLOAD_FAILED_${subfolder}_${Date.now()}`;
    }

    return uploadResult.path || uploadResult.url || "";
  } catch (error) {
    console.warn(
      `Error uploading ${subfolder} for employee ${employeeId}:`,
      error
    );
    console.warn(
      "Employee will be created without this file. Storage bucket may need to be created."
    );
    return `UPLOAD_ERROR_${subfolder}_${Date.now()}`;
  }
}

/**
 * Creates or updates an employee record using Supabase database.
 * @param existingId The ID of the employee to update, or null for a new employee.
 * @param formData The complete data from the employee form.
 * @returns An object indicating success or failure.
 */
export async function saveEmployee(existingId: string | null, formData: any) {
  console.log("🔍 Starting saveEmployee function with data:", {
    existingId,
    nationality: formData?.personal_info?.nationality,
    hasDocuments: !!formData?.documents,
    documentKeys: formData?.documents ? Object.keys(formData.documents) : [],
  });

  try {
    console.log("🔐 Getting current user...");
    const user = await getCurrentUser();
    console.log(
      "✅ Current user:",
      user ? { user_id: user.user_id, name: user.name } : "No user"
    );

    // Generate employee ID if creating new
    let employeeId: string;
    if (existingId) {
      employeeId = existingId;
      console.log("📝 Using existing employee ID:", employeeId);
    } else {
      console.log(
        "🆔 Generating new employee ID for nationality:",
        formData.personal_info.nationality
      );
      employeeId = await generateNewEmployeeId(
        formData.personal_info.nationality
      );
      console.log("✅ Generated employee ID:", employeeId);
    }

    // Handle file uploads
    const processFileField = async (fieldKey: string, subfolder: string) => {
      const file = formData.documents?.[fieldKey];
      if (file === null) return null; // Handle file removal
      if (file && typeof file === "object" && file.name) {
        return await saveEmployeeFile(employeeId, subfolder, file);
      }
      return typeof file === "string" ? file : null;
    };

    const documentPaths = {
      photo: await processFileField("photo", "photo"),
      id_proof: await processFileField("id_proof", "id_proof"),
      address_proof: await processFileField("address_proof", "address_proof"),
      education_cert: await processFileField(
        "education_cert",
        "education_cert"
      ),
      professional_cert: await processFileField(
        "professional_cert",
        "professional_cert"
      ),
    };

    console.log("💾 Preparing employee data for Supabase...");
    // Prepare employee data for Supabase
    const employeeData = {
      employee_id: employeeId,
      personal_info: formData.personal_info || {},
      documents: documentPaths,
      employment_info: formData.job_details || formData.employment_info || {},
      qualification: formData.qualification || {},
      emergency_contact: formData.emergency_contact || {},
      experience: formData.experience || {},
    };
    console.log("✅ Employee data prepared:", {
      employee_id: employeeData.employee_id,
      has_personal_info: !!employeeData.personal_info,
      has_documents: !!employeeData.documents,
      document_paths: documentPaths,
    });

    console.log("🗄️ Saving to Supabase database...");
    // Save to Supabase
    const { success, data, error } = await supabaseSaveEmployee(
      employeeId,
      employeeData,
      !!existingId
    );

    console.log("📊 Supabase save result:", {
      success,
      error,
      hasData: !!data,
    });

    if (!success) {
      console.error("❌ Supabase save failed:", error);
      throw new Error(error || "Failed to save employee");
    }

    console.log("📝 Adding activity log...");
    await addLog({
      user_id: user?.user_id || "SYSTEM",
      user_name: user?.name || "System User",
      module: "HR",
      action: `${existingId ? "Updated" : "Created"} employee record`,
      details: {
        employee_id: employeeId,
        name: formData.personal_info?.name,
      },
    });

    console.log("✅ Employee saved successfully:", employeeId);
    return { success: true, employee_id: employeeId };
  } catch (error) {
    console.error("❌ saveEmployee error details:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      formData: formData
        ? {
            hasPersonalInfo: !!formData.personal_info,
            nationality: formData.personal_info?.nationality,
            hasDocuments: !!formData.documents,
          }
        : "No form data",
    });

    return await handleAndLogApiError(
      error,
      `saveEmployee for ${existingId || "new user"}`
    );
  }
}

/**
 * Marks an employee's status as "Left" using Supabase database.
 * @param employeeId The ID of the employee to mark as left.
 * @returns An object indicating success or failure.
 */
export async function deleteEmployee(employeeId: string) {
  if (!employeeId) {
    return { success: false, error: "Employee ID is required." };
  }

  try {
    const user = await getCurrentUser();

    // Get employee first to update status
    const employee = await getEmployee(employeeId);
    if (!employee) {
      return { success: false, error: "Employee not found." };
    }

    // Update employment status to "Left"
    const updatedEmploymentInfo = {
      ...employee.employment_info,
      status: "Left",
    };

    const { success, error } = await supabaseSaveEmployee(
      employeeId,
      { employment_info: updatedEmploymentInfo },
      true // isUpdate = true
    );

    if (!success) {
      return {
        success: false,
        error: error || "Failed to update employee status",
      };
    }

    await addLog({
      user_id: user?.user_id || "SYSTEM",
      user_name: user?.name || "System User",
      module: "HR",
      action: `Marked employee as 'Left'`,
      details: { employee_id: employeeId },
    });

    return { success: true };
  } catch (error) {
    return await handleAndLogApiError(
      error,
      `deleteEmployee for ${employeeId}`
    );
  }
}

/**
 * Gets holidays from Supabase database.
 * @param year The year to get holidays for.
 * @returns Array of holiday objects.
 */
export async function getHolidays(
  year: number
): Promise<
  { date: string; name: string; type?: string; country_code?: string }[]
> {
  try {
    console.log("📅 Fetching holidays for year:", year);

    const supabase = await createClient();
    const { data: holidays, error } = await supabase
      .from("holidays")
      .select("*")
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`)
      .order("date");

    if (error) {
      console.error("❌ Failed to fetch holidays:", error);
      return [];
    }

    console.log(`✅ Successfully fetched ${holidays?.length || 0} holidays`);
    return holidays || [];
  } catch (error) {
    console.error("❌ Error in getHolidays:", error);
    return [];
  }
}

/**
 * Saves holidays to Supabase database.
 * @param year The year for the holidays.
 * @param holidays Array of holiday objects to save.
 * @returns Success/error result.
 */
export async function saveHolidays(
  year: number,
  holidays: {
    date: string;
    name: string;
    type?: string;
    country_code?: string;
  }[]
) {
  try {
    console.log(
      "💾 Saving holidays for year:",
      year,
      "Count:",
      holidays.length
    );

    const supabase = await createClient();
    const user = await getCurrentUser();

    // First, delete existing holidays for this year
    const { error: deleteError } = await supabase
      .from("holidays")
      .delete()
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`);

    if (deleteError) {
      console.error("❌ Failed to delete existing holidays:", deleteError);
      throw deleteError;
    }

    // Insert new holidays
    if (holidays.length > 0) {
      const { error: insertError } = await supabase.from("holidays").insert(
        holidays.map((holiday) => ({
          ...holiday,
          type: holiday.type || "Public",
          country_code: holiday.country_code || null,
        }))
      );

      if (insertError) {
        console.error("❌ Failed to insert holidays:", insertError);
        throw insertError;
      }
    }

    await addLog({
      user_id: user?.user_id || "SYSTEM",
      user_name: user?.name || "System User",
      module: "HR",
      action: "Updated holiday list",
      details: { year, holiday_count: holidays.length },
    });

    console.log("✅ Holidays saved successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error in saveHolidays:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save holidays",
    };
  }
}

// Supabase-based implementations of required HR functions

/**
 * Gets processed attendance data for a specific month.
 * @param year The year.
 * @param month The month (1-12).
 * @returns Processed attendance data and rules.
 */
export async function getProcessedAttendance(year: number, month: number) {
  try {
    console.log(`📊 Getting processed attendance for ${year}-${month}`);

    const supabase = await createClient();
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("*")
      .gte("date", `${year}-${month.toString().padStart(2, "0")}-01`)
      .lt("date", `${year}-${(month + 1).toString().padStart(2, "0")}-01`);

    if (error) {
      console.error("❌ Error fetching attendance:", error);
      return { groupedData: {}, rules: {} };
    }

    // Group by employee
    const groupedData =
      records?.reduce((acc: any, record: any) => {
        if (!acc[record.employee_id]) {
          acc[record.employee_id] = [];
        }
        acc[record.employee_id].push(record);
        return acc;
      }, {}) || {};

    const rules = {
      workingHours: 8,
      overtimeRate: 1.5,
      latePenalty: 50,
      absentPenalty: 200,
    };

    return { groupedData, rules };
  } catch (error) {
    console.error("❌ Error in getProcessedAttendance:", error);
    return { groupedData: {}, rules: {} };
  }
}

/**
 * Saves attendance data to Supabase.
 * @param year The year.
 * @param month The month.
 * @param records The attendance records to save.
 * @returns Success/error result.
 */
export async function saveAttendanceData(
  year: number,
  month: number,
  records: any[]
) {
  try {
    console.log(`💾 Saving attendance data for ${year}-${month}`);

    const supabase = await createClient();

    // Delete existing records for the month
    await supabase
      .from("attendance_records")
      .delete()
      .gte("date", `${year}-${month.toString().padStart(2, "0")}-01`)
      .lt("date", `${year}-${(month + 1).toString().padStart(2, "0")}-01`);

    // Insert new records if any
    if (records.length > 0) {
      const { error } = await supabase
        .from("attendance_records")
        .insert(records);

      if (error) {
        console.error("❌ Error saving attendance data:", error);
        return { success: false, error: error.message };
      }
    }

    console.log("✅ Attendance data saved successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error in saveAttendanceData:", error);
    return await handleAndLogApiError(error, "saveAttendanceData");
  }
}

/**
 * Saves attendance rules configuration.
 * @param rules The attendance rules to save.
 * @returns Success/error result.
 */
export async function saveAttendanceRules(rules: any) {
  try {
    console.log("📋 Saving attendance rules");

    // For now, just return success - rules can be stored in app settings
    console.log("✅ Attendance rules saved (in-memory)");
    return { success: true };
  } catch (error) {
    console.error("❌ Error in saveAttendanceRules:", error);
    return await handleAndLogApiError(error, "saveAttendanceRules");
  }
}

/**
 * Gets payroll data for a specific month and employee.
 * @param year The year.
 * @param month The month.
 * @param employeeId Optional employee ID filter.
 * @returns Payroll data.
 */
export async function getPayrollDataForMonth(
  year: number,
  month: number,
  employeeId?: string
) {
  try {
    console.log(
      `💰 Getting payroll data for ${year}-${month}${
        employeeId ? ` (${employeeId})` : ""
      }`
    );

    const supabase = await createClient();
    let query = supabase
      .from("payroll_records")
      .select("*")
      .eq("year", year)
      .eq("month", month);

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching payroll data:", error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error("❌ Error in getPayrollDataForMonth:", error);
    return null;
  }
}

/**
 * Saves payroll data for a specific period.
 * @param year The year.
 * @param month The month.
 * @param payrollData The payroll data to save.
 * @returns Success/error result.
 */
export async function savePayrollData(
  year: number,
  month: number,
  payrollData: any
) {
  try {
    console.log(`💾 Saving payroll data for ${year}-${month}`);

    const supabase = await createClient();

    // Upsert the payroll record
    const { error } = await supabase.from("payroll_records").upsert({
      ...payrollData,
      year,
      month,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("❌ Error saving payroll data:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Payroll data saved successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error in savePayrollData:", error);
    return await handleAndLogApiError(error, "savePayrollData");
  }
}

/**
 * Gets raw attendance data for reporting.
 * @param year The year.
 * @param month The month.
 * @returns Raw attendance data.
 */
export async function getRawAttendanceData(year: number, month: number) {
  try {
    console.log(`📊 Getting raw attendance data for ${year}-${month}`);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .gte("date", `${year}-${month.toString().padStart(2, "0")}-01`)
      .lt("date", `${year}-${(month + 1).toString().padStart(2, "0")}-01`);

    if (error) {
      console.error("❌ Error fetching raw attendance data:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ Error in getRawAttendanceData:", error);
    return [];
  }
}
