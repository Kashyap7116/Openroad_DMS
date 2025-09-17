
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from "@/modules/shared/components/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/modules/shared/components/ui/ui/card";
import { PlusCircle, Trash2, Pencil, Loader2, FilterX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/modules/shared/components/ui/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui/ui/table";
import { Badge } from '@/modules/shared/components/ui/ui/badge';
import { cn } from '@/modules/shared/utils/utils';
import { FinanceForm } from '@/modules/finance/forms/finance-form';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';
import { getAllVehicles, getVehicle, saveVehicle } from '@/modules/vehicles/services/vehicle-actions';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/modules/shared/components/ui/ui/label';
import { Input } from '@/modules/shared/components/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/shared/components/ui/ui/select';
import { VehicleSelector } from '@/modules/shared/components/ui/vehicle-selector';


export type TransactionRecord = {
  transaction_id: string;
  type: 'expense' | 'income';
  category: string;
  license_plate: string;
  amount: number;
  currency: 'THB';
  date: string;
  remarks: string;
  uploaded_file?: string | File | null;
};


const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

interface VehicleFinanceClientProps {
    onDataUpdate: () => void;
}

export function VehicleFinanceClient({ onDataUpdate }: VehicleFinanceClientProps) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TransactionRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<{vehicleId: string, transactionId: string} | null>(null);
  const [filteredTransactions, setFilteredTransactions] = useState<(TransactionRecord & { vehicle: string; vehicleId: string;})[]>([]);

  const [filters, setFilters] = useState({
      fromDate: '',
      toDate: '',
      licensePlate: '',
      type: '',
      category: '',
  });

  const fetchData = useCallback(async () => {
      setIsLoading(true);
      const data = await getAllVehicles();
      setVehicles(data);
      setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allTransactions = useMemo(() => {
    return vehicles
      .flatMap(v => (v.financial_history || []).map(t => ({...t, license_plate: v.license_plate, vehicle: v.vehicle, vehicleId: v.id })) as (TransactionRecord & { vehicle: string; vehicleId: string;})[])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [vehicles]);
  
  const uniqueCategories = useMemo(() => {
      const categories = new Set(allTransactions.map(tx => tx.category));
      return Array.from(categories);
  }, [allTransactions]);
  
  useEffect(() => {
    let filtered = allTransactions;

    if (filters.fromDate) {
        filtered = filtered.filter(tx => tx.date >= filters.fromDate);
    }
    if (filters.toDate) {
        filtered = filtered.filter(tx => tx.date <= filters.toDate);
    }
    if (filters.licensePlate) {
        filtered = filtered.filter(tx => tx.vehicleId === filters.licensePlate);
    }
    if (filters.type) {
        filtered = filtered.filter(tx => tx.type === filters.type);
    }
    if (filters.category) {
        filtered = filtered.filter(tx => tx.category === filters.category);
    }
    
    setFilteredTransactions(filtered);
  }, [allTransactions, filters]);
  
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
      setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
      setFilters({ fromDate: '', toDate: '', licensePlate: '', type: '', category: '' });
  };
  
  const handleFormSubmit = async (data: Omit<TransactionRecord, 'transaction_id' | 'currency'>) => {
    // The license_plate field now holds the vehicle's permanent ID or "Office"
    const permanentId = data.license_plate;
    
    const result = await saveVehicle(permanentId, { financial_record: data, editing_financial_id: editingRecord?.transaction_id });

    if (result.success) {
      toast({
        title: editingRecord ? "Transaction Updated" : "Transaction Added",
        description: `Financial record has been saved successfully.`
      });
      await fetchData(); // Refresh local data
      onDataUpdate(); // Refresh parent summary data
    } else {
       toast({
        title: "Error",
        description: result.error || 'Failed to save transaction record.',
        variant: 'destructive'
      });
    }
    
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  const handleOpenForm = (transaction?: TransactionRecord) => {
    if (transaction) {
      const vehicle = vehicles.find(v => v.license_plate === transaction.license_plate);
      if (vehicle) {
        setEditingRecord(transaction);
      }
    } else {
      setEditingRecord(null);
    }
    setIsFormOpen(true);
  };
  

  const handleDeleteClick = (vehicleId: string, transactionId: string) => {
    setRecordToDelete({vehicleId, transactionId});
  };

  const handleDeleteConfirm = async () => {
    if (recordToDelete) {
        const vehicleToUpdate = await getVehicle(recordToDelete.vehicleId);
        if (!vehicleToUpdate) return;
        
        const updatedHistory = (vehicleToUpdate.financial_history || []).filter(t => t.transaction_id !== recordToDelete.transactionId);
        const updatedVehicle: VehicleRecord = { ...vehicleToUpdate, financial_history: updatedHistory };
        
        await saveVehicle(vehicleToUpdate.id, updatedVehicle, true);
        await fetchData(); // Refresh local data
        onDataUpdate(); // Refresh parent summary data
    }
    setRecordToDelete(null);
  };
  
  const monthlyChartData = useMemo(() => {
    const dataByMonth: { [key: string]: { name: string, income: number, expenses: number }} = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
    // Initialize all months
    monthNames.forEach((name, index) => {
      dataByMonth[index] = { name, income: 0, expenses: 0 };
    });
  
    allTransactions.forEach(tx => {
      const month = new Date(tx.date).getMonth();
      if(tx.type === 'income') {
        dataByMonth[month].income += tx.amount;
      } else {
        dataByMonth[month].expenses += tx.amount;
      }
    });
    
    return Object.values(dataByMonth);
  }, [allTransactions]);

  const expensePieData = useMemo(() => {
    const expenseByCategory = allTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);
    
    return Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
  }, [allTransactions]);

  return (
    <>
      <div className="flex justify-end mb-4">
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingRecord(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenForm()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingRecord ? 'Edit' : 'Add'} Transaction</DialogTitle>
                    <DialogDescription>
                    {editingRecord ? 'Update the details for this transaction.' : 'Log a new income or expense record for a vehicle or office.'}
                    </DialogDescription>
                </DialogHeader>
                <FinanceForm
                    vehicles={vehicles}
                    onSubmit={handleFormSubmit}
                    onCancel={() => { setIsFormOpen(false); setEditingRecord(null); }}
                    initialData={editingRecord}
                />
            </DialogContent>
          </Dialog>
      </div>
      
      {/* Transactions Table */}
      <Card>
        <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>A log of all income and expense records linked to vehicles or the office.</CardDescription>
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
                        <Label htmlFor="licensePlate" className="text-xs">Vehicle</Label>
                        <VehicleSelector 
                            vehicles={vehicles}
                            value={filters.licensePlate}
                            onChange={(value) => handleFilterChange('licensePlate', value)}
                            placeholder="All Vehicles"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="category" className="text-xs">Category</Label>
                        <Select value={filters.category} onValueChange={value => handleFilterChange('category', value)}>
                            <SelectTrigger><SelectValue placeholder="All Categories"/></SelectTrigger>
                            <SelectContent>
                               {uniqueCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <Button variant="outline" onClick={clearFilters} className="w-full lg:w-auto">
                        <FilterX className="mr-2 h-4 w-4" /> Clear
                     </Button>
                </div>
            </div>
            <div className="overflow-x-auto">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Linked Entity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                  ) : filteredTransactions.length > 0 ? (
                    filteredTransactions.map((record) => (
                        <TableRow key={record.transaction_id}>
                           <TableCell>{record.date}</TableCell>
                           <TableCell className="font-medium">{record.category}</TableCell>
                           <TableCell>
                             <Badge variant="outline" className={cn(
                                record.type === 'income' ? 'text-green-700 border-green-300 bg-green-50' : 'text-red-700 border-red-300 bg-red-50'
                             )}>{record.type}</Badge>
                           </TableCell>
                           <TableCell>{record.license_plate === 'Office' ? 'Office' : `${record.vehicle} (${record.license_plate})`}</TableCell>
                           <TableCell className="text-right font-mono">฿{record.amount.toLocaleString('en-US')}</TableCell>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => handleOpenForm(record)}>
                                  <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDeleteClick(record.vehicleId, record.transaction_id)}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </td>
                        </TableRow>
                      ))
                    )
                   : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No transactions found for the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!recordToDelete} onOpenChange={(isOpen) => !isOpen && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}





