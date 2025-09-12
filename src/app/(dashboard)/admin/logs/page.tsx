
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getAllLogs } from '@/lib/admin-actions';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

type LogRecord = {
  log_id: string;
  user_id: string;
  user_name: string;
  module: string;
  action: string;
  timestamp: string;
  details?: Record<string, any>;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<{ user_id: string; user_name: string; module: string; action: string; fromDate: string; toDate: string; }>({ user_id: '', user_name: '', module: '', action: '', fromDate: '', toDate: '' });

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      const allLogs = await getAllLogs();
      setLogs(allLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setIsLoading(false);
    }
    fetchLogs();
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (filters.user_id) {
      filtered = filtered.filter(log => log.user_id.toLowerCase().includes(filters.user_id.toLowerCase()));
    }
    if (filters.user_name) {
      filtered = filtered.filter(log => log.user_name.toLowerCase().includes(filters.user_name.toLowerCase()));
    }
    if (filters.module) {
      filtered = filtered.filter(log => log.module.toLowerCase().includes(filters.module.toLowerCase()));
    }
    if (filters.action) {
      filtered = filtered.filter(log => log.action.toLowerCase().includes(filters.action.toLowerCase()));
    }
    if (filters.fromDate) {
        filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(filters.fromDate));
    }
    if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999); // Include the whole day
        filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
    }

    setFilteredLogs(filtered);
  }, [logs, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFilters(prev => ({ ...prev, [id.replace('filter-','')]: value }));
  };
  
  const handleExportExcel = () => {
    const dataToExport = filteredLogs.map(log => ({
      Timestamp: log.timestamp,
      'User ID': log.user_id,
      'User Name': log.user_name,
      Module: log.module,
      Action: log.action,
      Details: log.details ? JSON.stringify(log.details) : ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Logs");
    XLSX.writeFile(workbook, "activity_log_report.xlsx");
  };
  
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Activity Log Report", 14, 16);
    autoTable(doc, {
      head: [['Timestamp', 'User Name', 'Module', 'Action', 'Details']],
      body: filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString(), 
        log.user_name, 
        log.module, 
        log.action,
        log.details ? JSON.stringify(log.details) : ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fontSize: 10 },
      columnStyles: {
        3: { cellWidth: 50 },
        4: { cellWidth: 'auto' }
      }
    });
    doc.save('activity_log_report.pdf');
  };

  return (
    <>
      <PageHeader
        title="Activity Logs"
        description="Monitor all user actions across the system for audit and compliance."
      >
        <Button size="sm" variant="outline" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" /> <span className="lang-en">Export Excel</span><span className="lang-th">ส่งออก Excel</span></Button>
        <Button size="sm" variant="outline" onClick={handleExportPDF}><Download className="mr-2 h-4 w-4" /> <span className="lang-en">Export PDF</span><span className="lang-th">ส่งออก PDF</span></Button>
      </PageHeader>
      
      <Card>
          <CardHeader>
            <CardTitle><span className="lang-en">Log Viewer</span><span className="lang-th">เครื่องมือดูบันทึก</span></CardTitle>
            <CardDescription><span className="lang-en">A complete, filterable history of all user activities.</span><span className="lang-th">ประวัติกิจกรรมผู้ใช้ทั้งหมดที่สามารถกรองได้</span></CardDescription>
          </CardHeader>
          <CardContent>
             <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="filter-user_id" className="text-xs font-medium"><span className="lang-en">User ID</span><span className="lang-th">รหัสผู้ใช้</span></Label>
                        <Input id="filter-user_id" placeholder="e.g., MAN-..." value={filters.user_id} onChange={handleFilterChange}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="filter-user_name" className="text-xs font-medium"><span className="lang-en">User Name</span><span className="lang-th">ชื่อผู้ใช้</span></Label>
                        <Input id="filter-user_name" placeholder="e.g., John Doe" value={filters.user_name} onChange={handleFilterChange}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="filter-module" className="text-xs font-medium"><span className="lang-en">Module</span><span className="lang-th">โมดูล</span></Label>
                        <Input id="filter-module" placeholder="e.g., Purchase" value={filters.module} onChange={handleFilterChange}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="filter-action" className="text-xs font-medium"><span className="lang-en">Action</span><span className="lang-th">การกระทำ</span></Label>
                        <Input id="filter-action" placeholder="e.g., Added" value={filters.action} onChange={handleFilterChange}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="filter-fromDate" className="text-xs font-medium"><span className="lang-en">From</span><span className="lang-th">จาก</span></Label>
                        <Input id="filter-fromDate" type="date" value={filters.fromDate} onChange={handleFilterChange}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="filter-toDate" className="text-xs font-medium"><span className="lang-en">To</span><span className="lang-th">ถึง</span></Label>
                        <Input id="filter-toDate" type="date" value={filters.toDate} onChange={handleFilterChange}/>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><span className="lang-en">Timestamp</span><span className="lang-th">เวลา</span></TableHead>
                    <TableHead><span className="lang-en">User</span><span className="lang-th">ผู้ใช้</span></TableHead>
                    <TableHead><span className="lang-en">Module</span><span className="lang-th">โมดูล</span></TableHead>
                    <TableHead><span className="lang-en">Action</span><span className="lang-th">การกระทำ</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow key="loading"><TableCell colSpan={4} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                  ) : filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                        <TableRow key={log.log_id || log.timestamp}>
                          <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="font-medium">{log.user_name}</div>
                            <div className="text-sm text-muted-foreground">{log.user_id}</div>
                          </TableCell>
                          <TableCell><Badge variant="secondary">{log.module}</Badge></TableCell>
                          <TableCell className="max-w-sm">
                            <p>{log.action}</p>
                            {log.details && (
                                <p className="text-xs text-muted-foreground truncate" title={JSON.stringify(log.details)}>
                                    {JSON.stringify(log.details)}
                                </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow key="no-results">
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        <span className="lang-en">No logs found matching your criteria.</span><span className="lang-th">ไม่พบบันทึกที่ตรงกับเกณฑ์ของคุณ</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
    </>
  );
}
