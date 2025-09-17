

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from "@/modules/shared/components/page-header";
import { Button } from "@/modules/shared/components/ui/ui/button";
import { ListFilter, FileText, Download, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/modules/shared/components/ui/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/modules/shared/components/ui/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/modules/shared/components/ui/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/shared/components/ui/ui/select';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/modules/shared/utils/utils';
import { Checkbox } from '@/modules/shared/components/ui/ui/checkbox';
import { Label } from '@/modules/shared/components/ui/ui/label';
import { Input } from '@/modules/shared/components/ui/ui/input';
import { ScrollArea } from '@/modules/shared/components/ui/ui/scroll-area';
import { getProcessedAttendance, getEmployees, savePayrollData, getPayrollDataForMonth } from '@/modules/hr/services/hr-actions';
import { getEmployeeAdjustments } from '@/modules/finance/services/finance-actions';
import { PayslipDialog } from '@/components/payslip-dialog';
import type { Adjustment } from '@/modules/finance/components/employee-finance-client';
import { getPayrollMonthYearForDate } from '@/modules/shared/utils/utils';


export type DeductionItem = {
    id: string;
    amount: number;
    remarks: string;
};

// Define types for payroll calculation
export type PayrollRecord = {
  employee_id: string;
  name: string;
  photo: string | null;
  base_salary: number;
  present_days: number;
  working_days: number;
  prorated_salary: number;
  raw_ot_hours: number;
  payable_ot_hours: number;
  ot_pay: number;
  bonus: number;
  advance_given_this_period: number;
  deductions: DeductionItem[];
  net_salary: number;
  calculation_details: {
    base_hourly_rate: number,
    grade: number,
    department?: string,
    position?: string,
  };
  attendance_summary: any;
  employee_financial_history: any[];
  all_time_financial_history?: any[];
};

const years = [new Date().getFullYear() + 1, new Date().getFullYear()];
const months = [
  { value: 1, label: 'January', th: 'มกราคม' }, 
  { value: 2, label: 'February', th: 'กุมภาพันธ์' }, 
  { value: 3, label: 'March', th: 'มีนาคม' },
  { value: 4, label: 'April', th: 'เมษายน' }, 
  { value: 5, label: 'May', th: 'พฤษภาคม' }, 
  { value: 6, 'label': 'June', th: 'มิถุนายน' },
  { value: 7, label: 'July', th: 'กรกฎาคม' }, 
  { value: 8, label: 'August', th: 'สิงหาคม' }, 
  { value: 9, 'label': 'September', th: 'กันยายน' },
  { value: 10, label: 'October', th: 'ตุลาคม' }, 
  { value: 11, 'label': 'November', th: 'พฤศจิกายน' }, 
  { value: 12, 'label': 'December', th: 'ธันวาคม' },
];

const periodMonths = [
    { value: 1, label: 'Dec-Jan' }, { value: 2, label: 'Jan-Feb' }, { value: 3, label: 'Feb-Mar' },
    { value: 4, label: 'Mar-Apr' }, { value: 5, label: 'Apr-May' }, { value: 6, label: 'May-Jun' },
    { value: 7, label: 'Jun-Jul' }, { value: 8, label: 'Jul-Aug' }, { value: 9, label: 'Aug-Sep' },
    { value: 10, label: 'Sep-Oct' }, { value: 11, label: 'Oct-Nov' }, { value: 12, label: 'Nov-Dec' }
];

export default function PayrollPage() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPayslipOpen, setPayslipOpen] = useState(false);
  const [selectedPayslipData, setSelectedPayslipData] = useState<PayrollRecord | null>(null);

  
  useEffect(() => {
    async function loadInitialData() {
        setIsLoading(true);
        const emps = await getEmployees();
        setAllEmployees(emps);
        setIsLoading(false);
    }
    loadInitialData();
  }, []);

  const handleSelectAll = (checked: boolean) => {
    setSelectedEmployees(checked ? allEmployees.map(e => e.employee_id) : []);
  };

  const handleSelectEmployee = (id: string, checked: boolean) => {
    setSelectedEmployees(prev =>
      checked ? [...prev, id] : prev.filter(empId => empId !== id)
    );
  };
  
  const calculatePayroll = async () => {
    if (selectedEmployees.length === 0) {
      toast({ title: "No Employees Selected", description: "Please select at least one employee.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
        const { groupedData: attendanceSummary } = await getProcessedAttendance(selectedYear, selectedMonth);
        const allEmployeesFullData = await getEmployees();
        
        const newPayrollDataPromises = allEmployeesFullData
            .filter(emp => selectedEmployees.includes(emp.employee_id))
            .map(async (employee) => {
                const empAttendance = attendanceSummary.find(a => a.employee_id === employee.employee_id);
                
                const currentPayrollFile = await getPayrollDataForMonth(selectedYear, selectedMonth, employee.employee_id);
                const financialHistoryForPeriod = currentPayrollFile?.employee_financial_history || [];
                const allHistoricalAdjustments = await getEmployeeAdjustments(employee.employee_id);

                const presentDays = empAttendance?.present || 0;
                const totalDaysInMonth = empAttendance?.records.length || new Date(selectedYear, selectedMonth, 0).getDate();
                const workingDaysInMonth = totalDaysInMonth - (empAttendance?.holiday || 0);

                const rawTotalOT = empAttendance?.total_raw_overtime || 0;
                const payableOTHours = empAttendance?.total_payable_overtime || 0;
                
                const proratedSalary = workingDaysInMonth > 0 ? (employee.job_details.salary / workingDaysInMonth) * presentDays : 0;
                
                const standardWorkHoursPerDay = 9; 
                const baseHourlyRate = workingDaysInMonth > 0 ? (employee.job_details.salary / workingDaysInMonth) / standardWorkHoursPerDay : 0;
                const otPay = payableOTHours * baseHourlyRate;
                
                let empDeductions: DeductionItem[] = [];
                let totalBonus = 0;
                let advanceCredit = 0;

                financialHistoryForPeriod.forEach((adj: Adjustment) => {
                   if (adj.type === 'Bonus' || adj.type === 'Addition') {
                       totalBonus += adj.amount;
                   } else if (['Deduction', 'Employee Expense'].includes(adj.type)) {
                       empDeductions.push({ id: adj.id, amount: adj.amount, remarks: adj.remarks || adj.type });
                   } else if (adj.type === 'Advance') {
                       advanceCredit += adj.amount;
                   }
                });
                
                const totalDeductions = empDeductions.reduce((acc, d) => acc + d.amount, 0);
                const netSalary = proratedSalary + otPay + totalBonus + advanceCredit - totalDeductions;
                
                const payrollRecord: PayrollRecord = {
                    employee_id: employee.employee_id,
                    name: employee.personal_info.name,
                    photo: employee.documents.photo as string | null,
                    base_salary: employee.job_details.salary,
                    present_days: presentDays,
                    working_days: workingDaysInMonth,
                    prorated_salary: proratedSalary,
                    raw_ot_hours: rawTotalOT,
                    payable_ot_hours: payableOTHours,
                    ot_pay: otPay,
                    bonus: totalBonus,
                    advance_given_this_period: advanceCredit,
                    deductions: empDeductions,
                    net_salary: netSalary,
                    calculation_details: {
                        base_hourly_rate: baseHourlyRate,
                        grade: employee.job_details.grade,
                        department: employee.job_details.department,
                        position: employee.job_details.position,
                    },
                    attendance_summary: {
                      present: empAttendance?.present || 0,
                      late: empAttendance?.late || 0,
                      absent: empAttendance?.absent || 0,
                      leave: empAttendance?.leave || 0,
                      holiday: empAttendance?.holiday || 0,
                    },
                    employee_financial_history: financialHistoryForPeriod,
                    all_time_financial_history: allHistoricalAdjustments,
                };
                
                await savePayrollData(selectedYear, selectedMonth, payrollRecord);
                return payrollRecord;
            });
        
        const newPayrollData = await Promise.all(newPayrollDataPromises);
        setPayrollData(newPayrollData as PayrollRecord[]);
        toast({ title: "Payroll Calculated", description: `Payroll has been successfully calculated and saved for ${newPayrollData.length} employees.` });

    } catch(e) {
        console.error("Payroll calculation failed:", e);
        toast({ title: "Error", description: "Could not calculate payroll. Check attendance data for the selected month.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleGeneratePayslip = (record: PayrollRecord) => {
    setSelectedPayslipData(record);
    setPayslipOpen(true);
  };
  
  return (
    <>
      <PageHeader
        title="Payroll Processing"
        description="Calculate salaries, overtime, and generate payslips for your employees."
      >
        <Button variant="outline" size="sm" disabled><Download className="mr-2 h-4 w-4" /> <span className="lang-en">Export All</span><span className="lang-th">ส่งออกทั้งหมด</span></Button>
        <Button size="sm" onClick={() => {}} disabled={payrollData.length === 0}><FileText className="mr-2 h-4 w-4" /> <span className="lang-en">Generate Selected Payslips</span><span className="lang-th">สร้างสลิปเงินเดือนที่เลือก</span></Button>
      </PageHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle><span className="lang-en">Configuration</span><span className="lang-th">การกำหนดค่า</span></CardTitle>
              <CardDescription><span className="lang-en">Select period and employees.</span><span className="lang-th">เลือกระยะเวลาและพนักงาน</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                      <Label htmlFor="year"><span className="lang-en">Year</span><span className="lang-th">ปี</span></Label>
                      <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                          {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-1">
                      <Label htmlFor="month"><span className="lang-en">Period</span><span className="lang-th">เดือน</span></Label>
                       <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                          {periodMonths.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
              <div className="space-y-2">
                <Label><span className="lang-en">Employees</span><span className="lang-th">พนักงาน</span></Label>
                 <div className="flex items-center space-x-2 border-b pb-2">
                    <Checkbox id="select-all" onCheckedChange={(checked) => handleSelectAll(!!checked)} checked={selectedEmployees.length === allEmployees.length && allEmployees.length > 0} />
                    <Label htmlFor="select-all" className="font-semibold"><span className="lang-en">Select All</span><span className="lang-th">เลือกทั้งหมด</span></Label>
                </div>
                <ScrollArea className="h-64">
                    <div className="space-y-2 p-1">
                    {isLoading ? <Loader2 className="animate-spin mx-auto" /> : allEmployees.map(emp => (
                        <div key={emp.employee_id} className="flex items-center space-x-2">
                            <Checkbox id={emp.employee_id} onCheckedChange={(checked) => handleSelectEmployee(emp.employee_id, !!checked)} checked={selectedEmployees.includes(emp.employee_id)} />
                            <Label htmlFor={emp.employee_id} className="font-normal">{emp.personal_info.name}</Label>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
              </div>
               <Button onClick={calculatePayroll} className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> <span className="lang-en">Calculating...</span><span className="lang-th">กำลังคำนวณ...</span></> : <><span className="lang-en">Calculate & Save Payroll</span><span className="lang-th">คำนวณและบันทึกเงินเดือน</span></>}
               </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-9">
            <Card>
                <CardHeader>
                <CardTitle><span className="lang-en">Payroll Preview</span><span className="lang-th">ตัวอย่างเงินเดือน</span></CardTitle>
                <CardDescription>
                    <span className="lang-en">Review the calculated payroll for {months.find(m => m.value === selectedMonth)?.label} {selectedYear} before finalizing.</span>
                    <span className="lang-th">ตรวจสอบเงินเดือนที่คำนวณสำหรับ {months.find(m => m.value === selectedMonth)?.th} {selectedYear} ก่อนสรุป</span>
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px]"><span className="lang-en">Employee</span><span className="lang-th">พนักงาน</span></TableHead>
                            <TableHead className="text-center">Working Days</TableHead>
                            <TableHead className="text-right"><span className="lang-en">Prorated Salary</span><span className="lang-th">เงินเดือนตามสัดส่วน</span></TableHead>
                            <TableHead className="text-center"><span className="lang-en">Payable OT (Hrs)</span><span className="lang-th">OT ที่ต้องจ่าย (ชม.)</span></TableHead>
                            <TableHead className="text-right"><span className="lang-en">OT Pay</span><span className="lang-th">ค่าล่วงเวลา</span></TableHead>
                            <TableHead className="text-right"><span className="lang-en">Bonus</span><span className="lang-th">โบนัส</span></TableHead>
                            <TableHead className="w-[120px] text-right"><span className="lang-en">Deductions</span><span className="lang-th">การหักเงิน</span></TableHead>
                            <TableHead className="text-right font-bold"><span className="lang-en">Net Salary</span><span className="lang-th">เงินเดือนสุทธิ</span></TableHead>
                            <TableHead className="text-center"><span className="lang-en">Actions</span><span className="lang-th">การกระทำ</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payrollData.length > 0 ? (
                        payrollData.map((record) => {
                            const totalDeductions = record.deductions.reduce((acc, d) => acc + d.amount, 0);
                            return (
                            <TableRow key={record.employee_id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={record.photo || ''} alt={record.name} />
                                            <AvatarFallback>{record.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{record.name}</div>
                                            <div className="text-sm text-muted-foreground">{record.employee_id}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-mono">{record.present_days} / {record.working_days}</TableCell>
                                <TableCell className="text-right font-mono">฿{record.prorated_salary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className="text-center font-bold">{record.payable_ot_hours.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono">฿{record.ot_pay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className="text-right font-mono">฿{record.bonus.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className="text-right font-mono">฿{totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className="text-right font-mono font-bold">฿{record.net_salary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className="text-center">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleGeneratePayslip(record)}>
                                        <FileText className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                            )
                        })
                        ) : (
                        <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                <span className="lang-en">{isLoading ? "Calculating..." : "Select employees and click 'Calculate & Save Payroll' to see the preview."}</span>
                                <span className="lang-th">{isLoading ? "กำลังคำนวณ..." : "เลือกพนักงานและคลิก 'คำนวณและบันทึกเงินเดือน' เพื่อดูตัวอย่าง"}</span>
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
                </CardContent>
            </Card>
        </div>
      </div>

       <PayslipDialog
        isOpen={isPayslipOpen}
        onClose={() => setPayslipOpen(false)}
        record={selectedPayslipData}
        period={{ month: selectedMonth, year: selectedYear }}
        months={months}
      />
    </>
  );
}





