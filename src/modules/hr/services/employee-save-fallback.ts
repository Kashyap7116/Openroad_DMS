"use server";

import { saveEmployeeData } from "@/lib/hr-data-structure-manager";

// Enhanced fallback employee save function using standardized data structure
export async function saveEmployeeFallback(
  existingId: string | null,
  formData: any
) {
  try {
    // Generate employee ID if new
    const employeeId =
      existingId || formData.personal_info?.employee_id || `EMP${Date.now()}`;

    // Use the standardized data structure manager
    const result = await saveEmployeeData(employeeId, formData);

    console.log(`Employee record saved successfully: ${result.filePath}`);

    return {
      success: true,
      employee_id: employeeId,
      message: `Employee ${existingId ? "updated" : "created"} successfully`,
      filePath: result.filePath,
    };
  } catch (error) {
    console.error("Error saving employee:", error);

    return {
      success: false,
      error: `Failed to save employee: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      analysis: {
        probableCause: "File system permission issue or invalid data structure",
        suggestedSolution:
          "Check directory permissions and ensure data follows standardized format",
        errorDetails: error instanceof Error ? error.stack : "Unknown error",
      },
    };
  }
}

