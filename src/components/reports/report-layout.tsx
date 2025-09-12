
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, File, Filter, Printer } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportLayoutProps {
  title: string;
  description: string;
  data: any[];
  columns: { header: string; accessor: string }[];
  children: (filteredData: any[]) => React.ReactNode;
}

// Helper to get nested property value
const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};


export function ReportLayout({ title, description, data, columns, children }: ReportLayoutProps) {
  const [globalFilter, setGlobalFilter] = useState('');

  const filteredData = useMemo(() => {
    if (!globalFilter) {
      return data;
    }
    const lowercasedFilter = globalFilter.toLowerCase();
    return data.filter(item => {
      return columns.some(col => {
        const value = getNestedValue(item, col.accessor);
        return String(value).toLowerCase().includes(lowercasedFilter);
      });
    });
  }, [data, globalFilter, columns]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Openroad DMS", 14, 22);
    doc.setFontSize(11);
    doc.text(title, 14, 30);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);

    autoTable(doc, {
      startY: 50,
      head: [columns.map(c => c.header)],
      body: filteredData.map(row => columns.map(c => {
        const value = getNestedValue(row, c.accessor);
        return value ?? 'N/A';
      })),
    });
    
    doc.save(`${title.replace(/ /g, '_').toLowerCase()}_report.pdf`);
  };
  
  const handleExportExcel = () => {
    const dataToExport = filteredData.map(row => {
        let flatRow: { [key: string]: any } = {};
        columns.forEach(col => {
            const value = getNestedValue(row, col.accessor);
            flatRow[col.header] = value ?? 'N/A';
        });
        return flatRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${title.replace(/ /g, '_').toLowerCase()}_report.xlsx`);
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                 <CardTitle>{title}</CardTitle>
                 <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExportPDF}><File className="mr-2 h-4 w-4"/> Export PDF</Button>
                <Button variant="outline" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4"/> Export Excel</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 border rounded-lg bg-muted/50">
          <Input 
            placeholder="Search across all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        {children(filteredData)}
      </CardContent>
    </Card>
  );
}
