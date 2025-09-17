"use server";

import type { VehicleRecord } from "@/app/(dashboard)/purchase/page";
import {
  getEmployees,
  getVehicle,
  getVehicles,
} from "@/lib/supabase-operations";
import type { Adjustment } from "../../finance/components/employee-finance-client";
import {
  getEmployeeAdjustments,
  getFinanceSummary,
} from "../../finance/services/finance-actions";
import { getRawAttendanceData } from "../../hr/services/hr-actions";

export type ReportStats = {
  totalPurchased: number;
  totalSold: number;
  totalMaintenanceCost: number;
  totalHRPayout: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
};

export type MonthlySalesData = {
  month: string;
  purchase: number;
  sales: number;
};

export type ExpenseBreakdownData = {
  name: string;
  value: number;
};

/**
 * Fetches and aggregates data from all modules to generate comprehensive report statistics.
 */
export async function getMasterReportData(): Promise<{
  stats: ReportStats;
  monthlySales: MonthlySalesData[];
  expenseBreakdown: ExpenseBreakdownData[];
  purchaseRecords: VehicleRecord[];
  maintenanceRecords: any[];
  salesRecords: VehicleRecord[];
  financeRecords: any[];
  employeeFinanceRecords: any[];
  hrRecords: any[];
  vehicles: VehicleRecord[];
}> {
  const vehiclesResult = await getVehicles();
  const employeesResult = await getEmployees();
  const financeSummary = await getFinanceSummary();
  const employeeAdjustments = await getEmployeeAdjustments();

  // Extract data from results
  const vehicles = vehiclesResult.success ? vehiclesResult.data : [];
  const allEmployees = employeesResult.success ? employeesResult.data : [];

  const { total_income, total_expenses, net_profit_loss } = financeSummary;

  const totalPurchased = vehicles.length;
  const totalSold = vehicles.filter((v: any) => v.status === "Sold").length;

  const allMaintenance = vehicles.flatMap((v: any) =>
    (v.maintenance_history || []).map((m: any) => ({
      ...m,
      vehicle: v.vehicle,
      license_plate: v.license_plate,
    }))
  );
  const totalMaintenanceCost = allMaintenance.reduce(
    (sum: number, item: any) => sum + (item.total || 0),
    0
  );

  const totalHRPayout =
    (await getEmployeeAdjustments())
      .filter((adj: any) =>
        ["Bonus", "Addition", "Employee Expense"].includes(adj.type)
      )
      .reduce((sum: number, adj: any) => sum + adj.amount, 0) +
    allEmployees.reduce(
      (sum: number, emp: any) => sum + (emp.job_details.salary || 0),
      0
    );

  const stats: ReportStats = {
    totalPurchased,
    totalSold,
    totalMaintenanceCost,
    totalHRPayout,
    totalIncome: total_income,
    totalExpense: total_expenses,
    netProfit: net_profit_loss,
  };

  // --- Prepare Chart Data ---
  const monthlySales: MonthlySalesData[] = Array.from(
    { length: 12 },
    (_, i) => ({
      month: new Date(0, i).toLocaleString("default", { month: "short" }),
      purchase: 0,
      sales: 0,
    })
  );

  vehicles.forEach((v: any) => {
    const purchaseDate = new Date(v.date);
    if (purchaseDate.getFullYear() === new Date().getFullYear()) {
      const purchaseMonth = purchaseDate.getMonth();
      monthlySales[purchaseMonth].purchase += 1;
    }
    if (v.sale_details?.sale_details?.sale_date) {
      const saleDate = new Date(v.sale_details.sale_details.sale_date);
      if (saleDate.getFullYear() === new Date().getFullYear()) {
        const saleMonth = saleDate.getMonth();
        monthlySales[saleMonth].sales += 1;
      }
    }
  });

  const purchaseCost = vehicles.reduce(
    (sum: number, v: any) => sum + (v.fullData?.grandTotal || 0),
    0
  );

  const expenseBreakdown: ExpenseBreakdownData[] = [
    { name: "Maintenance", value: totalMaintenanceCost },
    { name: "HR", value: totalHRPayout },
    { name: "Vehicle Purchase", value: purchaseCost },
  ];

  const salesRecords = vehicles.filter((v: any) => v.status === "Sold");
  const allFinancialTx = vehicles.flatMap((v: any) =>
    (v.financial_history || []).map((tx: any) => ({
      ...tx,
      vehicle: v.vehicle,
    }))
  );

  return {
    stats,
    monthlySales,
    expenseBreakdown,
    purchaseRecords: vehicles,
    maintenanceRecords: allMaintenance,
    salesRecords,
    financeRecords: allFinancialTx,
    employeeFinanceRecords: employeeAdjustments,
    hrRecords: allEmployees,
    vehicles,
  };
}

export async function getVehicleLifecycleReport(
  originalLicensePlate: string
): Promise<any> {
  const vehicleResult = await getVehicle(originalLicensePlate);
  const employeesResult = await getEmployees();

  if (!vehicleResult.success || !vehicleResult.data) {
    return null;
  }

  const vehicle = vehicleResult.data;
  const employees = employeesResult.success ? employeesResult.data : [];

  const purchaseCost = vehicle.fullData?.vehiclePrice || 0;
  const otherPurchaseFees = (vehicle.fullData?.grandTotal || 0) - purchaseCost;
  const totalPurchaseCost = purchaseCost + otherPurchaseFees;

  const maintenanceCost = (vehicle.maintenance_history || []).reduce(
    (sum: number, item: any) => sum + (item.total || 0),
    0
  );

  const otherExpenses = (vehicle.financial_history || [])
    .filter(
      (tx: any) =>
        tx.type === "expense" && tx.category !== "Vehicle Purchase Cost"
    )
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const salePrice = vehicle.sale_details?.sale_details.sale_price || 0;
  const otherIncome = (vehicle.financial_history || [])
    .filter(
      (tx: any) => tx.type === "income" && tx.category !== "Customer Transfer"
    )
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  // Include sales commission in the total expenses
  const salesCommission = (vehicle.financial_history || [])
    .filter((tx: any) => tx.category === "Sales Commission")
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const totalExpenses =
    totalPurchaseCost + maintenanceCost + otherExpenses + salesCommission;
  const totalIncome = salePrice + otherIncome;
  const profitLoss = totalIncome - totalExpenses;

  if (vehicle.bonus_history) {
    vehicle.bonus_history = vehicle.bonus_history.map((b: any) => ({
      ...b,
      employee_name:
        employees.find((e: any) => e.employee_id === b.employee_id)
          ?.personal_info?.name || b.employee_id,
    }));
  }

  return {
    vehicle,
    summary: {
      purchaseCost,
      otherPurchaseFees,
      totalPurchaseCost,
      maintenanceCost,
      otherExpenses,
      salesCommission,
      totalExpenses,
      salePrice,
      otherIncome,
      totalIncome,
      profitLoss,
    },
  };
}

type GetCustomReportParams = {
  type: "vehicleDateRange" | "employeeDateRange" | "vehicleHistory";
  from?: string;
  to?: string;
  vehicleIds?: string[];
};

export async function getCustomReport({
  type,
  from,
  to,
  vehicleIds,
}: GetCustomReportParams) {
  if (type === "vehicleHistory") {
    if (!vehicleIds || vehicleIds.length === 0) return null;

    const selectedVehicles = await Promise.all(
      vehicleIds.map((id) => getVehicle(id)) // Use the permanent ID for lookup
    );

    const validVehicles = selectedVehicles
      .filter((v) => v.success && v.data)
      .map((v) => v.data) as VehicleRecord[];

    const purchaseData = validVehicles.map((v) => ({
      "Purchase ID": v.id,
      Date: v.date,
      "Original License Plate": v.id,
      "Current License Plate": v.license_plate,
      Vehicle: v.vehicle,
      Year: v.fullData.year,
      Color: v.fullData.color,
      VIN: v.fullData.vin,
      Seller: v.seller,
      "Payment Type": v.paymentType,
      "Vehicle Price": v.fullData.vehiclePrice,
      "Grand Total": v.fullData.grandTotal,
      "Purchase Freelancer": v.fullData.freelancerName,
      "Purchase Commission": v.fullData.commissionValue,
    }));

    const maintenanceData = validVehicles.flatMap((v) =>
      (v.maintenance_history || []).map((m) => ({
        Vehicle: v.vehicle,
        "License Plate": v.license_plate,
        ...m,
      }))
    );

    const financeData = validVehicles.flatMap((v) =>
      (v.financial_history || []).map((f) => ({
        Vehicle: v.vehicle,
        "License Plate": v.license_plate,
        ...f,
      }))
    );

    const salesData = validVehicles
      .filter((v) => v.sale_details)
      .map((v) => ({
        "Sale ID": v.sale_details.sale_id,
        Date: v.sale_details.sale_details.sale_date,
        Vehicle: v.vehicle,
        "License Plate": v.license_plate,
        Buyer: v.sale_details.buyer.name,
        "Sale Price": v.sale_details.sale_details.sale_price,
        "Sale Freelancer": v.sale_details.freelancer_commission?.name,
        "Sale Commission": v.sale_details.freelancer_commission?.commission,
      }));

    const licenseData = validVehicles.flatMap((v) =>
      (v.licence_history || []).map((lh: any) => ({
        "Original Plate": v.id,
        "New Plate": lh.newLicensePlate,
        "Issue Date": lh.issueDate,
        Authority: lh.issuingAuthority,
        Fee: lh.price,
      }))
    );

    return {
      Purchase: purchaseData,
      Sales: salesData,
      Maintenance: maintenanceData,
      Finance: financeData,
      License_History: licenseData,
    };
  }

  if (type === "vehicleDateRange") {
    if (!from || !to) return [];
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const vehiclesResult = await getVehicles();
    const vehicles = vehiclesResult.success ? vehiclesResult.data : [];
    return vehicles
      .filter((v: any) => {
        const vehicleDate = new Date(v.date);
        return vehicleDate >= fromDate && vehicleDate <= toDate;
      })
      .map((v: any) => {
        const totalMaintenanceCost = (v.maintenance_history || []).reduce(
          (sum: number, m: any) => sum + m.total,
          0
        );
        const totalIncome = (v.financial_history || [])
          .filter((f: any) => f.type === "income")
          .reduce((sum: number, f: any) => sum + f.amount, 0);
        const totalExpense = (v.financial_history || [])
          .filter((f: any) => f.type === "expense")
          .reduce((sum: number, f: any) => sum + f.amount, 0);
        const licenceFees = (v.licence_history || []).reduce(
          (sum: number, lh: any) => sum + (lh.price || 0),
          0
        );

        return {
          "Purchase ID": v.id,
          "Purchase Date": v.date,
          "License Plate": v.license_plate,
          Vehicle: v.vehicle,
          Year: v.fullData.year,
          Status: v.status,
          "Grand Total Purchase": v.fullData.grandTotal,
          "Maintenance Services": (v.maintenance_history || []).length,
          "Total Maintenance Cost": totalMaintenanceCost,
          "Sale Date": v.sale_details?.sale_details.sale_date,
          "Sale Price": v.sale_details?.sale_details.sale_price,
          "Sales Freelancer Commission":
            v.sale_details?.freelancer_commission?.commission,
          "License Plate Change Fee": licenceFees,
          "Total Income on Vehicle": totalIncome,
          "Total Expense on Vehicle":
            totalExpense +
            totalMaintenanceCost +
            v.fullData.grandTotal +
            licenceFees,
          "Profit/Loss":
            totalIncome -
            (totalExpense +
              totalMaintenanceCost +
              v.fullData.grandTotal +
              licenceFees),
        };
      });
  }

  if (type === "employeeDateRange") {
    if (!from || !to) return [];
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const allEmployeesResult = await getEmployees();
    const allEmployees = allEmployeesResult.success
      ? allEmployeesResult.data
      : [];
    const employeeAdjustments = await getEmployeeAdjustments();

    const employeeReports = [];

    for (const emp of allEmployees) {
      if (!emp.job_details.joining_date) continue;
      const joinDate = new Date(emp.job_details.joining_date);
      if (
        joinDate > toDate ||
        (emp.job_details.status === "Left" &&
          new Date(emp.job_details.left_date) < fromDate)
      ) {
        continue;
      }

      const adjustmentsInRange = employeeAdjustments.filter(
        (adj: Adjustment) => {
          if (!adj.date) return false;
          const adjDate = new Date(adj.date);
          return (
            adj.employee_id === emp.employee_id &&
            adjDate >= fromDate &&
            adjDate <= toDate
          );
        }
      );

      const totalCredit = adjustmentsInRange
        .filter((adj: Adjustment) => ["Bonus", "Addition"].includes(adj.type))
        .reduce((sum: number, adj: Adjustment) => sum + adj.amount, 0);

      const totalDebit = adjustmentsInRange
        .filter((adj: Adjustment) =>
          ["Deduction", "Employee Expense", "Advance"].includes(adj.type)
        )
        .reduce((sum: number, adj: Adjustment) => sum + adj.amount, 0);

      let present = 0,
        absent = 0,
        late = 0,
        leave = 0;

      for (
        let d = new Date(fromDate);
        d <= toDate;
        d.setMonth(d.getMonth() + 1)
      ) {
        const year = d.getFullYear();
        const month = d.getMonth() + 1;

        try {
          const rawData = await getRawAttendanceData(year, month);
          if (rawData && rawData.length > 0) {
            const empRawRecords = rawData.filter(
              (r) => r.employee_id === emp.employee_id
            );
            empRawRecords.forEach((r) => {
              if (!r.date) return;
              const rDate = new Date(r.date);
              if (rDate >= fromDate && rDate <= toDate) {
                if (r.status === "Present") present++;
                if (r.status === "Late") late++;
                if (r.status === "Absent") absent++;
                if (r.status === "Leave") leave++;
              }
            });
          }
        } catch (e) {
          console.error(
            `Could not get attendance for ${emp.employee_id} for ${year}-${month}`,
            e
          );
        }
      }

      employeeReports.push({
        "Employee ID": emp.employee_id,
        Name: emp.personal_info.name,
        Department: emp.job_details.department,
        Position: emp.job_details.position,
        "Joining Date": emp.job_details.joining_date,
        "Base Salary": emp.job_details.salary,
        Status: emp.job_details.status,
        Contact: emp.personal_info.contact,
        "Total Credit (Bonus/Addition)": totalCredit,
        "Total Debit (Deduction/Advance)": totalDebit,
        "Period Present Days": present + late,
        "Period Absent Days": absent,
        "Period Late Days": late,
      });
    }
    return employeeReports;
  }

  return [];
}
