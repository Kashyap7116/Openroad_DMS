
'use client';

import { ReportLayout } from './report-layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';

interface PurchaseReportProps {
  data: VehicleRecord[];
}

const columns = [
    { header: 'ID', accessor: 'id'},
    { header: 'Date', accessor: 'date'},
    { header: 'Vehicle', accessor: 'vehicle'},
    { header: 'License', accessor: 'license_plate'},
    { header: 'Seller', accessor: 'seller'},
    { header: 'Price', accessor: 'fullData.grandTotal'},
    { header: 'Status', accessor: 'status'},
];

export function PurchaseReport({ data }: PurchaseReportProps) {
  return (
    <ReportLayout title="Purchase Report" description="Detailed list of all vehicle acquisitions." data={data} columns={columns}>
        {(filteredData) => (
             <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(c => <TableHead key={c.accessor}>{c.header}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.id}</TableCell>
                    <TableCell>{purchase.date}</TableCell>
                    <TableCell>{purchase.vehicle}</TableCell>
                    <TableCell>{purchase.license_plate}</TableCell>
                    <TableCell>{purchase.seller}</TableCell>
                    <TableCell className="text-right font-mono">฿{purchase.fullData.grandTotal.toLocaleString()}</TableCell>
                    <TableCell>
                       <Badge variant="outline" className={cn(
                          purchase.status === 'Completed' ? 'text-green-700 border-green-300 bg-green-50' :
                          purchase.status === 'Processing' ? 'text-yellow-700 border-yellow-300 bg-yellow-50' :
                          purchase.status === 'Sold' ? 'text-blue-700 border-blue-300 bg-blue-50' : ''
                      )}>
                          {purchase.status}
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
