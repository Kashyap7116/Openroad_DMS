
'use client';

import { ReportLayout } from './report-layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/shared/components/ui/ui/table';
import { Badge } from '@/modules/shared/components/ui/ui/badge';
import { cn } from '@/modules/shared/utils/utils';
import type { Adjustment } from '@/modules/finance/components/employee-finance-client';

interface EmployeeFinanceReportProps {
  data: Adjustment[];
  employees: any[];
}

const columns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Date', accessor: 'date' },
    { header: 'Employee', accessor: 'employee_id' },
    { header: 'Type', accessor: 'type' },
    { header: 'Amount', accessor: 'amount' },
    { header: 'Remarks', accessor: 'remarks' },
];

export function EmployeeFinanceReport({ data, employees }: EmployeeFinanceReportProps) {
    const getEmployeeName = (employeeId: string) => {
        return employees.find(e => e.employee_id === employeeId)?.personal_info.name || employeeId;
    }

    const typeStyles: { [key in Adjustment['type']]: string } = {
        'Bonus': 'text-green-700 border-green-300 bg-green-50 dark:text-green-300 dark:bg-green-900/50',
        'Addition': 'text-green-700 border-green-300 bg-green-50 dark:text-green-300 dark:bg-green-900/50',
        'Advance': 'text-red-700 border-red-300 bg-red-50 dark:text-red-300 dark:bg-red-900/50',
        'Deduction': 'text-red-700 border-red-300 bg-red-50 dark:text-red-300 dark:bg-red-900/50',
        'Employee Expense': 'text-red-700 border-red-300 bg-red-50 dark:text-red-300 dark:bg-red-900/50',
    };

    return (
        <ReportLayout title="Employee Finance Report" description="A detailed log of all non-payroll financial adjustments for employees." data={data} columns={columns}>
            {(filteredData) => (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount (฿)</TableHead>
                        <TableHead>Remarks</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.map((adj) => (
                        <TableRow key={adj.id}>
                            <TableCell>{new Date(adj.date).toLocaleDateString('en-CA')}</TableCell>
                            <TableCell>{getEmployeeName(adj.employee_id)}</TableCell>
                            <TableCell>
                            <Badge variant="outline" className={cn(typeStyles[adj.type])}>
                                {adj.type}
                            </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{adj.amount.toLocaleString()}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{adj.remarks || '-'}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </ReportLayout>
    );
}




