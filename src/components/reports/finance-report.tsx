
'use client';

import { ReportLayout } from './report-layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TransactionRecord } from '@/components/finance/vehicle-finance-client';

interface FinanceReportProps {
  data: (TransactionRecord & { vehicle: string })[];
}

const columns = [
    { header: 'ID', accessor: 'transaction_id' },
    { header: 'Date', accessor: 'date' },
    { header: 'Category', accessor: 'category' },
    { header: 'Type', accessor: 'type' },
    { header: 'Entity', accessor: 'license_plate' },
    { header: 'Amount', accessor: 'amount' },
];

export function FinanceReport({ data }: FinanceReportProps) {
  return (
    <ReportLayout title="Finance Report" description="A detailed log of all income and expense transactions." data={data} columns={columns}>
        {(filteredData) => (
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Linked Entity</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((record) => (
                        <TableRow key={record.transaction_id}>
                           <TableCell>{record.date}</TableCell>
                           <TableCell className="font-medium">{record.category}</TableCell>
                           <TableCell>
                             <Badge variant="outline" className={cn(
                                record.type === 'income' ? 'text-green-700 border-green-300 bg-green-50' : 'text-red-700 border-red-300 bg-red-50'
                             )}>{record.type}</Badge>
                           </TableCell>
                           <TableCell>{record.license_plate === 'Office' ? 'Office' : `${record.vehicle} (${record.license_plate})`}</TableCell>
                           <TableCell className="font-mono">฿{record.amount.toLocaleString('en-US')}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
        )}
    </ReportLayout>
  );
}
