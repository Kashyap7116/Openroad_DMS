
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Trash2,
  Save,
  Loader2,
  Calendar as CalendarIcon,
  UserCheck,
  UserX,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/stat-card';
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { processAttendanceFile } from '@/ai/flows/process-attendance-file';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { saveAttendanceData, saveAttendanceRules, getProcessedAttendance } from '@/lib/hr-actions';
import { Checkbox } from '@/components/ui/checkbox';
import { AttendanceTable } from '@/components/hr/attendance-table';
import { UploadDialog } from '@/components/hr/upload-dialog';
import { HolidayDialog } from '@/components/hr/holiday-dialog';

export type AttendanceRecord = {
  employee_id: string;
  name: string;
  date: string;
  status: 'Present' | 'Late' | 'Absent' | 'Leave' | 'Holiday';
  in_time: string;
  out_time: string;
  remarks?: string;
};

export type EnrichedAttendanceRecord = AttendanceRecord & {
  raw_overtime_hours?: number;
  payable_overtime_hours?: number;
};


export type GroupedAttendance = {
  employee_id: string;
  name: string;
  photo: string | null;
  present: number;
  late: number;
  absent: number;
  leave: number;
  holiday: number;
  total_raw_overtime: number;
  total_payable_overtime: number;
  records: EnrichedAttendanceRecord[];
};

const years = [new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() -1];
const months = [
  { value: 1, label: 'Jan', th: 'ม.ค.' }, 
  { value: 2, label: 'Feb', th: 'ก.พ.' }, 
  { value: 3, label: 'Mar', th: 'มี.ค.' },
  { value: 4, label: 'Apr', th: 'เม.ย.' }, 
  { value: 5, label: 'May', th: 'พ.ค.' }, 
  { value: 6, 'label': 'Jun', th: 'มิ.ย.' },
  { value: 7, label: 'Jul', th: 'ก.ค.' }, 
  { value: 8, label: 'Aug', th: 'ส.ค.' }, 
  { value: 9, 'label': 'Sep', th: 'ก.ย.' },
  { value: 10, label: 'Oct', th: 'ต.ค.' }, 
  { value: 11, 'label': 'Nov', th: 'พ.ย.' }, 
  { value: 12, 'label': 'Dec', th: 'ธ.ค.' },
];

export default function AttendancePage() {
  const { toast } = useToast();
  const [groupedData, setGroupedData] = useState<GroupedAttendance[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isHolidaysOpen, setHolidaysOpen] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLogic, setIsSavingLogic] = useState(false);
  const [attendanceRules, setAttendanceRules] = useState<any>(null);

  // Logic settings states
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [weeklyHolidays, setWeeklyHolidays] = useState<number[]>([]);
  const [minOTMinutes, setMinOTMinutes] = useState(0);
  
  const loadAndSetRules = useCallback((rules: any) => {
    setAttendanceRules(rules);
    if(rules) {
      setInTime(rules.standard_work_hours?.in_time || '');
      setOutTime(rules.standard_work_hours?.out_time || '');
      setWeeklyHolidays(rules.weekly_holidays || []);
      setMinOTMinutes(rules.overtime_rules?.minimum_minutes_after_out_time || 0);
    }
  }, []);

  const fetchData = useCallback(async (year: number, month: number) => {
    setIsLoading(true);
    try {
        const { groupedData, rules } = await getProcessedAttendance(year, month);
        setGroupedData(groupedData);
        loadAndSetRules(rules);
    } catch(e) {
        console.error("Failed to fetch or process data:", e);
        toast({ title: "Error", description: "Could not load attendance data.", variant: "destructive"});
        setGroupedData([]);
    } finally {
        setIsLoading(false);
    }
  }, [toast, loadAndSetRules]);

  useEffect(() => {
    fetchData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchData]);

  const handleProcessUpload = async (fileDataUri: string) => {
    setIsLoading(true);
    try {
        const { year, month, records } = await processAttendanceFile({ fileDataUri });
        const saveResult = await saveAttendanceData(year, month, records);

        if (!saveResult.success) {
            throw new Error(saveResult.error || 'Failed to save data on the server.');
        }
        
        const prevMonthName = months.find(m => m.value === (month === 1 ? 12 : month - 1))?.label;
        const currentMonthName = months.find(m => m.value === month)?.label;

        toast({
            title: "File Processed Successfully",
            description: `AI has processed the file for ${prevMonthName} - ${currentMonthName} ${year}. The new data is now available.`,
        });

        if (year === selectedYear && month === selectedMonth) {
          await fetchData(year, month);
        } else {
          setSelectedYear(year);
          setSelectedMonth(month);
        }
    } catch (error) {
        console.error("AI processing failed:", error);
        toast({
            title: "Processing Failed",
            description: "The AI failed to process the file. Please check the file format and try again.",
            variant: "destructive",
        });
    } finally {
        setUploadOpen(false);
        setIsLoading(false);
    }
  };

  const handleDeleteMonthData = async () => {
    await saveAttendanceData(selectedYear, selectedMonth, []);
    await fetchData(selectedYear, selectedMonth);
    setDeleteConfirmOpen(false);
    toast({
      title: "Data Deleted",
      description: `All attendance records for the selected period have been deleted.`,
      variant: "destructive"
    });
  }

  const handleHolidayChange = (day: number, checked: boolean) => {
    setWeeklyHolidays(prev => 
      checked ? [...prev, day] : prev.filter(d => d !== day)
    );
  };

  const handleSaveLogic = async () => {
      setIsSavingLogic(true);
      const newRules = {
          ...attendanceRules,
          standard_work_hours: {
              in_time: inTime,
              out_time: outTime,
          },
          overtime_rules: {
              ...attendanceRules.overtime_rules,
              minimum_minutes_after_out_time: minOTMinutes,
          },
          weekly_holidays: weeklyHolidays,
      };
      
      const result = await saveAttendanceRules(newRules);
      if (result.success) {
          toast({ title: "Logic Saved", description: "Your new attendance rules have been saved successfully." });
          await fetchData(selectedYear, selectedMonth); // Re-fetch data to re-calculate with new rules
      } else {
          toast({ title: "Error", description: `Failed to save rules: ${result.error}`, variant: "destructive" });
      }
      setIsSavingLogic(false);
  };

  const summaryStats = useMemo(() => {
    return {
      totalPresent: groupedData.reduce((acc, g) => acc + g.present, 0),
      totalLate: groupedData.reduce((acc, g) => acc + g.late, 0),
      totalAbsent: groupedData.reduce((acc, g) => acc + g.absent, 0),
      totalLeave: groupedData.reduce((acc, g) => acc + g.leave, 0),
    }
  }, [groupedData]);
  
  const getPeriodLabel = (year: number, month: number) => {
      const prevMonthIndex = month === 1 ? 11 : month - 2;
      const currentMonthIndex = month - 1;
      const prevMonthName = months[prevMonthIndex].label;
      const currentMonthName = months[currentMonthIndex].label;
      const prevMonthYear = month === 1 ? year - 1 : year;
      return `${prevMonthName} ${prevMonthYear} - ${currentMonthName} ${year}`;
  };
  
  const currentPeriodLabel = getPeriodLabel(selectedYear, selectedMonth);


  if (isLoading && !groupedData.length) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary"/></div>;
  }

  return (
    <>
      <PageHeader
        title="Employee Attendance"
        description="Track and manage employee attendance records, leaves, and work hours."
      >
        <Dialog open={isUploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="mr-2 h-4 w-4" />
              <span className="lang-en">Upload Sheet</span>
              <span className="lang-th">อัปโหลดไฟล์</span>
            </Button>
          </DialogTrigger>
          <UploadDialog onSubmit={handleProcessUpload} onCancel={() => setUploadOpen(false)} />
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mb-8">
        <StatCard title="Total Present" value={summaryStats.totalPresent.toString()} icon={UserCheck} iconBgColor="bg-green-100 dark:bg-green-900" iconColor="text-green-500 dark:text-green-300" />
        <StatCard title="Total Late" value={summaryStats.totalLate.toString()} icon={Clock} iconBgColor="bg-yellow-100 dark:bg-yellow-900" iconColor="text-yellow-500 dark:text-yellow-300" />
        <StatCard title="Total Absent" value={summaryStats.totalAbsent.toString()} icon={UserX} iconBgColor="bg-red-100 dark:bg-red-900" iconColor="text-red-500 dark:text-red-300" />
        <StatCard title="Total On Leave" value={summaryStats.totalLeave.toString()} icon={CalendarIcon} iconBgColor="bg-blue-100 dark:bg-blue-900" iconColor="text-blue-500 dark:text-blue-300" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle><span className="lang-en">Attendance Log</span><span className="lang-th">บันทึกการเข้างาน</span></CardTitle>
              <CardDescription>
                <span className="lang-en">Showing records for {currentPeriodLabel}.</span>
                {groupedData.length === 0 && !isLoading && <span className="text-destructive font-semibold ml-2"><span className="lang-en">No data available.</span><span className="lang-th">ไม่มีข้อมูล</span></span>}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue>
                         {`${months[selectedMonth === 1 ? 11 : selectedMonth - 2].label} - ${months[selectedMonth - 1].label}`}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={String(m.value)}><span className="lang-en">{`${months[m.value === 1 ? 11 : m.value - 2].label} - ${m.label}`}</span><span className="lang-th">{`${months[m.value === 1 ? 11 : m.value - 2].th} - ${m.th}`}</span></SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              {groupedData.length > 0 &&
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            </div>
          </div>
           <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                   <div className="space-y-2">
                    <Label htmlFor="inTime"><span className="lang-en">Standard In-Time</span><span className="lang-th">เวลาเข้างานมาตรฐาน</span></Label>
                    <Input id="inTime" type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outTime"><span className="lang-en">Standard Out-Time</span><span className="lang-th">เวลาออกงานมาตรฐาน</span></Label>
                    <Input id="outTime" type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} />
                  </div>
                   <Dialog open={isHolidaysOpen} onOpenChange={setHolidaysOpen}>
                    <DialogTrigger asChild>
                       <Button variant="outline" className="w-full justify-start"><CalendarIcon className="mr-2 h-4 w-4"/> <span className="lang-en">Manage Holidays</span><span className="lang-th">จัดการวันหยุด</span></Button>
                    </DialogTrigger>
                     <HolidayDialog year={selectedYear} onCancel={() => setHolidaysOpen(false)} onSave={() => fetchData(selectedYear, selectedMonth)} />
                  </Dialog>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="minOTMinutes"><span className="lang-en">Min OT (Mins)</span><span className="lang-th">OT ขั้นต่ำ (นาที)</span></Label>
                      <Input id="minOTMinutes" type="number" value={minOTMinutes} onChange={(e) => setMinOTMinutes(parseInt(e.target.value) || 0)} />
                  </div>
                   <div className="space-y-2">
                    <Label><span className="lang-en">Weekly Holidays</span><span className="lang-th">วันหยุดประจำสัปดาห์</span></Label>
                    <div className="flex items-center space-x-4 h-10">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="sunday" checked={weeklyHolidays.includes(0)} onCheckedChange={(checked) => handleHolidayChange(0, !!checked)} />
                        <Label htmlFor="sunday" className="font-normal"><span className="lang-en">Sunday</span><span className="lang-th">วันอาทิตย์</span></Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="saturday" checked={weeklyHolidays.includes(6)} onCheckedChange={(checked) => handleHolidayChange(6, !!checked)} />
                        <Label htmlFor="saturday" className="font-normal"><span className="lang-en">Saturday</span><span className="lang-th">วันเสาร์</span></Label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 flex flex-col justify-end">
                   <Button onClick={handleSaveLogic} disabled={isSavingLogic} className="w-full">
                      {isSavingLogic ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                      <span className="lang-en">Save Logic & Recalculate</span>
                      <span className="lang-th">บันทึกและคำนวณใหม่</span>
                    </Button>
                </div>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <AttendanceTable
            groupedData={groupedData}
            isLoading={isLoading}
            onUpdateRecord={() => fetchData(selectedYear, selectedMonth)}
          />
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
                <span className="lang-en">Are you absolutely sure?</span>
                <span className="lang-th">คุณแน่ใจหรือไม่?</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="lang-en">This action cannot be undone. This will permanently delete all attendance records for {' '}
              <strong>{currentPeriodLabel}</strong>.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel><span className="lang-en">Cancel</span><span className="lang-th">ยกเลิก</span></AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMonthData} className="bg-destructive hover:bg-destructive/90"><span className="lang-en">Delete</span><span className="lang-th">ลบ</span></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
