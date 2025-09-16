
'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';
import { handleAndLogApiError, generateNewId, getPayrollMonthYearForDate } from './utils';
import { getPayrollDataForMonth, savePayrollData } from './hr-actions';
import { getCurrentUser } from './auth-actions';
import { addLog } from './admin-actions';
import { saveOfficeTransaction } from './finance-actions';


const vehiclesDbDir = path.join(process.cwd(), 'database', 'vehicles');
const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'vehicles');

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
            throw new Error('Unsafe directory path detected: Refusing to create directory outside upload directory.');
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
async function saveFile(originalLicensePlate: string, subfolder: string, file: File): Promise<string> {
    if (!isSafeFolderName(originalLicensePlate)) {
        throw new Error('Invalid originalLicensePlate: must be alphanumeric, underscore, or hyphen only.');
    }
    if (!isSafeFolderName(subfolder)) {
        throw new Error('Invalid subfolder: must be alphanumeric, underscore, or hyphen only.');
    }
    const vehicleUploadsDir = path.join(uploadsDir, originalLicensePlate, subfolder);
    await ensureDirectoryExists(vehicleUploadsDir, uploadsDir);

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const uniqueFileName = `${Date.now()}-${sanitizedFileName}`;
    const filePath = path.join(vehicleUploadsDir, uniqueFileName);
    
    // Ensure filePath stays strictly within the uploadsDir root
    const resolvedFilePath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    if (!resolvedFilePath.startsWith(resolvedUploadsDir + path.sep)) {
        throw new Error('Unsafe file path detected: Refusing write outside upload directory.');
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
export async function saveMaintenanceFile(licensePlate: string, file: File): Promise<string> {
    return saveFile(licensePlate, 'maintenance_doc', file);
}

/**
 * Saves a financial transaction document to its designated folder based on type.
 * @param licensePlate The vehicle's license plate.
 * @param transactionType The type of transaction ('income' or 'expense').
 * @param file The document file to save.
 * @returns The public URL path to the saved file.
 */
async function saveTransactionFile(licensePlate: string, transactionType: 'income' | 'expense', file: File): Promise<string> {
    const subfolder = transactionType === 'income' ? 'income_doc' : 'expense_doc';
    return saveFile(licensePlate, subfolder, file);
}


/**
 * Reads all individual vehicle JSON files from the database/vehicles directory
 * and compiles them into a single array. This is now the single source of truth.
 * @returns A promise that resolves to an array of all vehicle records.
 */
export async function getAllVehicles(): Promise<VehicleRecord[]> {
    await ensureDirectoryExists(vehiclesDbDir);
    try {
        const files = await fs.readdir(vehiclesDbDir);
        const allVehicles: VehicleRecord[] = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(vehiclesDbDir, file);
                try {
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    allVehicles.push(JSON.parse(fileContent));
                } catch (readError) {
                    console.error(`Failed to read or parse ${file}:`, readError);
                }
            }
        }
        return allVehicles;
    } catch (error) {
        console.error('Failed to read vehicles directory:', error);
        return [];
    }
}

/**
 * Reads a single vehicle's JSON file from the database.
 * The filename is the unique, original license plate (the permanent ID).
 * @param vehicleId The permanent ID (original license plate) of the vehicle to retrieve.
 * @returns The vehicle record object, or null if not found.
 */
export async function getVehicle(vehicleId: string): Promise<VehicleRecord | null> {
    if (!vehicleId) return null;
    await ensureDirectoryExists(vehiclesDbDir);
    const filePath = path.resolve(vehiclesDbDir, `${vehicleId}.json`);
    // Ensure filePath stays within vehiclesDbDir to prevent path traversal
    const vehiclesDbDirWithSep = vehiclesDbDir.endsWith(path.sep) ? vehiclesDbDir : vehiclesDbDir + path.sep;
    if (!filePath.startsWith(vehiclesDbDirWithSep)) {
        return null;
    }
    try {
        await fs.access(filePath);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        // If file doesn't exist or other error, return null
        return null;
    }
}


/**
 * Creates or updates a vehicle record, including handling all file uploads and data sync.
 * @param permanentId The primary, unchanging key for the vehicle file (the original license plate).
 * @param formData The complete data for the vehicle, which might include purchase, maintenance, or sale info.
 * @param isEditing A boolean flag to indicate if this is an update to an existing record.
 * @returns An object indicating success or failure.
 */
export async function saveVehicle(permanentId: string, formData: any, isEditing: boolean) {
    if (!permanentId) {
        return { success: false, error: "Permanent vehicle ID (original license plate) is required." };
    }
    
    // Handle office transactions separately before proceeding
    if (permanentId === 'Office' && formData.financial_record) {
        return saveOfficeTransaction(formData.financial_record);
    }

    const filePath = path.resolve(vehiclesDbDir, `${permanentId}.json`);
    // Ensure filePath stays within vehiclesDbDir to prevent path traversal
    const vehiclesDbDirWithSep = vehiclesDbDir.endsWith(path.sep) ? vehiclesDbDir : vehiclesDbDir + path.sep;
    if (!filePath.startsWith(vehiclesDbDirWithSep)) {
        return { success: false, error: "Invalid vehicle ID." };
    }
    try {
        const user = await getCurrentUser();
        await ensureDirectoryExists(vehiclesDbDir);
        let existingRecord = await getVehicle(permanentId);
        
        let finalRecord: any = { ...(existingRecord || {}) };
        
        let logAction = '';
        let logModule = 'Purchase';

        // Handle file uploads for new/updated purchases
        if (formData.previousLicensePlate) { 
             logAction = existingRecord 
                ? `Updated purchase details for vehicle ${permanentId}.` 
                : `Created new vehicle record for ${permanentId}.`;

             const processPurchaseFile = async (fieldKey: keyof typeof formData, subfolder: string) => {
                const file = formData[fieldKey];
                if (file && typeof file === 'object' && file.name) {
                    return await saveFile(permanentId, subfolder, file as unknown as File);
                }
                return typeof file === 'string' ? file : existingRecord?.fullData?.[fieldKey] || null;
            };

            const processPurchaseFileArray = async (fieldKey: keyof typeof formData, subfolder: string) => {
                const files = formData[fieldKey];
                if (Array.isArray(files)) {
                    return await Promise.all(
                        files.map(async (file: any) => {
                            if (file && typeof file === 'object' && file.name) {
                                return await saveFile(permanentId, subfolder, file as unknown as File);
                            }
                            return file;
                        })
                    );
                }
                return files || existingRecord?.fullData?.[fieldKey] || [];
            };
            
            formData.sellerIdCard = await processPurchaseFile('sellerIdCard', 'seller_ID');
            formData.freelancerIdProof = await processPurchaseFile('freelancerIdProof', 'freelancer_ID');
            formData.insuranceDoc = await processPurchaseFile('insuranceDoc', 'insurance_tax');
            formData.taxDoc = await processPurchaseFile('taxDoc', 'insurance_tax');
            formData.mainImage = await processPurchaseFile('mainImage', 'vehicle_images');
            formData.additionalImages = await processPurchaseFileArray('additionalImages', 'vehicle_images');

            // When editing, we only update purchase-specific data, preserving other histories
            if (isEditing && existingRecord) {
                finalRecord.fullData = { ...existingRecord.fullData, ...formData, previousLicensePlate: permanentId };
                finalRecord.vehicle = `${formData.otherBrand || formData.brand} ${formData.otherModel || formData.model}`;
                finalRecord.date = formData.invoiceDate;
                finalRecord.seller = formData.sellerName;
                finalRecord.purchasePrice = `฿${(formData.vehiclePrice || 0).toLocaleString()}`;
                finalRecord.finalPrice = `฿${(formData.grandTotal || 0).toLocaleString()}`;
                finalRecord.paymentType = formData.paymentType;
                finalRecord.status = formData.status;
            } else {
                 finalRecord = {
                    id: permanentId, // The permanent ID is the original license plate
                    license_plate: permanentId,
                    vehicle: `${formData.otherBrand || formData.brand} ${formData.otherModel || formData.model}`,
                    date: formData.invoiceDate,
                    seller: formData.sellerName,
                    purchasePrice: `฿${(formData.vehiclePrice || 0).toLocaleString()}`,
                    finalPrice: `฿${(formData.grandTotal || 0).toLocaleString()}`,
                    paymentType: formData.paymentType,
                    status: formData.status,
                    fullData: { ...formData, previousLicensePlate: permanentId },
                    maintenance_history: finalRecord.maintenance_history || [],
                    financial_history: finalRecord.financial_history || [],
                    bonus_history: finalRecord.bonus_history || [],
                    licence_history: finalRecord.licence_history || [],
                };
            }
        }

        // Handle maintenance record update
        if (formData.maintenance_record) {
            logModule = 'Maintenance';
            const maintenanceRecord = formData.maintenance_record;
            let invoiceFilePath = maintenanceRecord.invoiceFile;
            if (maintenanceRecord.invoiceFile && typeof maintenanceRecord.invoiceFile === 'object') {
                invoiceFilePath = await saveMaintenanceFile(permanentId, maintenanceRecord.invoiceFile as File);
            }

            const recordDataForSaving = { ...maintenanceRecord, invoiceFile: invoiceFilePath };
            
            const editingId = formData.editing_maintenance_id;
            let maintenance_history = finalRecord.maintenance_history || [];

            if (editingId) {
                logAction = `Updated maintenance record ID ${editingId} for vehicle ${permanentId}.`;
                maintenance_history = maintenance_history.map((rec: any) =>
                    rec.maintenance_id === editingId
                        ? { ...rec, ...recordDataForSaving }
                        : rec
                );
            } else {
                const allMaintRecords = (await getAllVehicles()).flatMap(v => v.maintenance_history || []);
                const newRecordId = generateNewId('MT', allMaintRecords.map(m => m.maintenance_id));
                logAction = `Added new maintenance record ID ${newRecordId} for vehicle ${permanentId}.`;
                const newRecord = { ...recordDataForSaving, maintenance_id: newRecordId };
                maintenance_history.push(newRecord);
            }
            finalRecord.maintenance_history = maintenance_history;
        }

        // Handle direct financial transaction record update
        if(formData.financial_record) {
            logModule = 'Finance';
            const financialRecord = formData.financial_record;
            let documentFilePath = financialRecord.uploaded_file;
            if (financialRecord.uploaded_file && typeof financialRecord.uploaded_file === 'object') {
                documentFilePath = await saveTransactionFile(permanentId, financialRecord.type, financialRecord.uploaded_file as File);
            }

            const recordDataForSaving = { ...financialRecord, uploaded_file: documentFilePath, license_plate: finalRecord.license_plate };
            
            const editingId = formData.editing_financial_id;
            let financial_history = finalRecord.financial_history || [];

            if(editingId) {
                logAction = `Updated financial transaction ID ${editingId} for vehicle ${permanentId}.`;
                financial_history = financial_history.map((rec: any) =>
                    rec.transaction_id === editingId
                        ? { ...rec, ...recordDataForSaving }
                        : rec
                );
            } else {
                const newRecordId = `TXN-${Date.now().toString().slice(-6)}`;
                logAction = `Added new financial transaction ID ${newRecordId} for vehicle ${permanentId}.`;
                const newRecord = { ...recordDataForSaving, transaction_id: newRecordId, currency: 'THB' };
                financial_history.push(newRecord);
            }
            finalRecord.financial_history = financial_history;
        }

        // Handle sale details update
        if (formData.sale_details) {
            logModule = 'Sales';
            logAction = `Recorded sale for vehicle ${permanentId}.`;
            const saleDetails = formData.sale_details;
            // Process buyer ID proof
            if (saleDetails.buyer?.id_proof && typeof saleDetails.buyer.id_proof === 'object') {
                saleDetails.buyer.id_proof = await saveFile(permanentId, 'buyer_ID', saleDetails.buyer.id_proof as File);
            }
            // Process freelancer commission ID proof
            if (saleDetails.freelancer_commission?.id_proof && typeof saleDetails.freelancer_commission.id_proof === 'object') {
                saleDetails.freelancer_commission.id_proof = await saveFile(permanentId, 'seller_freelancer', saleDetails.freelancer_commission.id_proof as File);
            }
            // Process other sales documents
            if (saleDetails.documents && Array.isArray(saleDetails.documents)) {
                saleDetails.documents = await Promise.all(
                    saleDetails.documents.map(async (doc: any) => {
                        if (doc && typeof doc === 'object' && doc.name) {
                            return await saveFile(permanentId, 'sales_doc', doc as File);
                        }
                        return doc;
                    })
                );
            }
            finalRecord.sale_details = saleDetails;
        }

        // Handle direct history array updates (like from delete)
        if (formData.maintenance_history) {
            finalRecord.maintenance_history = formData.maintenance_history;
        }
        if (formData.financial_history) {
            finalRecord.financial_history = formData.financial_history;
        }
        if (formData.bonus_history) {
            finalRecord.bonus_history = formData.bonus_history;
        }
        
        // Handle status update
        if (formData.status) {
            finalRecord.status = formData.status;
        }
        
        // Handle direct update of licence details to licence_history
        if (formData.licence_details) {
            logModule = 'Purchase';
            const newLicenceRecord = formData.licence_details;
            const newPlate = newLicenceRecord.newLicensePlate;
            logAction = `Updated license details for vehicle ${permanentId}. New plate: ${newPlate}.`;

            if (!finalRecord.licence_history) {
                finalRecord.licence_history = [];
            }
            
            newLicenceRecord.originalLicensePlate = permanentId;
            finalRecord.licence_history.push(newLicenceRecord);
            
            if(newLicenceRecord.price > 0) {
                 const newFinancialTx = {
                    transaction_id: `LIC-${Date.now().toString().slice(-6)}`,
                    type: 'expense',
                    category: 'License Plate Fee',
                    license_plate: finalRecord.license_plate, // Use the new plate for the record
                    amount: newLicenceRecord.price,
                    currency: 'THB',
                    date: newLicenceRecord.issueDate,
                    remarks: `New license plate registration: ${newPlate}`
                };
                if(!finalRecord.financial_history) finalRecord.financial_history = [];
                finalRecord.financial_history.push(newFinancialTx);
            }
        }


        // Write the complete record to its individual file
        await fs.writeFile(filePath, JSON.stringify(finalRecord, null, 2), 'utf-8');
        
        if (logAction) {
            await addLog({
                user_id: user?.user_id || 'SYSTEM',
                user_name: user?.name || 'System User',
                module: logModule,
                action: logAction
            });
        }
        
        return { success: true, id: finalRecord.id };

    } catch (error) {
        return await handleAndLogApiError(error, `saveVehicle for ${permanentId}`);
    }
}


/**
 * Deletes a vehicle's JSON data file and its entire associated uploads directory.
 * @param permanentId The permanent ID (original license plate) of the vehicle to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteVehicle(permanentId: string) {
    if (!permanentId) {
        return { success: false, error: "Permanent ID is required to delete vehicle data." };
    }

    // Normalize the path and ensure it stays under vehiclesDbDir
    const filePath = path.resolve(vehiclesDbDir, `${permanentId}.json`);
    if (!filePath.startsWith(vehiclesDbDir + path.sep)) {
        return { success: false, error: "Invalid permanentId: outside vehicles database directory." };
    }
    // Normalize the path and ensure it stays under uploadsDir
    const vehicleUploadsDir = path.resolve(uploadsDir, permanentId);
    if (!vehicleUploadsDir.startsWith(uploadsDir + path.sep)) {
        return { success: false, error: "Invalid permanentId: outside uploads directory." };
    }

    try {
        // Concurrently delete the data file and the uploads directory
        await Promise.all([
            fs.rm(filePath, { force: true }), // force: true prevents error if file doesn't exist
            fs.rm(vehicleUploadsDir, { recursive: true, force: true })
        ]);

        const user = await getCurrentUser();
        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'Purchase',
            action: `Deleted vehicle record ${permanentId}.`
        });

        return { success: true };
    } catch (error) {
        return await handleAndLogApiError(error, `deleteVehicle for ${permanentId}`);
    }
}

/**
 * Saves a bonus related to a vehicle visit. Writes to both the employee's payroll file
 * and the vehicle's own history file.
 */
export async function saveVehicleBonus(bonusData: {
    employee_ids: string[],
    amount: number,
    date: string,
    remarks: string,
    visit_type: string,
    license_plate: string, // This is the original license plate (vehicle permanent ID)
    manualVehicleNumber?: string
}) {
    const { employee_ids, license_plate, manualVehicleNumber, visit_type, amount, date, remarks } = bonusData;
    const user = await getCurrentUser();

    try {
        const finalVehicleIdentifier = license_plate === 'No Booking' 
            ? (manualVehicleNumber || 'No Booking') 
            : license_plate;
        
        const { payrollYear, payrollMonth } = getPayrollMonthYearForDate(new Date(date));
        
        // Step 1: Update each employee's payroll file
        for (const employeeId of employee_ids) {
            const newBonusRecord = {
                id: `BON-${Date.now()}-${employeeId.slice(-4)}`,
                employee_id: employeeId,
                type: 'Bonus' as const,
                amount: amount,
                date: date,
                remarks: `Vehicle visit bonus: ${visit_type} for ${finalVehicleIdentifier}. ${remarks || ''}`.trim(),
                visit_type: visit_type,
                license_plate: license_plate
            };

            let payrollFile = await getPayrollDataForMonth(payrollYear, payrollMonth, employeeId) || { employee_id: employeeId, month: `${String(payrollMonth).padStart(2, '0')}${payrollYear}` };

            if (!payrollFile.employee_financial_history) {
              payrollFile.employee_financial_history = [];
            }
            payrollFile.employee_financial_history.push(newBonusRecord);
            
            await savePayrollData(payrollYear, payrollMonth, payrollFile);
        }

        // Step 2: If linked to a vehicle, update the vehicle's bonus history
        if (license_plate !== 'No Booking') {
            const vehicle = await getVehicle(license_plate);
            if (vehicle) {
                if (!vehicle.bonus_history) {
                    vehicle.bonus_history = [];
                }
                for (const employeeId of employee_ids) {
                     vehicle.bonus_history.push({
                        id: `BON-${Date.now()}-${employeeId.slice(-4)}`, // A unique ID for this entry
                        employee_id: employeeId,
                        type: 'Bonus',
                        amount: amount,
                        date: date,
                        remarks: `Vehicle visit bonus: ${visit_type}. ${remarks || ''}`.trim(),
                        visit_type: visit_type,
                        license_plate: license_plate
                    });
                }
                await saveVehicle(vehicle.id, vehicle, true);
            }
        }

        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'Purchase',
            action: `Recorded vehicle visit bonus for ${finalVehicleIdentifier}`,
            details: { employees: employee_ids.length, amount_per_employee: amount }
        });

        return { success: true };
    } catch(error) {
        return await handleAndLogApiError(error, `saveVehicleBonus for vehicle ${license_plate}`);
    }
}


/**
 * Deletes a bonus record from both the vehicle and employee payroll files.
 */
export async function deleteVehicleBonus(bonusId: string, vehicleId: string | null) {
  const user = await getCurrentUser();
  if (!bonusId) {
    return { success: false, error: "Bonus ID is required." };
  }

  try {
    let bonusToDelete: any = null;
    
    // Find the bonus in all payroll files to get its details
    const payrollDataDir = path.join(process.cwd(), 'database', 'hr', 'payroll_data');
    const monthDirs = await fs.readdir(payrollDataDir);

    for (const monthDir of monthDirs) {
        const employeeFilesPath = path.join(payrollDataDir, monthDir);
        try {
            const stats = await fs.stat(employeeFilesPath);
            if (!stats.isDirectory()) continue;
            const employeeFiles = await fs.readdir(employeeFilesPath);
            for (const employeeFile of employeeFiles) {
                const payrollFilePath = path.join(payrollDataDir, monthDir, employeeFile);
                const fileContent = await fs.readFile(payrollFilePath, 'utf-8');
                const payrollData = JSON.parse(fileContent);
                const foundBonus = (payrollData.employee_financial_history || []).find((b:any) => b.id === bonusId);
                if (foundBonus) {
                    bonusToDelete = foundBonus;
                    break;
                }
            }
        } catch {}
        if(bonusToDelete) break;
    }
    
    if (!bonusToDelete) {
         return { success: false, error: `Bonus with ID ${bonusId} could not be located.` };
    }

    // 1. Remove from Payroll file
    const { payrollYear, payrollMonth } = getPayrollMonthYearForDate(new Date(bonusToDelete.date));
    let payrollFile = await getPayrollDataForMonth(payrollYear, payrollMonth, bonusToDelete.employee_id);
    if (payrollFile && payrollFile.employee_financial_history) {
      payrollFile.employee_financial_history = payrollFile.employee_financial_history.filter((b: any) => b.id !== bonusId);
      await savePayrollData(payrollYear, payrollMonth, payrollFile);
    }
    
    // 2. Remove from Vehicle file if vehicleId is provided
    if (vehicleId) {
        const vehicle = await getVehicle(vehicleId);
        if (vehicle && vehicle.bonus_history) {
            vehicle.bonus_history = vehicle.bonus_history.filter(b => b.id !== bonusId);
            await saveVehicle(vehicle.id, vehicle, true);
        }
    }

    await addLog({
      user_id: user?.user_id || 'SYSTEM',
      user_name: user?.name || 'System User',
      module: 'Purchase',
      action: `Deleted vehicle bonus`,
      details: { bonus_id: bonusId, vehicle_id: vehicleId }
    });

    return { success: true };
  } catch (error) {
    return handleAndLogApiError(error, `deleteVehicleBonus for ID ${bonusId}`);
  }
}
