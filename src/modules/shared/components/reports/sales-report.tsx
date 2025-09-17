
'use client';

import { ReportLayout } from './report-layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/shared/components/ui/ui/table';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';

interface SalesReportProps {
  data: VehicleRecord[];
}

const columns = [
    { header: 'Sale ID', accessor: 'sale_details.sale_id'},
    { header: 'Date', accessor: 'sale_details.sale_details.sale_date'},
    { header: 'Vehicle', accessor: 'vehicle'},
    { header: 'License', accessor: 'license_plate'},
    { header: 'Buyer', accessor: 'sale_details.buyer.name'},
    { header: 'Sale Price', accessor: 'sale_details.sale_details.sale_price'},
];


export function SalesReport({ data }: SalesReportProps) {
  return (
    <ReportLayout title="Sales Report" description="A detailed log of all vehicle sales transactions." data={data} columns={columns}>
        {(filteredData) => (
             <Table>
                <TableHeader>
                  <TableRow>
                     {columns.map(c => <TableHead key={c.accessor}>{c.header}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((vehicle) => (
                      <TableRow key={vehicle.sale_details?.sale_id}>
                        <TableCell className="font-medium">{vehicle.sale_details?.sale_id}</TableCell>
                        <TableCell>{vehicle.sale_details?.sale_details.sale_date}</TableCell>
                        <TableCell>{vehicle.vehicle}</TableCell>
                        <TableCell>{vehicle.license_plate}</TableCell>
                        <TableCell>{vehicle.sale_details?.buyer.name}</TableCell>
                        <TableCell className="font-mono">฿{vehicle.sale_details?.sale_details.sale_price.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
        )}
    </ReportLayout>
  );
}


