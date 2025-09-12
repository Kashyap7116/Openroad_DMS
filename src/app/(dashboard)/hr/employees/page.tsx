
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Pencil, Eye, Download, Loader2, UserX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeForm } from '@/components/employee-form';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmployeeDetailsDialog } from '@/components/employee-details-dialog';
import * as XLSX from 'xlsx';
import { Label } from '@/components/ui/label';
import { getEmployees, saveEmployee, getCountries, deleteEmployee } from '@/lib/hr-actions';
import { useToast } from '@/hooks/use-toast';


// This type might need adjustment if the getEmployees action returns a more specific type
export type EmployeeRecord = any;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EmployeeRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<EmployeeRecord | null>(null);
  const [filters, setFilters] = useState<{ name: string; department: string; status: string; }>({ name: '', department: '', status: '' });
  const { toast } = useToast();
  const [countries, setCountries] = useState<{name: string, code: string}[]>([]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    const [employeesData, countriesData] = await Promise.all([
      getEmployees(),
      getCountries()
    ]);
    setEmployees(employeesData);
    setCountries(countriesData);
    setIsLoading(false);
  };
  
  useEffect(() => {
    fetchInitialData();
  }, []);

  const refreshEmployees = async () => {
      setIsLoading(true);
      const data = await getEmployees();
      setEmployees(data);
      setIsLoading(false);
  }

  useEffect(() => {
    let filtered = employees;

    if (filters.name) {
      filtered = filtered.filter(emp => 
        emp.personal_info.name.toLowerCase().includes(filters.name.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(filters.name.toLowerCase())
      );
    }
    if (filters.department) {
      filtered = filtered.filter(emp => emp.job_details.department.toLowerCase().includes(filters.department.toLowerCase()));
    }
    if (filters.status) {
      filtered = filtered.filter(emp => emp.job_details.status.toLowerCase().includes(filters.status.toLowerCase()));
    }

    setFilteredEmployees(filtered);
  }, [employees, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFilters(prev => ({ ...prev, [id.replace('filter-','')]: value }));
  };

  const clearFilters = () => {
    setFilters({ name: '', department: '', status: '' });
  };

  const handleFormSubmit = async (data: EmployeeRecord) => {
    setIsLoading(true);
    
    const result = await saveEmployee(editingRecord?.employee_id || null, data);
    
    if(result.success) {
        await refreshEmployees();
        setIsFormOpen(false);
        setEditingRecord(null);
        toast({
            title: editingRecord ? "Employee Updated" : "Employee Added",
            description: `Record for ${data.personal_info.name} (ID: ${result.employee_id}) has been successfully saved.`
        });
    } else {
        toast({
            title: "Error",
            description: result.error || "An unknown error occurred.",
            variant: "destructive"
        });
    }
    
    setIsLoading(false);
  };
  
  const handleOpenForm = (record?: EmployeeRecord | null) => {
    setEditingRecord(record || null);
    setIsFormOpen(true);
  };
  
  const handleViewDetails = (record: EmployeeRecord) => {
    setSelectedRecord(record);
    setIsDetailsOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setRecordToDelete(id);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (recordToDelete) {
        const result = await deleteEmployee(recordToDelete);
        if (result.success) {
            await refreshEmployees();
            toast({
                title: "Employee Status Updated",
                description: "The employee has been marked as 'Left'.",
                variant: "destructive"
            });
        } else {
             toast({
                title: "Error",
                description: result.error || "Failed to update employee status.",
                variant: "destructive"
            });
        }
    }
    setIsDeleteConfirmOpen(false);
    setRecordToDelete(null);
  };
  
  const handleExportExcel = () => {
    const dataToExport = filteredEmployees.map(emp => ({
        "Employee ID": emp.employee_id,
        "Name": emp.personal_info.name,
        "Department": emp.job_details.department,
        "Position": emp.job_details.position,
        "Joining Date": emp.job_details.joining_date,
        "Salary": emp.job_details.salary,
        "Status": emp.job_details.status,
        "Contact": emp.personal_info.contact,
        "Address": emp.personal_info.address
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employee_report.xlsx");
  };


  return (
    <>
      <PageHeader
        title="Employee Management"
        description="Manage all employee records, from personal details to job roles."
      >
         <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingRecord(null); }}>
             <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="lang-en">Add Employee</span>
                    <span className="lang-th">เพิ่มพนักงาน</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                    <span className="lang-en">{editingRecord ? 'Edit' : 'Add'} Employee Record</span>
                    <span className="lang-th">{editingRecord ? 'แก้ไข' : 'เพิ่ม'} บันทึกพนักงาน</span>
                </DialogTitle>
                <DialogDescription>
                  <span className="lang-en">{editingRecord ? 'Update the details for this employee.' : 'Fill out the form to add a new employee to the system.'}</span>
                  <span className="lang-th">{editingRecord ? 'อัปเดตรายละเอียดสำหรับพนักงานนี้' : 'กรอกแบบฟอร์มเพื่อเพิ่มพนักงานใหม่ในระบบ'}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="flex-grow overflow-hidden">
                <EmployeeForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => { setIsFormOpen(false); setEditingRecord(null); }}
                  initialData={editingRecord}
                  countries={countries}
                />
              </div>
            </DialogContent>
        </Dialog>
      </PageHeader>
      
      <Card>
          <CardHeader>
            <CardTitle><span className="lang-en">Employee List</span><span className="lang-th">รายชื่อพนักงาน</span></CardTitle>
            <CardDescription><span className="lang-en">A complete list of all employees in the system.</span><span className="lang-th">รายชื่อพนักงานทั้งหมดในระบบ</span></CardDescription>
          </CardHeader>
          <CardContent>
             <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                      <div className="space-y-2">
                          <Label htmlFor="filter-name" className="text-xs font-medium text-gray-500"><span className="lang-en">Name:</span><span className="lang-th">ชื่อ:</span></Label>
                          <Input id="filter-name" placeholder="Employee name or ID..." className="bg-white dark:bg-gray-900" value={filters.name} onChange={handleFilterChange}/>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="filter-department" className="text-xs font-medium text-gray-500"><span className="lang-en">Department:</span><span className="lang-th">แผนก:</span></Label>
                          <Input id="filter-department" placeholder="e.g., Sales" className="bg-white dark:bg-gray-900" value={filters.department} onChange={handleFilterChange}/>
                      </div>
                       <div className="space-y-2">
                          <Label htmlFor="filter-status" className="text-xs font-medium text-gray-500"><span className="lang-en">Status:</span><span className="lang-th">สถานะ:</span></Label>
                          <Input id="filter-status" placeholder="Active / Inactive / Left" className="bg-white dark:bg-gray-900" value={filters.status} onChange={handleFilterChange}/>
                      </div>
                       <div className="flex items-end gap-2 col-span-full lg:col-span-2 lg:col-start-4">
                         <Button variant="outline" className="w-full" onClick={clearFilters}><span className="lang-en">Clear</span><span className="lang-th">ล้าง</span></Button>
                         <Button className="w-full" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" /> <span className="lang-en">Export</span><span className="lang-th">ส่งออก</span></Button>
                      </div>
                  </div>
              </div>
            <div className="overflow-x-auto">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><span className="lang-en">Employee</span><span className="lang-th">พนักงาน</span></TableHead>
                    <TableHead><span className="lang-en">Department</span><span className="lang-th">แผนก</span></TableHead>
                    <TableHead><span className="lang-en">Position</span><span className="lang-th">ตำแหน่ง</span></TableHead>
                    <TableHead className="text-right"><span className="lang-en">Salary</span><span className="lang-th">เงินเดือน</span></TableHead>
                    <TableHead><span className="lang-en">Status</span><span className="lang-th">สถานะ</span></TableHead>
                    <TableHead className="text-center"><span className="lang-en">Actions</span><span className="lang-th">การกระทำ</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                  ) : filteredEmployees.length > 0 ? (
                    filteredEmployees.map((record) => (
                        <TableRow key={record.employee_id}>
                           <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={record.documents.photo as string} alt={record.personal_info.name} />
                                <AvatarFallback>{record.personal_info.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{record.personal_info.name}</div>
                                <div className="text-sm text-muted-foreground">{record.employee_id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{record.job_details.department}</TableCell>
                          <TableCell>{record.job_details.position}</TableCell>
                          <TableCell className="text-right font-mono">฿{record.job_details.salary.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                                record.job_details.status === 'Active' ? 'text-green-700 border-green-300 bg-green-50' :
                                record.job_details.status === 'Inactive' ? 'text-yellow-700 border-yellow-300 bg-yellow-50' :
                                record.job_details.status === 'Left' ? 'text-red-700 border-red-300 bg-red-50' :
                                ''
                            )}>
                                {record.job_details.status}
                            </Badge>
                          </TableCell>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={() => handleViewDetails(record)}>
                                  <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => handleOpenForm(record)}>
                                  <Pencil className="h-4 w-4" />
                              </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDeleteClick(record.employee_id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                          </td>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <span className="lang-en">No employees found. Click "Add Employee" to create a new record.</span>
                        <span className="lang-th">ไม่พบพนักงาน คลิก "เพิ่มพนักงาน" เพื่อสร้างบันทึกใหม่</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {selectedRecord && (
             <EmployeeDetailsDialog
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                record={selectedRecord}
            />
        )}
        
         <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                    <span className="lang-en">Are you absolutely sure?</span>
                    <span className="lang-th">คุณแน่ใจหรือไม่?</span>
                </AlertDialogTitle>
                <AlertDialogDescription>
                    <span className="lang-en">This will mark the employee's status as "Left". The record will not be permanently deleted.</span>
                    <span className="lang-th">การดำเนินการนี้จะเปลี่ยนสถานะพนักงานเป็น "ออก" บันทึกจะไม่ถูกลบอย่างถาวร</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRecordToDelete(null)}><span className="lang-en">Cancel</span><span className="lang-th">ยกเลิก</span></AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90"><span className="lang-en">Mark as Left</span><span className="lang-th">ทำเครื่องหมายว่าออก</span></AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
