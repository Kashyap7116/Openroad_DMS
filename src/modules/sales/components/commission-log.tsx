
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from "@/modules/shared/components/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/modules/shared/components/ui/ui/card";
import { Loader2, Trash2, Pencil, FilterX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/modules/shared/components/ui/ui/alert-dialog";
import { Input } from '@/modules/shared/components/ui/ui/input';
import { Label } from '@/modules/shared/components/ui/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';
import { deleteSalesCommission } from '@/modules/sales/services/sales-actions';
import { Combobox } from '@/modules/shared/components/ui/ui/combobox';
import type { Option } from '@/modules/shared/components/ui/ui/multi-select';

type CommissionRecord = {
  transaction_id: string;
  date: string;
  remarks: string;
  amount: number;
  license_plate: string;
  vehicle: string;
  employees: string[];
};

interface CommissionLogProps {
  vehicles: VehicleRecord[];
  employees: any[];
  isLoading: boolean;
  onUpdate: () => void;
}

export function CommissionLog({ vehicles, employees, isLoading, onUpdate }: CommissionLogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<CommissionRecord | null>(null);

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    employeeId: '',
    vehicleId: '',
    minAmount: '',
    maxAmount: ''
  });

  const allCommissions = useMemo<CommissionRecord[]>(() => {
    return vehicles.flatMap(v => 
      (v.financial_history || [])
        .filter(tx => tx.category === 'Sales Commission')
        .map(tx => ({
          ...tx,
          license_plate: v.license_plate,
          vehicle: v.vehicle,
          employees: tx.remarks.match(/for (.*?)\./)?.[1].split(', ') || []
        }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [vehicles]);
  
  const filteredCommissions = useMemo(() => {
    return allCommissions.filter(c => {
        if(filters.fromDate && c.date < filters.fromDate) return false;
        if(filters.toDate && c.date > filters.toDate) return false;
        if(filters.employeeId && !c.employees.includes(filters.employeeId)) return false;
        if(filters.vehicleId && c.license_plate !== filters.vehicleId) return false;
        if(filters.minAmount && c.amount < Number(filters.minAmount)) return false;
        if(filters.maxAmount && c.amount > Number(filters.maxAmount)) return false;
        return true;
    });
  }, [allCommissions, filters]);

  const employeeOptions: Option[] = useMemo(() => 
      employees.map(e => ({ value: e.employee_id, label: e.personal_info.name }))
  , [employees]);

  const vehicleOptions: Option[] = useMemo(() =>
      vehicles.filter(v => v.status === 'Sold').map(v => ({ value: v.id, label: `${v.vehicle} (${v.license_plate})` }))
  , [vehicles]);

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({...prev, [field]: value}));
  };
  
  const clearFilters = () => {
      setFilters({ fromDate: '', toDate: '', employeeId: '', vehicleId: '', minAmount: '', maxAmount: '' });
  };

  const handleDeleteClick = (record: CommissionRecord) => {
    setRecordToDelete(record);
  };
  
  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    const result = await deleteSalesCommission(recordToDelete.transaction_id, recordToDelete.license_plate);
    if(result.success) {
        toast({ title: 'Commission Deleted', description: 'The commission record has been successfully deleted.' });
        onUpdate();
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive'});
    }
    setRecordToDelete(null);
    setIsDeleting(false);
  };

  const getEmployeeNames = (ids: string[]) => {
      return ids.map(id => employees.find(e => e.employee_id === id)?.personal_info.name || id).join(', ');
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sales Commission Log</CardTitle>
          <CardDescription>A record of all commissions paid out for vehicle sales.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                     <div className="space-y-2">
                        <Label htmlFor="fromDate" className="text-xs">From Date</Label>
                        <Input id="fromDate" type="date" value={filters.fromDate} onChange={(e) => handleFilterChange('fromDate', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="toDate" className="text-xs">To Date</Label>
                        <Input id="toDate" type="date" value={filters.toDate} onChange={(e) => handleFilterChange('toDate', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="employeeId" className="text-xs">Employee</Label>
                        <Combobox options={employeeOptions} value={filters.employeeId} onChange={(v) => handleFilterChange('employeeId', v)} placeholder="All Employees" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="vehicleId" className="text-xs">Vehicle</Label>
                        <Combobox options={vehicleOptions} value={filters.vehicleId} onChange={(v) => handleFilterChange('vehicleId', v)} placeholder="All Vehicles" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="minAmount" className="text-xs">Min Amount</Label>
                        <Input id="minAmount" type="number" placeholder="e.g. 1000" value={filters.minAmount} onChange={(e) => handleFilterChange('minAmount', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="maxAmount" className="text-xs">Max Amount</Label>
                        <Input id="maxAmount" type="number" placeholder="e.g. 5000" value={filters.maxAmount} onChange={(e) => handleFilterChange('maxAmount', e.target.value)} />
                    </div>
                    <div className="lg:col-span-3">
                         <Button variant="outline" onClick={clearFilters} className="w-full"><FilterX className="mr-2 h-4 w-4"/> Clear All Filters</Button>
                    </div>
                </div>
            </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Total Commission</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : filteredCommissions.length > 0 ? (
                  filteredCommissions.map((record) => (
                    <TableRow key={record.transaction_id}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.vehicle} ({record.license_plate})</TableCell>
                      <TableCell className="max-w-xs truncate">{getEmployeeNames(record.employees)}</TableCell>
                      <TableCell className="text-right font-mono">฿{record.amount.toLocaleString()}</TableCell>
                      <TableCell className="max-w-xs truncate">{record.remarks.replace(/Commission for.*?\./, '').trim() || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteClick(record)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No commission records found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the commission record from the vehicle's financial history and the corresponding additions from each employee's payroll data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}




