"use client";

import {
  getAllUserActivity,
  getUserActivitySummary,
  UnifiedActivity,
} from "@/modules/admin/services/user-activity-service";
import { PageHeader } from "@/modules/shared/components/page-header";
import { Badge } from "@/modules/shared/components/ui/ui/badge";
import { Button } from "@/modules/shared/components/ui/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/ui/card";
import { Input } from "@/modules/shared/components/ui/ui/input";
import { Label } from "@/modules/shared/components/ui/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui/ui/table";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

type LogRecord = UnifiedActivity;

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activitySummary, setActivitySummary] = useState<any>(null);
  const [filters, setFilters] = useState<{
    user_id: string;
    user_name: string;
    module: string;
    action: string;
    fromDate: string;
    toDate: string;
    source: string;
  }>({
    user_id: "",
    user_name: "",
    module: "",
    action: "",
    fromDate: "",
    toDate: "",
    source: "",
  });

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      try {
        const [allActivities, summary] = await Promise.all([
          getAllUserActivity({ limit: 2000 }),
          getUserActivitySummary(),
        ]);
        setLogs(allActivities);
        setActivitySummary(summary);
      } catch (error) {
        console.error("Error fetching user activities:", error);
      }
      setIsLoading(false);
    }
    fetchLogs();
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (filters.user_id) {
      filtered = filtered.filter((log) =>
        log.user_id.toLowerCase().includes(filters.user_id.toLowerCase())
      );
    }
    if (filters.user_name) {
      filtered = filtered.filter(
        (log) =>
          log.user_name
            .toLowerCase()
            .includes(filters.user_name.toLowerCase()) ||
          log.user_email
            ?.toLowerCase()
            .includes(filters.user_name.toLowerCase())
      );
    }
    if (filters.module) {
      filtered = filtered.filter((log) =>
        log.module.toLowerCase().includes(filters.module.toLowerCase())
      );
    }
    if (filters.action) {
      filtered = filtered.filter((log) =>
        log.action.toLowerCase().includes(filters.action.toLowerCase())
      );
    }
    if (filters.source) {
      filtered = filtered.filter((log) => log.source === filters.source);
    }
    if (filters.fromDate) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) >= new Date(filters.fromDate)
      );
    }
    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999); // Include the whole day
      filtered = filtered.filter((log) => new Date(log.timestamp) <= toDate);
    }

    setFilteredLogs(filtered);
  }, [logs, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFilters((prev) => ({ ...prev, [id.replace("filter-", "")]: value }));
  };

  const handleSourceFilterChange = (value: string) => {
    setFilters((prev) => ({ ...prev, source: value }));
  };

  const handleExportExcel = () => {
    const dataToExport = filteredLogs.map((log) => ({
      Timestamp: log.timestamp,
      "User ID": log.user_id,
      "User Name": log.user_name,
      "User Email": log.user_email || "",
      Module: log.module,
      Action: log.action,
      Source: log.source,
      "IP Address": log.ip_address || "",
      "User Agent": log.user_agent || "",
      Details: log.details
        ? JSON.stringify(log.details)
        : log.table_name
        ? `Table: ${log.table_name}${
            log.record_id ? `, Record ID: ${log.record_id}` : ""
          }`
        : "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All User Activity");
    XLSX.writeFile(workbook, "complete_user_activity_report.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Complete User Activity Report", 14, 16);
    autoTable(doc, {
      head: [["Timestamp", "User", "Module", "Action", "Source", "Details"]],
      body: filteredLogs.map((log) => [
        new Date(log.timestamp).toLocaleString(),
        `${log.user_name}${log.user_email ? ` (${log.user_email})` : ""}`,
        log.module,
        log.action,
        log.source,
        log.details
          ? JSON.stringify(log.details)
          : log.table_name
          ? `${log.table_name}${log.record_id ? `:${log.record_id}` : ""}`
          : "",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 40 },
        4: { cellWidth: 25 },
        5: { cellWidth: "auto" },
      },
    });
    doc.save("complete_user_activity_report.pdf");
  };

  return (
    <>
      <PageHeader
        title="Complete User Activity Monitor"
        description="Comprehensive tracking of all user actions: file operations, database changes, and session activity across the entire system for complete audit and compliance."
      >
        <Button size="sm" variant="outline" onClick={handleExportExcel}>
          <Download className="mr-2 h-4 w-4" />{" "}
          <span className="lang-en">Export Excel</span>
          <span className="lang-th">ส่งออก Excel</span>
        </Button>
        <Button size="sm" variant="outline" onClick={handleExportPDF}>
          <Download className="mr-2 h-4 w-4" />{" "}
          <span className="lang-en">Export PDF</span>
          <span className="lang-th">ส่งออก PDF</span>
        </Button>
      </PageHeader>

      {/* Activity Summary */}
      {activitySummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Activities
                  </p>
                  <p className="text-2xl font-bold">
                    {activitySummary.total_activities.toLocaleString()}
                  </p>
                </div>
                <Badge variant="secondary">All Time</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Last 24 Hours
                  </p>
                  <p className="text-2xl font-bold">
                    {activitySummary.last_24_hours}
                  </p>
                </div>
                <Badge variant="default">Recent</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Users
                  </p>
                  <p className="text-2xl font-bold">
                    {activitySummary.active_users}
                  </p>
                </div>
                <Badge variant="outline">Unique</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Activity Sources
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>File Logs</span>
                    <span>{activitySummary.by_source.file_logs}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Database</span>
                    <span>{activitySummary.by_source.database_audits}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Sessions</span>
                    <span>{activitySummary.by_source.session_logs}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="lang-en">Complete Activity Viewer</span>
            <span className="lang-th">เครื่องมือดูกิจกรรมทั้งหมด</span>
          </CardTitle>
          <CardDescription>
            <span className="lang-en">
              Unified view of all user activities from multiple sources:
              application logs, database operations, and user sessions.
            </span>
            <span className="lang-th">
              มุมมองรวมของกิจกรรมผู้ใช้ทั้งหมดจากหลายแหล่งที่มา
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="filter-user_id" className="text-xs font-medium">
                  <span className="lang-en">User ID</span>
                  <span className="lang-th">รหัสผู้ใช้</span>
                </Label>
                <Input
                  id="filter-user_id"
                  placeholder="e.g., MAN-..."
                  value={filters.user_id}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="filter-user_name"
                  className="text-xs font-medium"
                >
                  <span className="lang-en">User Name</span>
                  <span className="lang-th">ชื่อผู้ใช้</span>
                </Label>
                <Input
                  id="filter-user_name"
                  placeholder="e.g., John Doe"
                  value={filters.user_name}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-module" className="text-xs font-medium">
                  <span className="lang-en">Module</span>
                  <span className="lang-th">โมดูล</span>
                </Label>
                <Input
                  id="filter-module"
                  placeholder="e.g., Purchase"
                  value={filters.module}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-action" className="text-xs font-medium">
                  <span className="lang-en">Action</span>
                  <span className="lang-th">การกระทำ</span>
                </Label>
                <Input
                  id="filter-action"
                  placeholder="e.g., Added"
                  value={filters.action}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="filter-fromDate"
                  className="text-xs font-medium"
                >
                  <span className="lang-en">From</span>
                  <span className="lang-th">จาก</span>
                </Label>
                <Input
                  id="filter-fromDate"
                  type="date"
                  value={filters.fromDate}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-toDate" className="text-xs font-medium">
                  <span className="lang-en">To</span>
                  <span className="lang-th">ถึง</span>
                </Label>
                <Input
                  id="filter-toDate"
                  type="date"
                  value={filters.toDate}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  <span className="lang-en">Source</span>
                  <span className="lang-th">แหล่งที่มา</span>
                </Label>
                <Select
                  value={filters.source}
                  onValueChange={handleSourceFilterChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All sources</SelectItem>
                    <SelectItem value="file_log">File Logs</SelectItem>
                    <SelectItem value="database_audit">
                      Database Audit
                    </SelectItem>
                    <SelectItem value="session_log">Session Logs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <span className="lang-en">Timestamp</span>
                    <span className="lang-th">เวลา</span>
                  </TableHead>
                  <TableHead>
                    <span className="lang-en">User</span>
                    <span className="lang-th">ผู้ใช้</span>
                  </TableHead>
                  <TableHead>
                    <span className="lang-en">Module</span>
                    <span className="lang-th">โมดูล</span>
                  </TableHead>
                  <TableHead>
                    <span className="lang-en">Action</span>
                    <span className="lang-th">การกระทำ</span>
                  </TableHead>
                  <TableHead>
                    <span className="lang-en">Source</span>
                    <span className="lang-th">แหล่งที่มา</span>
                  </TableHead>
                  <TableHead>
                    <span className="lang-en">Details</span>
                    <span className="lang-th">รายละเอียด</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow key="loading">
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.user_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {log.user_email || log.user_id}
                        </div>
                        {log.ip_address && (
                          <div className="text-xs text-muted-foreground">
                            IP: {log.ip_address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <p className="truncate">{log.action}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.source === "file_log"
                              ? "default"
                              : log.source === "database_audit"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {log.source === "file_log"
                            ? "File"
                            : log.source === "database_audit"
                            ? "DB"
                            : "Session"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <div className="space-y-1">
                          {log.details && (
                            <details className="cursor-pointer text-xs">
                              <summary className="text-muted-foreground">
                                View details
                              </summary>
                              <pre className="mt-1 text-xs whitespace-pre-wrap bg-muted p-2 rounded">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                          {log.table_name && (
                            <div className="text-xs">
                              <span className="font-medium">Table:</span>{" "}
                              {log.table_name}
                              {log.record_id && (
                                <span className="ml-2">
                                  <span className="font-medium">ID:</span>{" "}
                                  {log.record_id}
                                </span>
                              )}
                            </div>
                          )}
                          {log.session_info && (
                            <Badge
                              variant={
                                log.session_info.is_active
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {log.session_info.is_active ? "Active" : "Ended"}{" "}
                              Session
                            </Badge>
                          )}
                          {log.user_agent && (
                            <div
                              className="text-xs text-muted-foreground truncate max-w-xs"
                              title={log.user_agent}
                            >
                              {log.user_agent}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow key="no-results">
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <span className="lang-en">
                        No activities found matching your criteria.
                      </span>
                      <span className="lang-th">
                        ไม่พบกิจกรรมที่ตรงกับเกณฑ์ของคุณ
                      </span>
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
