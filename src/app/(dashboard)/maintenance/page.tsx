

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ListFilter, Trash2, Pencil, Eye, Upload, Loader2, FilterX } from "lucide-react";
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
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MaintenanceForm } from '@/components/maintenance-form';
import { RecordDetailsDialog } from '@/components/record-details-dialog';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';
import { StatCard } from '@/components/stat-card';
import { DollarIcon } from '@/components/icons/dollar-icon';
import { Wrench } from 'lucide-react';
import { CarIcon } from '@/components/icons/car-icon';
import { ClockIcon } from '@/components/icons/clock-icon';
import { getAllVehicles, getVehicle, saveVehicle } from '@/lib/vehicle-actions';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

export type MaintenanceRecord = {
  maintenance_id: string;
  license_plate: string;
  service_date: string;
  items: string;
  cost: number;
  tax: number;
  total: number;
  remarks: string;
  status: 'Processing' | 'Completed';
  vehicle: string;
  invoiceFile: (File & { preview: string }) | string | null;
};

export default function MaintenancePage() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<{ vehicleId: string; maintId: string; } | null>(null);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const { toast } = useToast();
  const [allMaintenanceRecords, setAllMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>([]);
  const [filter, setFilter] = useState('');


  const fetchData = useCallback(async () => {
      setIsLoading(true);
      const data = await getAllVehicles();
      const records = data.flatMap(v => 
        (v.maintenance_history || []).map(m => ({ ...m, vehicle: v.vehicle, license_plate: v.license_plate, vehicle_id: v.id }))
      ).sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime());
      
      setVehicles(data.filter(v => v && v.id)); // Filter out null/invalid entries
      setAllMaintenanceRecords(records);
      setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    let filtered = allMaintenanceRecords;
    if (filter) {
      const lowercasedFilter = filter.toLowerCase();
      filtered = filtered.filter(rec => 
        rec.vehicle.toLowerCase().includes(lowercasedFilter) ||
        rec.license_plate.toLowerCase().includes(lowercasedFilter) ||
        rec.items.toLowerCase().includes(lowercasedFilter)
      );
    }
    setFilteredRecords(filtered);
  }, [allMaintenanceRecords, filter]);

  
  const dashboardStats = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let startDate, endDate;
    if (currentDay > 20) {
        startDate = new Date(currentYear, currentMonth, 21);
        endDate = new Date(currentYear, currentMonth + 1, 20, 23, 59, 59, 999);
    } else {
        startDate = new Date(currentYear, currentMonth - 1, 21);
        endDate = new Date(currentYear, currentMonth, 20, 23, 59, 59, 999);
    }
    
    const recordsInPeriod = allMaintenanceRecords.filter(rec => {
        const serviceDate = new Date(rec.service_date);
        return serviceDate >= startDate && serviceDate <= endDate;
    });

    return {
        totalCostInPeriod: recordsInPeriod.reduce((acc, rec) => acc + rec.total, 0),
        servicesCompletedInPeriod: recordsInPeriod.filter(r => r.status === 'Completed').length,
        pendingServices: allMaintenanceRecords.filter(r => r.status === 'Processing').length,
        vehiclesServicedInPeriod: new Set(recordsInPeriod.map(r => r.license_plate)).size,
    };
  }, [allMaintenanceRecords]);


  const handleFormSubmit = async (data: Omit<MaintenanceRecord, 'maintenance_id' | 'vehicle' | 'total'>) => {
    setIsLoading(true);
    setEditingRecord(null);
    setIsFormOpen(false);
    
    // The permanent vehicle ID is what's stored in data.license_plate from the form
    const permanentId = data.license_plate;
    
    const recordData = { 
        ...data, 
        total: data.cost + data.tax 
    };
    
    const result = await saveVehicle(permanentId, { maintenance_record: recordData, editing_maintenance_id: editingRecord?.maintenance_id });

    if (result.success) {
      toast({
        title: editingRecord ? "Record Updated" : "Record Added",
        description: `Maintenance for vehicle ID ${permanentId} has been successfully saved.`
      });
      await fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || 'Failed to save maintenance record.',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };
  
  const handleOpenForm = (record?: MaintenanceRecord | null) => {
    if (record) {
        // Find the vehicle_id for the record being edited
        const vehicle = allMaintenanceRecords.find(r => r.maintenance_id === record.maintenance_id);
        const recordToEdit = { ...record, license_plate: (vehicle as any)?.vehicle_id || record.license_plate };
        setEditingRecord(recordToEdit);
    } else {
        setEditingRecord(null);
    }
    setIsFormOpen(true);
  };
  
  const handleViewDetails = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setIsDetailsOpen(true);
  };

  const handleDeleteClick = (vehicleId: string, maintId: string) => {
    setRecordToDelete({ vehicleId, maintId });
    setIsDeleteConfirmOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (recordToDelete) {
        setIsLoading(true);
        const { vehicleId, maintId } = recordToDelete;
        const vehicleToUpdate = await getVehicle(vehicleId);
        if (!vehicleToUpdate) {
            setIsLoading(false);
            toast({ title: "Error", description: "Vehicle not found to delete maintenance record from.", variant: "destructive" });
            return;
        };

        const updatedHistory = (vehicleToUpdate.maintenance_history || []).filter(rec => rec.maintenance_id !== maintId);
        
        const result = await saveVehicle(vehicleToUpdate.id, {
          maintenance_history: updatedHistory
        }, true);

        if (result.success) {
          toast({ title: "Record Deleted", description: `The maintenance record has been removed.` });
          await fetchData();
        } else {
          toast({ title: "Error", description: `Failed to delete record: ${result.error}`, variant: "destructive"});
          setIsLoading(false);
        }
    }
    setIsDeleteConfirmOpen(false);
    setRecordToDelete(null);
  };


  return (
    <>
      <PageHeader
        title="Vehicle Maintenance"
        description="Log and track all maintenance and repair records for your fleet."
      >
         <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingRecord(null); }}>
             <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Maintenance
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                    {editingRecord ? 'Edit' : 'Add'} Maintenance Record
                </DialogTitle>
                <DialogDescription>
                  {editingRecord ? 'Update the details for this service record.' : 'Log a new service or repair for a vehicle in your fleet.'}
                </DialogDescription>
              </DialogHeader>
                <MaintenanceForm
                    vehicles={vehicles}
                    onSubmit={handleFormSubmit}
                    onCancel={() => { setIsFormOpen(false); setEditingRecord(null); }}
                    initialData={editingRecord}
                />
            </DialogContent>
        </Dialog>
      </PageHeader>
      
       <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Maintenance Cost"
          value={`฿${dashboardStats.totalCostInPeriod.toLocaleString()}`}
          description="Cost from 21st to 20th"
          icon={DollarIcon}
          iconBgColor="bg-blue-100 dark:bg-blue-900"
          iconColor="text-blue-500 dark:text-blue-300"
        />
        <StatCard
          title="Services Completed"
          value={dashboardStats.servicesCompletedInPeriod.toString()}
          description="from 21st to 20th"
          icon={Wrench}
          iconBgColor="bg-green-100 dark:bg-green-900"
          iconColor="text-green-500 dark:text-green-300"
        />
        <StatCard
          title="Pending Services"
          value={dashboardStats.pendingServices.toString()}
          description="Total pending services"
          icon={ClockIcon}
          iconBgColor="bg-orange-100 dark:bg-orange-900"
          iconColor="text-orange-500 dark:orange-300"
        />
        <StatCard
          title="Vehicles Serviced"
          value={dashboardStats.vehiclesServicedInPeriod.toString()}
          description={`from 21st to 20th`}
          icon={CarIcon}
          iconBgColor="bg-purple-100 dark:bg-purple-900"
          iconColor="text-purple-500 dark:text-purple-300"
        />
      </div>

      <Card>
          <CardHeader>
            <CardTitle>Maintenance Log</CardTitle>
            <CardDescription>A complete history of all service and repair records.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2 lg:col-span-3">
                        <Label htmlFor="filter-search" className="text-xs font-medium text-gray-500">Search by Vehicle, License, or Service</Label>
                        <Input 
                            id="filter-search" 
                            placeholder="e.g., Honda Civic, 1AB-1234, Oil Change..." 
                            className="bg-white dark:bg-gray-900" 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFilter('')}>
                        <FilterX className="mr-2 h-4 w-4"/>
                        Clear
                    </Button>
                </div>
            </div>
            <div className="overflow-x-auto">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Service Items</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                  ) : filteredRecords.length > 0 ? (
                    filteredRecords.map((record: MaintenanceRecord & { vehicle_id?: string }) => (
                      <TableRow key={record.maintenance_id}>
                        <TableCell>
                          <div className="font-medium">{record.vehicle}</div>
                          <div className="text-sm text-muted-foreground">{record.license_plate}</div>
                        </TableCell>
                        <TableCell>{record.service_date}</TableCell>
                        <TableCell className="max-w-xs truncate">{record.items}</TableCell>
                        <TableCell className="text-right font-mono">฿{record.total.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                record.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {record.status}
                            </span>
                        </TableCell>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={() => handleViewDetails(record)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => handleOpenForm(record)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDeleteClick(record.vehicle_id!, record.maintenance_id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </td>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No maintenance records found. Click "Add Maintenance" to create a new record.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {selectedRecord && (
             <RecordDetailsDialog
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                record={selectedRecord}
            />
        )}
        
         <AlertDialog open={!!recordToDelete} onOpenChange={(isOpen) => !isOpen && setRecordToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the maintenance record.
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
