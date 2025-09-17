"use client";

import type {
  AttendanceRecord,
  EnrichedAttendanceRecord,
  GroupedAttendance,
} from "@/app/(dashboard)/hr/attendance/page";
import { useToast } from "@/hooks/use-toast";
import { saveAttendanceData } from "@/modules/hr/services/hr-actions";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/modules/shared/components/ui/ui/avatar";
import { Badge } from "@/modules/shared/components/ui/ui/badge";
import { Button } from "@/modules/shared/components/ui/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/modules/shared/components/ui/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui/ui/table";
import { cn } from "@/modules/shared/utils/utils";
import { ChevronDown, Loader2, Pencil } from "lucide-react";
import React, { useState } from "react";
import { AttendanceForm } from "../../forms/attendance-form";

interface AttendanceTableProps {
  groupedData: GroupedAttendance[];
  isLoading: boolean;
  onUpdateRecord: () => void;
}

export function AttendanceTable({
  groupedData,
  isLoading,
  onUpdateRecord,
}: AttendanceTableProps) {
  const { toast } = useToast();
  const [isEditOpen, setEditOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<AttendanceRecord | null>(
    null
  );
  const [openCollapsibles, setOpenCollapsibles] = useState<string[]>([]);

  const toggleCollapsible = (id: string) => {
    setOpenCollapsibles((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleEditClick = (record: EnrichedAttendanceRecord) => {
    const { raw_overtime_hours, payable_overtime_hours, ...basicRecord } =
      record;
    setRecordToEdit(basicRecord);
    setEditOpen(true);
  };

  const handleUpdateRecord = async (updatedRecord: AttendanceRecord) => {
    setEditOpen(false);

    // In a real-world scenario, you would call an API to update just one record.
    // Here, we simulate by reading the whole month's file, updating it, and saving back.
    const recordDate = new Date(updatedRecord.date);
    const year = recordDate.getFullYear();
    const month = recordDate.getMonth() + 1;

    try {
      const response = await fetch(
        `/api/hr/attendance?year=${year}&month=${month}`
      );
      const rawData = await response.json();

      const updatedRawData = rawData.map((r: any) =>
        r.date === updatedRecord.date &&
        r.employee_id === updatedRecord.employee_id
          ? { ...r, ...updatedRecord }
          : r
      );
      await saveAttendanceData(year, month, updatedRawData);
      onUpdateRecord(); // This will trigger a re-fetch and re-process in the parent
      toast({
        title: "Record Updated",
        description: `Attendance for ${updatedRecord.name} on ${updatedRecord.date} has been updated.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to update record.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-4 text-muted-foreground">Loading attendance data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[350px]">Employee</TableHead>
              <TableHead className="text-center">Present</TableHead>
              <TableHead className="text-center">Late</TableHead>
              <TableHead className="text-center">Absent</TableHead>
              <TableHead className="text-center">Leave/Hol</TableHead>
              <TableHead className="text-center">Raw OT (Hrs)</TableHead>
              <TableHead className="text-center font-bold">
                Payable OT (Hrs)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedData.length > 0 ? (
              groupedData.map((group) => {
                const isOpen = openCollapsibles.includes(group.employee_id);
                return (
                  <React.Fragment key={group.employee_id}>
                    <TableRow
                      className="cursor-pointer group"
                      onClick={() => toggleCollapsible(group.employee_id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3 w-full">
                          <Avatar>
                            <AvatarImage
                              src={group.photo || ""}
                              alt={group.name}
                            />
                            <AvatarFallback>
                              {group.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{group.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {group.employee_id}
                            </div>
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 ml-auto text-muted-foreground transition-transform",
                              isOpen && "rotate-180"
                            )}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {group.present}
                      </TableCell>
                      <TableCell className="text-center">
                        {group.late}
                      </TableCell>
                      <TableCell className="text-center">
                        {group.absent}
                      </TableCell>
                      <TableCell className="text-center">
                        {group.leave + group.holiday}
                      </TableCell>
                      <TableCell className="text-center">
                        {group.total_raw_overtime.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {group.total_payable_overtime.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                            <h4 className="font-semibold mb-2">Daily Log</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Day</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>In</TableHead>
                                  <TableHead>Out</TableHead>
                                  <TableHead>Raw OT</TableHead>
                                  <TableHead>Payable OT</TableHead>
                                  <TableHead>Remarks</TableHead>
                                  <TableHead className="text-right">
                                    Actions
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.records.map((rec) => {
                                  const recordDate = new Date(
                                    rec.date.replace(/-/g, "/")
                                  );
                                  return (
                                    <TableRow key={rec.date}>
                                      <TableCell>
                                        {recordDate.toLocaleDateString(
                                          "en-GB",
                                          {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                          }
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {recordDate.toLocaleDateString(
                                          "en-GB",
                                          { weekday: "long" }
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            rec.status === "Present" &&
                                              "text-green-700 border-green-300 bg-green-50 dark:text-green-300 dark:bg-green-900/50",
                                            rec.status === "Late" &&
                                              "text-yellow-700 border-yellow-300 bg-yellow-50 dark:text-yellow-300 dark:bg-yellow-900/50",
                                            rec.status === "Absent" &&
                                              "text-red-700 border-red-300 bg-red-50 dark:text-red-300 dark:bg-red-900/so",
                                            rec.status === "Leave" &&
                                              "text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/50",
                                            rec.status === "Holiday" &&
                                              "text-purple-700 border-purple-300 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/50"
                                          )}
                                        >
                                          {rec.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {rec.in_time || "--:--"}
                                      </TableCell>
                                      <TableCell>
                                        {rec.out_time || "--:--"}
                                      </TableCell>
                                      <TableCell>
                                        {(rec.raw_overtime_hours || 0) > 0
                                          ? `${rec.raw_overtime_hours.toFixed(
                                              2
                                            )}`
                                          : "-"}
                                      </TableCell>
                                      <TableCell className="font-semibold">
                                        {(rec.payable_overtime_hours || 0) > 0
                                          ? `${rec.payable_overtime_hours.toFixed(
                                              2
                                            )}`
                                          : "-"}
                                      </TableCell>
                                      <TableCell className="max-w-[150px] truncate">
                                        {rec.remarks || "-"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleEditClick(rec)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No attendance data for this month.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogDescription>
              Update the attendance record. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {recordToEdit && (
            <AttendanceForm
              record={recordToEdit}
              onSubmit={handleUpdateRecord}
              onCancel={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
