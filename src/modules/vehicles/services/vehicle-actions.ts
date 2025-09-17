"use server";

import type { VehicleRecord } from "@/app/(dashboard)/purchase/page";
import {
  deleteVehicle as supabaseDeleteVehicle,
  getVehicle as supabaseGetVehicle,
  getVehicles as supabaseGetVehicles,
  saveVehicle as supabaseSaveVehicle,
} from "@/lib/supabase-operations";
import fs from "node:fs/promises";
import path from "node:path";
import { addLog } from "../../admin/services/admin-actions";
import { getCurrentUser } from "../../auth/services/supabase-auth-actions";
import { saveOfficeTransaction } from "../../finance/services/finance-actions";
import {
  getPayrollDataForMonth,
  savePayrollData,
} from "../../hr/services/hr-actions";
import {
  getPayrollMonthYearForDate,
  handleAndLogApiError,
} from "../../shared/utils/utils";

const uploadsDir = path.join(process.cwd(), "public", "uploads", "vehicles");

/**
 * Ensures that a folder name is safe (only allows alphanumeric, underscore, hyphen).
 * @param name Folder name to validate.
 * @returns true if name is safe; false otherwise.
 */
function isSafeFolderName(name: string): boolean {
  // Only allow A-Z, a-z, 0-9, underscore, hyphen. No path separators!
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Ensures a directory exists, silently continuing if it's already there.
 * @param dirPath The path to the directory.
 * @param rootDir Optional root directory for security validation.
 */
async function ensureDirectoryExists(dirPath: string, rootDir?: string) {
  const resolvedDirPath = path.resolve(dirPath);

  // If rootDir is provided, validate the path is within it
  if (rootDir) {
    const resolvedRootDir = path.resolve(rootDir);
    if (!resolvedDirPath.startsWith(resolvedRootDir + path.sep)) {
      throw new Error(
        "Unsafe directory path detected: Refusing to create directory outside upload directory."
      );
    }
  }

  try {
    await fs.access(resolvedDirPath);
  } catch {
    await fs.mkdir(resolvedDirPath, { recursive: true });
  }
}

/**
 * Saves a file to a specific subfolder within a vehicle's upload directory.
 * @param originalLicensePlate The vehicle's permanent ID, used as the main folder name.
 * @param subfolder The subfolder for organization (e.g., 'seller_ID', 'vehicle_images').
 * @param file The file object to save.
 * @returns The public URL path to the saved file.
 */
async function saveFile(
  originalLicensePlate: string,
  subfolder: string,
  file: File
): Promise<string> {
  if (!isSafeFolderName(originalLicensePlate)) {
    throw new Error(
      "Invalid originalLicensePlate: must be alphanumeric, underscore, or hyphen only."
    );
  }
  if (!isSafeFolderName(subfolder)) {
    throw new Error(
      "Invalid subfolder: must be alphanumeric, underscore, or hyphen only."
    );
  }
  const vehicleUploadsDir = path.join(
    uploadsDir,
    originalLicensePlate,
    subfolder
  );
  await ensureDirectoryExists(vehicleUploadsDir, uploadsDir);

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
  const uniqueFileName = `${Date.now()}-${sanitizedFileName}`;
  const filePath = path.join(vehicleUploadsDir, uniqueFileName);

  // Ensure filePath stays strictly within the uploadsDir root
  const resolvedFilePath = path.resolve(filePath);
  const resolvedUploadsDir = path.resolve(uploadsDir);
  if (!resolvedFilePath.startsWith(resolvedUploadsDir + path.sep)) {
    throw new Error(
      "Unsafe file path detected: Refusing write outside upload directory."
    );
  }
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(resolvedFilePath, fileBuffer);

  // Return the public URL path, which is directly usable in <img> src or <a> href
  return `/uploads/vehicles/${originalLicensePlate}/${subfolder}/${uniqueFileName}`;
}

/**
 * Saves a maintenance invoice file to its designated folder.
 * @param licensePlate The vehicle's license plate.
 * @param file The invoice file to save.
 * @returns The public URL path to the saved file.
 */
export async function saveMaintenanceFile(
  licensePlate: string,
  file: File
): Promise<string> {
  return saveFile(licensePlate, "maintenance_doc", file);
}

/**
 * Saves a financial transaction document to its designated folder based on type.
 * @param licensePlate The vehicle's license plate.
 * @param transactionType The type of transaction ('income' or 'expense').
 * @param file The document file to save.
 * @returns The public URL path to the saved file.
 */
async function saveTransactionFile(
  licensePlate: string,
  transactionType: "income" | "expense",
  file: File
): Promise<string> {
  const subfolder = transactionType === "income" ? "income_doc" : "expense_doc";
  return saveFile(licensePlate, subfolder, file);
}

/**
 * Reads all individual vehicle JSON files from the database/vehicles directory
 * and compiles them into a single array. This is now the single source of truth.
 * @returns A promise that resolves to an array of all vehicle records.
 */
export async function getAllVehicles(): Promise<VehicleRecord[]> {
  const { success, data } = await supabaseGetVehicles();
  return success ? data : [];
}

/**
 * Reads a single vehicle's JSON file from the database.
 * The filename is the unique, original license plate (the permanent ID).
 * @param vehicleId The permanent ID (original license plate) of the vehicle to retrieve.
 * @returns The vehicle record object, or null if not found.
 */
export async function getVehicle(
  vehicleId: string
): Promise<VehicleRecord | null> {
  if (!vehicleId) return null;
  const { success, data } = await supabaseGetVehicle(vehicleId);
  return success ? data : null;
}

/**
 * Creates or updates a vehicle record, including handling all file uploads and data sync.
 * @param permanentId The primary, unchanging key for the vehicle file (the original license plate).
 * @param formData The complete data for the vehicle, which might include purchase, maintenance, or sale info.
 * @param isEditing A boolean flag to indicate if this is an update to an existing record.
 * @returns An object indicating success or failure.
 */
export async function saveVehicle(
  permanentId: string,
  formData: any,
  isEditing: boolean = false
) {
  // For office transactions, keep legacy logic
  if (permanentId === "Office" && formData.financial_record) {
    return saveOfficeTransaction(formData.financial_record);
  }

  // Handle financial record updates
  if (formData.financial_record) {
    try {
      const vehicleResult = await supabaseGetVehicle(permanentId);
      if (!vehicleResult.success || !vehicleResult.data) {
        return { success: false, error: "Vehicle not found" };
      }

      const vehicle = vehicleResult.data;
      const financialHistory = vehicle.financial_history || [];
      const editingId = formData.editing_financial_id;

      if (editingId) {
        // Update existing record
        const recordIndex = financialHistory.findIndex(
          (record: any) => record.transaction_id === editingId
        );
        if (recordIndex !== -1) {
          financialHistory[recordIndex] = {
            ...formData.financial_record,
            transaction_id: editingId,
          };
        }
      } else {
        // Add new record
        const newRecord = {
          ...formData.financial_record,
          transaction_id: `TX-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
        };
        financialHistory.push(newRecord);
      }

      // Update vehicle with new financial history
      const updateResult = await supabaseSaveVehicle(
        permanentId,
        { financial_history: financialHistory },
        true
      );

      return updateResult.success
        ? { success: true, id: updateResult.data?.id }
        : { success: false, error: updateResult.error };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Handle maintenance record updates
  if (formData.maintenance_record) {
    try {
      const vehicleResult = await supabaseGetVehicle(permanentId);
      if (!vehicleResult.success || !vehicleResult.data) {
        return { success: false, error: "Vehicle not found" };
      }

      const vehicle = vehicleResult.data;
      const maintenanceHistory = vehicle.maintenance_history || [];
      const editingId = formData.editing_maintenance_id;

      if (editingId) {
        // Update existing record
        const recordIndex = maintenanceHistory.findIndex(
          (record: any) => record.maintenance_id === editingId
        );
        if (recordIndex !== -1) {
          maintenanceHistory[recordIndex] = {
            ...formData.maintenance_record,
            maintenance_id: editingId,
          };
        }
      } else {
        // Add new record
        const newRecord = {
          ...formData.maintenance_record,
          maintenance_id: `MNT-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
        };
        maintenanceHistory.push(newRecord);
      }

      // Update vehicle with new maintenance history
      const updateResult = await supabaseSaveVehicle(
        permanentId,
        { maintenance_history: maintenanceHistory },
        true
      );

      return updateResult.success
        ? { success: true, id: updateResult.data?.id }
        : { success: false, error: updateResult.error };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // For regular vehicle data updates
  const { success, data, error } = await supabaseSaveVehicle(
    permanentId,
    formData,
    isEditing
  );

  return success ? { success: true, id: data?.id } : { success: false, error };
}

/**
 * Deletes a vehicle's JSON data file and its entire associated uploads directory.
 * @param permanentId The permanent ID (original license plate) of the vehicle to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteVehicle(permanentId: string) {
  if (!permanentId) {
    return {
      success: false,
      error: "Permanent ID is required to delete vehicle data.",
    };
  }
  const { success, error } = await supabaseDeleteVehicle(permanentId);
  if (success) {
    return { success: true };
  } else {
    return { success: false, error };
  }
}

/**
 * Saves a bonus related to a vehicle visit. Writes to both the employee's payroll file
 * and the vehicle's own history file.
 */
export async function saveVehicleBonus(bonusData: {
  employee_ids: string[];
  amount: number;
  date: string;
  remarks: string;
  visit_type: string;
  license_plate: string; // This is the original license plate (vehicle permanent ID)
  manualVehicleNumber?: string;
}) {
  const {
    employee_ids,
    license_plate,
    manualVehicleNumber,
    visit_type,
    amount,
    date,
    remarks,
  } = bonusData;
  const user = await getCurrentUser();

  try {
    const finalVehicleIdentifier =
      license_plate === "No Booking"
        ? manualVehicleNumber || "No Booking"
        : license_plate;

    const { payrollYear, payrollMonth } = getPayrollMonthYearForDate(
      new Date(date)
    );

    // Step 1: Update each employee's payroll file
    for (const employeeId of employee_ids) {
      const newBonusRecord = {
        id: `BON-${Date.now()}-${employeeId.slice(-4)}`,
        employee_id: employeeId,
        type: "Bonus" as const,
        amount: amount,
        date: date,
        remarks:
          `Vehicle visit bonus: ${visit_type} for ${finalVehicleIdentifier}. ${
            remarks || ""
          }`.trim(),
        visit_type: visit_type,
        license_plate: license_plate,
      };

      let payrollFile = (await getPayrollDataForMonth(
        payrollYear,
        payrollMonth,
        employeeId
      )) || {
        employee_id: employeeId,
        month: `${String(payrollMonth).padStart(2, "0")}${payrollYear}`,
      };

      if (!payrollFile.employee_financial_history) {
        payrollFile.employee_financial_history = [];
      }
      payrollFile.employee_financial_history.push(newBonusRecord);

      await savePayrollData(payrollYear, payrollMonth, payrollFile);
    }

    // Step 2: If linked to a vehicle, update the vehicle's bonus history
    if (license_plate !== "No Booking") {
      const vehicle = await getVehicle(license_plate);
      if (vehicle) {
        if (!vehicle.bonus_history) {
          vehicle.bonus_history = [];
        }
        for (const employeeId of employee_ids) {
          vehicle.bonus_history.push({
            id: `BON-${Date.now()}-${employeeId.slice(-4)}`, // A unique ID for this entry
            employee_id: employeeId,
            type: "Bonus",
            amount: amount,
            date: date,
            remarks: `Vehicle visit bonus: ${visit_type}. ${
              remarks || ""
            }`.trim(),
            visit_type: visit_type,
            license_plate: license_plate,
          });
        }
        await saveVehicle(vehicle.id, vehicle, true);
      }
    }

    await addLog({
      user_id: user?.user_id || "SYSTEM",
      user_name: user?.name || "System User",
      module: "Purchase",
      action: `Recorded vehicle visit bonus for ${finalVehicleIdentifier}`,
      details: { employees: employee_ids.length, amount_per_employee: amount },
    });

    return { success: true };
  } catch (error) {
    return await handleAndLogApiError(
      error,
      `saveVehicleBonus for vehicle ${license_plate}`
    );
  }
}

/**
 * Deletes a bonus record from both the vehicle and employee payroll files.
 */
export async function deleteVehicleBonus(
  bonusId: string,
  vehicleId: string | null
) {
  const user = await getCurrentUser();
  if (!bonusId) {
    return { success: false, error: "Bonus ID is required." };
  }

  try {
    let bonusToDelete: any = null;

    // Find the bonus in all payroll files to get its details
    const payrollDataDir = path.join(
      process.cwd(),
      "database",
      "hr",
      "payroll_data"
    );
    const monthDirs = await fs.readdir(payrollDataDir);

    for (const monthDir of monthDirs) {
      const employeeFilesPath = path.join(payrollDataDir, monthDir);
      try {
        const stats = await fs.stat(employeeFilesPath);
        if (!stats.isDirectory()) continue;
        const employeeFiles = await fs.readdir(employeeFilesPath);
        for (const employeeFile of employeeFiles) {
          const payrollFilePath = path.join(
            payrollDataDir,
            monthDir,
            employeeFile
          );
          const fileContent = await fs.readFile(payrollFilePath, "utf-8");
          const payrollData = JSON.parse(fileContent);
          const foundBonus = (
            payrollData.employee_financial_history || []
          ).find((b: any) => b.id === bonusId);
          if (foundBonus) {
            bonusToDelete = foundBonus;
            break;
          }
        }
      } catch {}
      if (bonusToDelete) break;
    }

    if (!bonusToDelete) {
      return {
        success: false,
        error: `Bonus with ID ${bonusId} could not be located.`,
      };
    }

    // 1. Remove from Payroll file
    const { payrollYear, payrollMonth } = getPayrollMonthYearForDate(
      new Date(bonusToDelete.date)
    );
    let payrollFile = await getPayrollDataForMonth(
      payrollYear,
      payrollMonth,
      bonusToDelete.employee_id
    );
    if (payrollFile && payrollFile.employee_financial_history) {
      payrollFile.employee_financial_history =
        payrollFile.employee_financial_history.filter(
          (b: any) => b.id !== bonusId
        );
      await savePayrollData(payrollYear, payrollMonth, payrollFile);
    }

    // 2. Remove from Vehicle file if vehicleId is provided
    if (vehicleId) {
      const vehicle = await getVehicle(vehicleId);
      if (vehicle && vehicle.bonus_history) {
        vehicle.bonus_history = vehicle.bonus_history.filter(
          (b) => b.id !== bonusId
        );
        await saveVehicle(vehicle.id, vehicle, true);
      }
    }

    await addLog({
      user_id: user?.user_id || "SYSTEM",
      user_name: user?.name || "System User",
      module: "Purchase",
      action: `Deleted vehicle bonus`,
      details: { bonus_id: bonusId, vehicle_id: vehicleId },
    });

    return { success: true };
  } catch (error) {
    return handleAndLogApiError(error, `deleteVehicleBonus for ID ${bonusId}`);
  }
}
