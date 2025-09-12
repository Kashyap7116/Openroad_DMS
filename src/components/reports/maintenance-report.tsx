
'use client';

import { ReportLayout } from './report-layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MaintenanceRecord } from '@/app/(dashboard)/maintenance/page';

interface MaintenanceReportProps {
  data: MaintenanceRecord[];
}

const columns = [
    { header: 'ID', accessor: 'maintenance_id' },
    { header: 'Date', accessor: 'service_date' },
    { header: 'Vehicle', accessor: 'vehicle' },
    { header: 'License', accessor: 'license_plate' },
    { header: 'Service Items', accessor: 'items' },
    { header: 'Cost', accessor: 'total' },
    { header: 'Status', accessor: 'status' },
];

export function MaintenanceReport({ data }: MaintenanceReportProps) {
  return (
    <ReportLayout title="Maintenance Report" description="Complete history of all service and repair records." data={data} columns={columns}>
        {(filteredData) => (
             <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map(c => <TableHead key={c.accessor}>{c.header}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((record) => (
                      <TableRow key={record.maintenance_id}>
                        <TableCell>{record.maintenance_id}</TableCell>
                        <TableCell>{record.service_date}</TableCell>
                        <TableCell>{record.vehicle}</TableCell>
                        <TableCell>{record.license_plate}</TableCell>
                        <TableCell className="max-w-xs truncate">{record.items}</TableCell>
                        <TableCell className="font-mono">฿{record.total.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                record.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {record.status}
                            </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
            </Table>
        )}
    </ReportLayout>
  );
}
