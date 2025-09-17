
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/modules/shared/components/ui/ui/card';
import { Button } from '@/modules/shared/components/ui/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shared/components/ui/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/modules/shared/components/ui/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/modules/shared/components/ui/ui/alert-dialog"
import { PlusCircle, Pencil, Trash2, Loader2, FilterX } from 'lucide-react';
import { Badge } from '@/modules/shared/components/ui/ui/badge';
import { cn } from '@/modules/shared/utils/utils';
import { useToast } from '@/hooks/use-toast';
import { EmployeeFinanceForm } from '../forms/employee-finance-form';
import { getEmployeeAdjustments, saveEmployeeAdjustment, deleteEmployeeAdjustment } from '@/modules/finance/services/finance-actions';
import { getEmployees } from '@/modules/hr/services/hr-actions';
import { Label } from '@/modules/shared/components/ui/ui/label';
import { Input } from '@/modules/shared/components/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/shared/components/ui/ui/select';

export type Adjustment = {
  id: string;
  employee_id: string;
  type: 'Advance' | 'Deduction' | 'Employee Expense' | 'Bonus' | 'Addition';
  amount: number;
  date: string;
  installments?: number;
  remarks?: string;
};

const initialFormData: Omit<Adjustment, 'id'> = {
  employee_id: '',
  type: 'Deduction',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  installments: undefined,
  remarks: '',
};

interface EmployeeFinanceClientProps {
    onDataUpdate: () => void;
}

export function EmployeeFinanceClient({ onDataUpdate }: EmployeeFinanceClientProps) {
  const { toast } = useToast();
  const [allAdjustments, setAllAdjustments] = useState<Adjustment[]>([]);
  const [filteredAdjustments, setFilteredAdjustments] = useState<Adjustment[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<Omit<Adjustment, 'id'>>(initialFormData);
  const [editingRecord, setEditingRecord] = useState<Adjustment | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<Adjustment | null>(null);
  
  const [filters, setFilters] = useState({
      fromDate: '',
      toDate: '',
      employeeId: '',
      type: ''
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const data = await getEmployeeAdjustments();
    const emps = await getEmployees();
    setAllEmployees(emps);
    setAllAdjustments(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    let filtered = allAdjustments;

    if (filters.fromDate) {
        filtered = filtered.filter(adj => adj.date >= filters.fromDate);
    }
    if (filters.toDate) {
        filtered = filtered.filter(adj => adj.date <= filters.toDate);
    }
    if (filters.employeeId) {
        filtered = filtered.filter(adj => adj.employee_id === filters.employeeId);
    }
    if (filters.type) {
        filtered = filtered.filter(adj => adj.type === filters.type);
    }

    setFilteredAdjustments(filtered);
  }, [allAdjustments, filters]);
  
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
      setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  const clearFilters = () => {
    setFilters({ fromDate: '', toDate: '', employeeId: '', type: '' });
  };


  const handleFormSubmit = async () => {
    if (!formState.employee_id) {
        toast({
            title: "Validation Error",
            description: "Please select an employee.",
            variant: "destructive",
        });
        return;
    }
    if (!formState.type || !formState.amount) {
        toast({
            title: "Validation Error",
            description: "Please fill in all required fields: Type and Amount.",
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true);

    const dataToSave = editingRecord ? { ...formState, id: editingRecord.id } : formState;
    
    await saveEmployeeAdjustment(dataToSave, !!editingRecord);
    await fetchData(); // Refresh local data
    onDataUpdate(); // Refresh parent summary data

    toast({
      title: editingRecord ? "Adjustment Updated" : "Adjustment Added",
      description: `The financial adjustment for the employee has been saved.`,
    });
    
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  const handleOpenForm = (record: Adjustment | null) => {
    if (record) {
      setEditingRecord(record);
      setFormState(record);
    } else {
      setEditingRecord(null);
      setFormState(initialFormData);
    }
    setIsFormOpen(true);
  };

  const handleDeleteClick = (record: Adjustment) => {
    setRecordToDelete(record);
  };

  const handleDeleteConfirm = async () => {
    if (recordToDelete) {
      setIsLoading(true);
      await deleteEmployeeAdjustment(recordToDelete);
      await fetchData();
      onDataUpdate(); // Refresh parent summary data
      toast({
        title: "Adjustment Deleted",
        description: "The record has been permanently deleted.",
        variant: "destructive",
      });
      setRecordToDelete(null);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    return allEmployees.find(e => e.employee_id === employeeId)?.personal_info.name || employeeId || <span className="text-destructive">Missing</span>;
  }
  
  const typeStyles: { [key in Adjustment['type']]: string } = {
    'Bonus': 'text-green-700 border-green-300 bg-green-50 dark:text-green-300 dark:bg-green-900/50',
    'Addition': 'text-green-700 border-green-300 bg-green-50 dark:text-green-300 dark:bg-green-900/50',
    'Advance': 'text-red-700 border-red-300 bg-red-50 dark:text-red-300 dark:bg-red-900/50',
    'Deduction': 'text-red-700 border-red-300 bg-red-50 dark:text-red-300 dark:bg-red-900/50',
    'Employee Expense': 'text-red-700 border-red-300 bg-red-50 dark:text-red-300 dark:bg-red-900/50',
  };


  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingRecord(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenForm(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Employee Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Edit' : 'Add'} Employee Adjustment</DialogTitle>
              <DialogDescription>
                {editingRecord ? 'Update the details for this financial adjustment.' : 'Log a new bonus, deduction, or advance for an employee.'}
              </DialogDescription>
            </DialogHeader>
            <EmployeeFinanceForm
              formData={formState}
              setFormData={setFormState}
              onSubmit={handleFormSubmit}
              onCancel={() => { setIsFormOpen(false); setEditingRecord(null); }}
              isEditing={!!editingRecord}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Adjustments</CardTitle>
          <CardDescription>
            A log of all non-payroll financial adjustments for employees.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="fromDate" className="text-xs">From Date</Label>
                        <Input id="fromDate" type="date" value={filters.fromDate} onChange={e => handleFilterChange('fromDate', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="toDate" className="text-xs">To Date</Label>
                        <Input id="toDate" type="date" value={filters.toDate} onChange={e => handleFilterChange('toDate', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="employeeId" className="text-xs">Employee</Label>
                        <Select value={filters.employeeId} onValueChange={value => handleFilterChange('employeeId', value)}>
                            <SelectTrigger><SelectValue placeholder="All Employees"/></SelectTrigger>
                            <SelectContent>
                                {allEmployees.map(e => <SelectItem key={e.employee_id} value={e.employee_id}>{e.personal_info.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="type" className="text-xs">Type</Label>
                        <Select value={filters.type} onValueChange={value => handleFilterChange('type', value)}>
                            <SelectTrigger><SelectValue placeholder="All Types"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Bonus">Bonus</SelectItem>
                                <SelectItem value="Addition">Addition</SelectItem>
                                <SelectItem value="Advance">Advance</SelectItem>
                                <SelectItem value="Deduction">Deduction</SelectItem>
                                <SelectItem value="Employee Expense">Employee Expense</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <Button variant="outline" onClick={clearFilters} className="w-full lg:w-auto">
                        <FilterX className="mr-2 h-4 w-4" /> Clear
                     </Button>
                </div>
            </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount (฿)</TableHead>
                <TableHead className="text-center">Installments</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : filteredAdjustments.length > 0 ? (
                filteredAdjustments.map((adj) => (
                  <TableRow key={adj.id}>
                    <TableCell>{new Date(adj.date).toLocaleDateString('en-CA')}</TableCell>
                    <TableCell>{getEmployeeName(adj.employee_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(typeStyles[adj.type])}>
                        {adj.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{adj.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-center">{adj.installments || 'N/A'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{adj.remarks || '-'}</TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenForm(adj)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(adj)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No adjustments found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the adjustment record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}




