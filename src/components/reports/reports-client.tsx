
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { getMasterReportData, ReportStats, MonthlySalesData, ExpenseBreakdownData } from '@/lib/reports-actions';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';

import { ReportsDashboard } from './reports-dashboard';
import { PurchaseReport } from './purchase-report';
import { MaintenanceReport } from './maintenance-report';
import { SalesReport } from './sales-report';
import { FinanceReport } from './finance-report';
import { HRReport } from './hr-report';
import { CustomReport } from './custom-report';
import { EmployeeFinanceReport } from './employee-finance-report';

export type ReportData = {
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
};

export function ReportsClient() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const reportData = await getMasterReportData();
    setData(reportData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-4">
            <span className="lang-en">Generating master report...</span>
            <span className="lang-th">กำลังสร้างรายงานหลัก...</span>
        </p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="dashboard" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
        <TabsTrigger value="dashboard"><span className="lang-en">Dashboard</span><span className="lang-th">แดชบอร์ด</span></TabsTrigger>
        <TabsTrigger value="purchase"><span className="lang-en">Purchase</span><span className="lang-th">จัดซื้อ</span></TabsTrigger>
        <TabsTrigger value="maintenance"><span className="lang-en">Maintenance</span><span className="lang-th">ซ่อมบำรุง</span></TabsTrigger>
        <TabsTrigger value="sales"><span className="lang-en">Sales</span><span className="lang-th">การขาย</span></TabsTrigger>
        <TabsTrigger value="hr"><span className="lang-en">HR</span><span className="lang-th">ฝ่ายบุคคล</span></TabsTrigger>
        <TabsTrigger value="finance"><span className="lang-en">Finance</span><span className="lang-th">การเงิน</span></TabsTrigger>
        <TabsTrigger value="custom"><span className="lang-en">Custom Report</span><span className="lang-th">รายงานที่กำหนดเอง</span></TabsTrigger>
      </TabsList>
      
      <TabsContent value="dashboard">
        <ReportsDashboard stats={data.stats} monthlySales={data.monthlySales} expenseBreakdown={data.expenseBreakdown} />
      </TabsContent>
      <TabsContent value="purchase"><PurchaseReport data={data.purchaseRecords} /></TabsContent>
      <TabsContent value="maintenance"><MaintenanceReport data={data.maintenanceRecords} /></TabsContent>
      <TabsContent value="sales"><SalesReport data={data.salesRecords} /></TabsContent>
      <TabsContent value="hr"><HRReport data={data.hrRecords} /></TabsContent>
       <TabsContent value="finance">
            <Tabs defaultValue="vehicle-finance" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="vehicle-finance">Vehicle Finance</TabsTrigger>
                    <TabsTrigger value="employee-finance">Employee Finance</TabsTrigger>
                </TabsList>
                <TabsContent value="vehicle-finance">
                    <FinanceReport data={data.financeRecords} />
                </TabsContent>
                <TabsContent value="employee-finance">
                    <EmployeeFinanceReport data={data.employeeFinanceRecords} employees={data.hrRecords} />
                </TabsContent>
            </Tabs>
        </TabsContent>
      <TabsContent value="custom"><CustomReport vehicles={data.vehicles} employees={data.hrRecords} /></TabsContent>
    </Tabs>
  );
}
