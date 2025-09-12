
'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { handleAndLogApiError } from './utils';
import { getPayrollDataForMonth, savePayrollData } from './hr-actions';
import { getVehicle, saveVehicle } from './vehicle-actions';
import { addLog } from './admin-actions';
import { getCurrentUser } from './auth-actions';

/**
 * Saves a sales commission record, updating both the relevant employee payroll files
 * and the vehicle's financial history.
 * @param commissionData The commission data from the form.
 * @returns An object indicating success or failure.
 */
export async function saveSalesCommission(commissionData: {
  employee_ids: string[];
  vehicle_id: string; // This is the permanent vehicle ID (original license plate)
  commission_per_employee: number;
  total_commission: number;
  remark: string;
  date: string;
}) {
  const {
    employee_ids,
    vehicle_id,
    commission_per_employee,
    total_commission,
    remark,
    date,
  } = commissionData;

  const user = await getCurrentUser();

  try {
    // 1. Update vehicle file using the permanent ID
    const vehicle = await getVehicle(vehicle_id);
    if (!vehicle) {
      return { success: false, error: `Vehicle with ID ${vehicle_id} not found.` };
    }

    const commissionRecordId = `COMM-${Date.now()}`;

    // Also add as a financial expense to the vehicle for reporting
     if (!vehicle.financial_history) {
      vehicle.financial_history = [];
    }
    vehicle.financial_history.push({
      transaction_id: commissionRecordId, // Use same ID for linking
      type: 'expense',
      category: 'Sales Commission',
      license_plate: vehicle.license_plate, // Use the current license plate for the record
      amount: total_commission,
      currency: 'THB',
      date: date,
      remarks: `Commission for ${employee_ids.join(', ')}. ${remark}`,
    });

    await saveVehicle(vehicle.id, vehicle, true);

    // 2. Update each employee's payroll file
    const recordDate = new Date(date);
    const payrollYear = recordDate.getFullYear();
    const payrollMonth = recordDate.getMonth() + 1; // getMonth() is 0-indexed

    for (const employeeId of employee_ids) {
      const payrollRecord = await getPayrollDataForMonth(payrollYear, payrollMonth, employeeId) || { employee_id: employeeId, month: `${String(payrollMonth).padStart(2, '0')}${payrollYear}` };

      if (!payrollRecord.employee_financial_history) {
        payrollRecord.employee_financial_history = [];
      }
      // Add as a bonus/addition to the employee's payroll
      payrollRecord.employee_financial_history.push({
        id: `COMM-${Date.now()}-${employeeId.slice(-4)}`,
        type: 'Bonus',
        amount: commission_per_employee,
        date: date,
        remarks: `Sales commission for ${vehicle.vehicle}. ${remark}`,
      });

      await savePayrollData(payrollYear, payrollMonth, payrollRecord);
    }
    
    await addLog({
        user_id: user?.user_id || 'SYSTEM',
        user_name: user?.name || 'System User',
        module: 'Sales',
        action: 'Recorded sales commission',
        details: { vehicle: vehicle.vehicle, total: total_commission, employees: employee_ids.length }
    });

    return { success: true };
  } catch (error) {
    return await handleAndLogApiError(error, `saveSalesCommission for vehicle ${vehicle_id}`);
  }
}

/**
 * Deletes a sales commission record from all associated files.
 * @param transactionId The unique ID of the commission transaction.
 * @param vehicleId The permanent ID of the vehicle.
 * @returns An object indicating success or failure.
 */
export async function deleteSalesCommission(transactionId: string, vehicleId: string) {
    const user = await getCurrentUser();
    try {
        const vehicle = await getVehicle(vehicleId);
        if (!vehicle) {
            return { success: false, error: "Vehicle not found." };
        }

        const commissionTx = vehicle.financial_history?.find((tx: any) => tx.transaction_id === transactionId && tx.category === 'Sales Commission');
        if (!commissionTx) {
            return { success: false, error: "Commission transaction not found on vehicle." };
        }

        const employeeIdsMatch = commissionTx.remarks.match(/for (.*?)\./)?.[1].split(', ') || [];
        const employeeIds = employeeIdsMatch.length > 0 ? employeeIdsMatch : [];

        const commissionDate = new Date(commissionTx.date);
        const payrollYear = commissionDate.getFullYear();
        const payrollMonth = commissionDate.getMonth() + 1;

        // Remove from financial_history
        vehicle.financial_history = (vehicle.financial_history || []).filter(tx => tx.transaction_id !== transactionId);
        
        await saveVehicle(vehicle.id, vehicle, true);

        // 2. Remove from each employee's payroll
        for (const employeeId of employeeIds) {
            const payrollRecord = await getPayrollDataForMonth(payrollYear, payrollMonth, employeeId);
            if (payrollRecord && payrollRecord.employee_financial_history) {
                payrollRecord.employee_financial_history = payrollRecord.employee_financial_history.filter((adj: any) => !adj.remarks.includes(`Sales commission for ${vehicle.vehicle}`));
                await savePayrollData(payrollYear, payrollMonth, payrollRecord);
            }
        }
        
        await addLog({
            user_id: user?.user_id || 'SYSTEM',
            user_name: user?.name || 'System User',
            module: 'Sales',
            action: 'Deleted sales commission record',
            details: { vehicle: vehicle.vehicle, transactionId }
        });

        return { success: true };
    } catch (error) {
        return await handleAndLogApiError(error, `deleteSalesCommission for tx ${transactionId}`);
    }
}
