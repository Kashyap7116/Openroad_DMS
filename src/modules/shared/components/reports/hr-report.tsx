
'use client';

import { ReportLayout } from './report-layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/shared/components/ui/ui/table';
import { Badge } from '@/modules/shared/components/ui/ui/badge';
import { cn } from '@/modules/shared/utils/utils';
import type { EmployeeRecord } from '@/app/(dashboard)/hr/employees/page';

interface HRReportProps {
  data: EmployeeRecord[];
}

const columns = [
    { header: 'ID', accessor: 'employee_id' },
    { header: 'Name', accessor: 'personal_info.name' },
    { header: 'Department', accessor: 'job_details.department' },
    { header: 'Position', accessor: 'job_details.position' },
    { header: 'Salary', accessor: 'job_details.salary' },
    { header: 'Status', accessor: 'job_details.status' },
];

export function HRReport({ data }: HRReportProps) {
  return (
    <ReportLayout title="HR Report" description="A complete list of all employees in the system." data={data} columns={columns}>
        {(filteredData) => (
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((record) => (
                        <TableRow key={record.employee_id}>
                           <TableCell>
                                <div className="font-medium">{record.personal_info.name}</div>
                                <div className="text-sm text-muted-foreground">{record.employee_id}</div>
                            </TableCell>
                          <TableCell>{record.job_details.department}</TableCell>
                          <TableCell>{record.job_details.position}</TableCell>
                          <TableCell className="font-mono">฿{record.job_details.salary.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                                record.job_details.status === 'Active' ? 'text-green-700 border-green-300 bg-green-50' : 'text-red-700 border-red-300 bg-red-50'
                            )}>
                                {record.job_details.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
        )}
    </ReportLayout>
  );
}



