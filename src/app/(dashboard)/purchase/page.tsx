

'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Pencil, Eye, Award, Download, Loader2, BookUser, FilterX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/stat-card';
import { DollarIcon } from '@/components/icons/dollar-icon';
import { CarIcon } from '@/components/icons/car-icon';
import { DocumentIcon } from '@/components/icons/document-icon';
import { ClockIcon } from '@/components/icons/clock-icon';
import { PurchaseDetailsDialog } from '@/components/purchase-details-dialog';
import { deleteVehicle, getAllVehicles, getVehicle, saveVehicle, saveVehicleBonus, deleteVehicleBonus } from '@/lib/vehicle-actions';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import type { Adjustment } from '@/components/finance/employee-finance-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LicenceForm, type LicenceFormData } from '@/components/licence-form';
import { MultiStepPurchaseForm } from '@/components/multi-step-purchase-form';
import { BonusForm } from '@/components/purchase/bonus-form';
import { getEmployeeAdjustments } from '@/lib/finance-actions';
import { getEmployees } from '@/lib/hr-actions';


// This is now the main record type for a vehicle
export type VehicleRecord = {
  id: string; // The permanent, original license plate
  license_plate: string; // The current, active license plate
  vehicle: string;
  date: string;
  seller: string;
  purchasePrice: string;
  finalPrice: string;
  paymentType: string;
  status: 'Processing' | 'Completed' | 'Sold';
  fullData: any; // Contains all data from the multi-step form
  sale_details?: any;
  maintenance_history?: any[];
  financial_history?: any[];
  licence_history?: any[];
  bonus_history?: any[];
};

type BonusRecord = Adjustment & { employee_name?: string, license_plate: string };


export default function PurchasePage() {
  const { toast } = useToast();
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [bonusFormOpen, setBonusFormOpen] = useState(false);
  const [licenceFormOpen, setLicenceFormOpen] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [bonusRecords, setBonusRecords] = useState<BonusRecord[]>([]);
  const [filteredBonusRecords, setFilteredBonusRecords] = useState<BonusRecord[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBonusDeleteConfirmOpen, setIsBonusDeleteConfirmOpen] = useState(false);
  
  const [selectedRecord, setSelectedRecord] = useState<VehicleRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [bonusToDelete, setBonusToDelete] = useState<{ bonusId: string, vehicleId: string | null } | null>(null);

  const [editingRecord, setEditingRecord] = useState<VehicleRecord | null>(null);
  const [editingBonusRecord, setEditingBonusRecord] = useState<BonusRecord | null>(null);

  const [filters, setFilters] = useState<{ id: string; vehicle: string; status: string; }>({ id: '', vehicle: '', status: '' });
  const [bonusFilters, setBonusFilters] = useState<{ fromDate: string; toDate: string }>({ fromDate: '', toDate: '' });
  const [licenceFilter, setLicenceFilter] = useState('');


  const fetchData = async () => {
    setIsLoading(true);
    const [allVehicles, allEmps, allAdjustments] = await Promise.all([
      getAllVehicles(),
      getEmployees(),
      getEmployeeAdjustments(),
    ]);

    setVehicles(allVehicles);
    setAllEmployees(allEmps);
    
    const allBonuses = allAdjustments
      .filter((adj: any) => adj.type === 'Bonus' && (adj.visit_type || (adj.remarks||'').includes('Vehicle visit bonus')))
      .map((adj: any) => ({
          ...adj,
          employee_name: allEmps.find(e => e.employee_id === adj.employee_id)?.personal_info?.name || adj.employee_id,
      }))
      .sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setBonusRecords(allBonuses);
    
    setIsLoading(false);
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = vehicles;
    if (filters.id) {
        const searchTerm = filters.id.toLowerCase();
        filtered = filtered.filter(v => 
            v.id.toLowerCase().includes(searchTerm) || 
            v.license_plate.toLowerCase().includes(searchTerm)
        );
    }
    if (filters.vehicle) {
      filtered = filtered.filter(v => v.vehicle.toLowerCase().includes(filters.vehicle.toLowerCase()));
    }
    if (filters.status) {
      filtered = filtered.filter(v => v.status.toLowerCase() === filters.status.toLowerCase());
    }
    setFilteredVehicles(filtered);
  }, [vehicles, filters]);
  
   useEffect(() => {
    let filtered = bonusRecords;
    if (bonusFilters.fromDate) {
        filtered = filtered.filter(b => b.date >= bonusFilters.fromDate);
    }
    if (bonusFilters.toDate) {
        filtered = filtered.filter(b => b.date <= bonusFilters.toDate);
    }
    setFilteredBonusRecords(filtered);
  }, [bonusRecords, bonusFilters]);


  const handlePurchaseFormSubmit = async (newPurchaseData: any) => {
    setIsLoading(true);
    setPurchaseFormOpen(false);
    
    const originalLicensePlate = newPurchaseData.previousLicensePlate;
    const result = await saveVehicle(originalLicensePlate, newPurchaseData, !!editingRecord);

    if (result.success) {
      toast({
        title: editingRecord ? "Purchase Updated" : "Purchase Recorded",
        description: `The vehicle purchase for ${originalLicensePlate} has been successfully saved.`,
      });
      await fetchData(); 
    } else {
        const description = (
            <div className="text-left">
                <p className="font-semibold">{result.error}</p>
                {result.analysis && (
                    <div className="mt-2 text-xs bg-destructive/20 p-2 rounded-md">
                        <p className="font-bold">AI Analysis:</p>
                        <p><strong>Cause:</strong> {result.analysis.probableCause}</p>
                        <p><strong>Suggestion:</strong> {result.analysis.suggestedSolution}</p>
                    </div>
                )}
            </div>
        );
      toast({
        title: "Error Saving Purchase",
        description: description,
        variant: "destructive",
        duration: 10000,
      });
    }

    setEditingRecord(null);
    setIsLoading(false);
  };
  
  const handleBonusFormSubmit = async (bonusFormData: any) => {
    setIsLoading(true);
    
    const result = await saveVehicleBonus(bonusFormData);
    
    setBonusFormOpen(false);
    setEditingBonusRecord(null);

    if (result.success) {
      toast({
          title: editingBonusRecord ? "Bonus Updated" : "Bonus Recorded",
          description: `Bonus has been successfully saved for the selected employee(s).`,
      });
      await fetchData();
    } else {
       toast({
          title: "Error",
          description: `Failed to save bonus: ${result.error}`,
          variant: "destructive",
      });
    }
    setIsLoading(false);
  }
  
  const handleLicenceFormSubmit = async (data: LicenceFormData) => {
    setIsLoading(true);
    setLicenceFormOpen(false);

    const result = await saveVehicle(data.originalLicensePlate, { licence_details: data }, true);
    
    if(result.success) {
        toast({
            title: 'Licence Updated',
            description: `Vehicle licence updated to ${data.newLicensePlate}.`,
        });
        await fetchData();
    } else {
         toast({
            title: 'Error Saving Licence',
            description: result.error,
            variant: 'destructive',
        });
    }
    
    setIsLoading(false);
};


  const handleOpenPurchaseForm = (record?: VehicleRecord | null) => {
    setEditingRecord(record || null);
    setPurchaseFormOpen(true);
  };
  
  const handleOpenBonusForm = (record?: BonusRecord | null) => {
    if (record) {
      setEditingBonusRecord(record);
    } else {
      setEditingBonusRecord(null);
    }
    setBonusFormOpen(true);
  };

  const handleOpenLicenceForm = () => {
    setLicenceFormOpen(true);
  };

  const handleViewDetails = (record: VehicleRecord) => {
    setSelectedRecord(record);
    setIsDetailsOpen(true);
  };

  const handleDeleteClick = (record: VehicleRecord) => {
    setRecordToDelete(record.id);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteBonusClick = (bonus: BonusRecord) => {
    setBonusToDelete({ bonusId: bonus.id, vehicleId: bonus.license_plate === 'No Booking' ? null : bonus.license_plate });
    setIsBonusDeleteConfirmOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (recordToDelete) {
        setIsLoading(true);
        const result = await deleteVehicle(recordToDelete);
        if (result.success) {
            toast({
                title: "Vehicle Deleted",
                description: `Vehicle record for ${recordToDelete} has been deleted.`
            });
            await fetchData();
        } else {
             toast({
                title: "Error",
                description: `Failed to delete vehicle record: ${result.error}`,
                variant: 'destructive'
            });
        }
        setIsLoading(false);
    }
    setIsDeleteConfirmOpen(false);
    setRecordToDelete(null);
  };

  const handleDeleteBonusConfirm = async () => {
    if (bonusToDelete) {
        setIsLoading(true);
        const result = await deleteVehicleBonus(bonusToDelete.bonusId, bonusToDelete.vehicleId);
        if (result.success) {
            toast({
                title: "Bonus Deleted",
                description: "The bonus record has been deleted.",
                variant: "destructive"
            });
            await fetchData();
        } else {
             toast({
                title: "Error",
                description: `Failed to delete bonus: ${result.error}`,
                variant: 'destructive'
            });
        }
        setIsLoading(false);
    }
    setIsBonusDeleteConfirmOpen(false);
    setBonusToDelete(null);
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFilters(prev => ({ ...prev, [id.replace('filter-','')]: value }));
  };
  
  const clearFilters = () => {
    setFilters({ id: '', vehicle: '', status: '' });
  };
   const handleBonusFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setBonusFilters(prev => ({ ...prev, [id.replace('filter-bonus-','')]: value }));
  };
  
  const clearBonusFilters = () => {
    setBonusFilters({ fromDate: '', toDate: '' });
  };
  
  const dashboardStats = useMemo(() => {
    const totalInvestment = vehicles.reduce((acc, v) => acc + (v.fullData?.grandTotal || 0), 0);
    const vehiclesInStock = vehicles.filter(v => v.status !== 'Sold').length;
    const vehiclesReadyForSale = vehicles.filter(v => v.status === 'Completed').length;
    const totalSold = vehicles.filter(v => v.status === 'Sold').length;
    return { totalInvestment, vehiclesInStock, vehiclesReadyForSale, totalSold };
  }, [vehicles]);
  
  const handleExportExcel = () => {
    const dataToExport = filteredVehicles.map(v => ({
      'Purchase ID': v.id,
      'Date': v.date,
      'License Plate': v.license_plate,
      'Vehicle': v.vehicle,
      'Year': v.fullData?.year,
      'Seller': v.seller,
      'Purchase Price': v.fullData?.vehiclePrice,
      'Final Price': v.fullData?.grandTotal,
      'Status': v.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicles");
    XLSX.writeFile(workbook, "vehicle_purchase_report.xlsx");
  }

  const licenceHistory = useMemo(() => {
    let history = vehicles.filter(v => v.licence_history && v.licence_history.length > 0);
    
    if(licenceFilter) {
      const searchTerm = licenceFilter.toLowerCase();
      history = history.filter(v => 
        (v.id || '').toLowerCase().includes(searchTerm) ||
        (v.license_plate || '').toLowerCase().includes(searchTerm) ||
        (v.licence_history || []).some((lh: any) => (lh.newLicensePlate || '').toLowerCase().includes(searchTerm))
      );
    }
    return history;
  }, [vehicles, licenceFilter]);

  const getLatestLicensePlate = (record: VehicleRecord) => {
    if (record.licence_history && record.licence_history.length > 0) {
      const sortedHistory = [...record.licence_history].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
      return sortedHistory[0].newLicensePlate;
    }
    return record.license_plate;
  };

  return (
    <>
      <PageHeader
        title="Purchase"
        description="Record vehicle purchases, track expenses, and manage inventory acquisitions."
      >
        <Dialog open={bonusFormOpen} onOpenChange={(isOpen) => { setBonusFormOpen(isOpen); if (!isOpen) setEditingBonusRecord(null); }}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => handleOpenBonusForm()}>
                    <Award className="mr-2 h-4 w-4" />
                    <span className="lang-en">Employee Bonus</span>
                    <span className="lang-th">โบนัสพนักงาน</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        <span className="lang-en">{editingBonusRecord ? 'Edit' : 'Add'} Employee Bonus</span>
                        <span className="lang-th">{editingBonusRecord ? 'แก้ไข' : 'เพิ่ม'} โบนัสพนักงาน</span>
                    </DialogTitle>
                    <DialogDescription>
                        <span className="lang-en">{editingBonusRecord ? 'Update this bonus record.' : 'Record a bonus for an employee related to a vehicle inspection or purchase.'}</span>
                        <span className="lang-th">{editingBonusRecord ? 'อัปเดตบันทึกโบนัสนี้' : 'บันทึกโบนัสสำหรับพนักงานที่เกี่ยวข้องกับการตรวจสอบหรือซื้อยานพาหนะ'}</span>
                    </DialogDescription>
                </DialogHeader>
                 <BonusForm
                    initialData={editingBonusRecord}
                    vehicles={vehicles}
                    onSubmit={handleBonusFormSubmit} 
                    onCancel={() => { setBonusFormOpen(false); setEditingBonusRecord(null); }}
                />
            </DialogContent>
        </Dialog>
        <Dialog open={licenceFormOpen} onOpenChange={setLicenceFormOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleOpenLicenceForm}>
                    <BookUser className="mr-2 h-4 w-4" />
                    <span className="lang-en">New Licence</span>
                    <span className="lang-th">ใบอนุญาตใหม่</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        <span className="lang-en">Create New Licence Record</span>
                        <span className="lang-th">สร้างบันทึกใบอนุญาตใหม่</span>
                    </DialogTitle>
                    <DialogDescription>
                        <span className="lang-en">Select a vehicle and provide the new licence details. This will create a new licence history record.</span>
                        <span className="lang-th">เลือกยานพาหนะและให้รายละเอียดใบอนุญาตใหม่ การดำเนินการนี้จะสร้างบันทึกประวัติใบอนุญาตใหม่</span>
                    </DialogDescription>
                </DialogHeader>
                 <LicenceForm 
                    vehicles={vehicles}
                    onSubmit={handleLicenceFormSubmit}
                    onCancel={() => setLicenceFormOpen(false)}
                />
            </DialogContent>
        </Dialog>
        <Dialog open={purchaseFormOpen} onOpenChange={(isOpen) => { setPurchaseFormOpen(isOpen); if (!isOpen) setEditingRecord(null); }}>
            <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenPurchaseForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="lang-en">Record Vehicle Purchase</span>
                    <span className="lang-th">บันทึกการซื้อยานพาหนะ</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        <span className="lang-en">{editingRecord ? 'Edit' : 'Add New'} Vehicle Purchase</span>
                        <span className="lang-th">{editingRecord ? 'แก้ไข' : 'เพิ่มใหม่'} การซื้อยานพาหนะ</span>
                    </DialogTitle>
                    <DialogDescription>
                        <span className="lang-en">{editingRecord ? 'Update the details for this vehicle.' : 'Follow the steps to add a new vehicle to your inventory.'}</span>
                        <span className="lang-th">{editingRecord ? 'อัปเดตรายละเอียดสำหรับยานพาหนะนี้' : 'ทำตามขั้นตอนเพื่อเพิ่มยานพาหนะใหม่ในคลังของคุณ'}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-hidden">
                   <MultiStepPurchaseForm 
                    onSubmit={handlePurchaseFormSubmit} 
                    onCancel={() => { setPurchaseFormOpen(false); setEditingRecord(null); }} 
                    initialData={editingRecord ? editingRecord.fullData : null}
                    />
                </div>
            </DialogContent>
        </Dialog>
      </PageHeader>
      
       <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Investment"
          value={`฿${dashboardStats.totalInvestment.toLocaleString()}`}
          icon={DollarIcon}
          iconBgColor="bg-blue-100 dark:bg-blue-900"
          iconColor="text-blue-500 dark:text-blue-300"
        />
        <StatCard
          title="Vehicles in Stock"
          value={String(dashboardStats.vehiclesInStock)}
          icon={CarIcon}
          iconBgColor="bg-green-100 dark:bg-green-900"
          iconColor="text-green-500 dark:text-green-300"
        />
        <StatCard
          title="Ready for Sale"
          value={String(dashboardStats.vehiclesReadyForSale)}
          icon={DocumentIcon}
          iconBgColor="bg-orange-100 dark:bg-orange-900"
          iconColor="text-orange-500 dark:text-orange-300"
        />
        <StatCard
          title="Total Sold"
          value={String(dashboardStats.totalSold)}
          icon={ClockIcon}
          iconBgColor="bg-purple-100 dark:bg-purple-900"
          iconColor="text-purple-500 dark:text-purple-300"
        />
      </div>

      <Tabs defaultValue="purchases">
        <TabsList className="mb-4">
            <TabsTrigger value="purchases"><span className="lang-en">Vehicle Purchases</span><span className="lang-th">การซื้อยานพาหนะ</span></TabsTrigger>
            <TabsTrigger value="bonuses"><span className="lang-en">Employee Bonuses</span><span className="lang-th">โบนัสพนักงาน</span></TabsTrigger>
            <TabsTrigger value="licence"><span className="lang-en">Licence History</span><span className="lang-th">ประวัติใบอนุญาต</span></TabsTrigger>
        </TabsList>
        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle><span className="lang-en">Vehicle Purchase Records</span><span className="lang-th">บันทึกการซื้อยานพาหนะ</span></CardTitle>
               <CardDescription>
                <span className="lang-en">Track and manage all vehicle acquisitions</span>
                <span className="lang-th">ติดตามและจัดการการซื้อยานพาหนะทั้งหมด</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="filter-id" className="text-xs font-medium text-gray-500"><span className="lang-en">ID or License Plate:</span><span className="lang-th">รหัสหรือป้ายทะเบียน:</span></Label>
                            <Input id="filter-id" placeholder="Search by ID or Plate..." value={filters.id} onChange={handleFilterChange} className="bg-white dark:bg-gray-900"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="filter-vehicle" className="text-xs font-medium text-gray-500"><span className="lang-en">Vehicle:</span><span className="lang-th">ยานพาหนะ:</span></Label>
                            <Input id="filter-vehicle" placeholder="Search by vehicle..." value={filters.vehicle} onChange={handleFilterChange} className="bg-white dark:bg-gray-900"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="filter-status" className="text-xs font-medium text-gray-500"><span className="lang-en">Status:</span><span className="lang-th">สถานะ:</span></Label>
                            <Input id="filter-status" placeholder="Search by status..." value={filters.status} onChange={handleFilterChange} className="bg-white dark:bg-gray-900"/>
                        </div>
                        <div className="flex items-end gap-2 lg:col-span-full lg:col-start-4 lg:justify-end">
                             <Button variant="outline" className="w-full lg:w-auto" onClick={clearFilters}><span className="lang-en">Clear</span><span className="lang-th">ล้าง</span></Button>
                             <Button className="w-full lg:w-auto" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" /> <span className="lang-en">Export</span><span className="lang-th">ส่งออก</span></Button>
                        </div>
                    </div>
                </div>
               <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original License No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Current License No</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead className="text-right">Final Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                        <TableRow key="loading">
                            <TableCell colSpan={8} className="text-center py-8">
                                <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span><span className="lang-en">Loading vehicle data...</span><span className="lang-th">กำลังโหลดข้อมูลยานพาหนะ...</span></span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : filteredVehicles.length > 0 ? (
                      filteredVehicles.map((purchase) => {
                        const latestLicensePlate = getLatestLicensePlate(purchase);
                        return (
                          <TableRow key={`${purchase.id}-${purchase.license_plate}`}>
                            <TableCell className="font-medium">{purchase.id}</TableCell>
                            <TableCell>{purchase.date}</TableCell>
                            <TableCell>{latestLicensePlate !== purchase.id ? latestLicensePlate : '-'}</TableCell>
                            <TableCell>{purchase.vehicle}</TableCell>
                            <TableCell>{purchase.seller}</TableCell>
                            <TableCell className="text-right">{purchase.finalPrice}</TableCell>
                            <TableCell>
                               <Badge variant="outline" className={cn(
                                  purchase.status === 'Completed' ? 'text-green-700 border-green-300 bg-green-50' :
                                  purchase.status === 'Processing' ? 'text-yellow-700 border-yellow-300 bg-yellow-50' :
                                  purchase.status === 'Sold' ? 'text-blue-700 border-blue-300 bg-blue-50' : ''
                              )}>
                                  {purchase.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={() => handleViewDetails(purchase)}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => handleOpenPurchaseForm(purchase)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDeleteClick(purchase)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                  ) : (
                    <TableRow key="no-results">
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            <span className="lang-en">No vehicles found. Click "Record Vehicle Purchase" to add one.</span>
                            <span className="lang-th">ไม่พบยานพาหนะ คลิก "บันทึกการซื้อยานพาหนะ" เพื่อเพิ่ม</span>
                        </TableCell>
                    </TableRow>
                  )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bonuses">
           <Card>
            <CardHeader>
              <CardTitle><span className="lang-en">Employee Bonus Records</span><span className="lang-th">บันทึกโบนัสพนักงาน</span></CardTitle>
               <CardDescription>
                <span className="lang-en">A log of all bonuses awarded to employees for vehicle-related activities.</span>
                <span className="lang-th">บันทึกโบนัสทั้งหมดที่มอบให้กับพนักงานสำหรับกิจกรรมที่เกี่ยวข้องกับยานพาหนะ</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="filter-bonus-fromDate" className="text-xs font-medium text-gray-500"><span className="lang-en">From Date:</span><span className="lang-th">จากวันที่:</span></Label>
                            <Input id="filter-bonus-fromDate" type="date" value={bonusFilters.fromDate} onChange={handleBonusFilterChange} className="bg-white dark:bg-gray-900"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="filter-bonus-toDate" className="text-xs font-medium text-gray-500"><span className="lang-en">To Date:</span><span className="lang-th">ถึงวันที่:</span></Label>
                            <Input id="filter-bonus-toDate" type="date" value={bonusFilters.toDate} onChange={handleBonusFilterChange} className="bg-white dark:bg-gray-900"/>
                        </div>
                        <Button variant="outline" onClick={clearBonusFilters}><FilterX className="mr-2 h-4 w-4" /> <span className="lang-en">Clear Filters</span><span className="lang-th">ล้างตัวกรอง</span></Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><span className="lang-en">Date</span><span className="lang-th">วันที่</span></TableHead>
                                <TableHead><span className="lang-en">Employee</span><span className="lang-th">พนักงาน</span></TableHead>
                                <TableHead><span className="lang-en">Amount</span><span className="lang-th">จำนวนเงิน</span></TableHead>
                                <TableHead><span className="lang-en">Remarks</span><span className="lang-th">หมายเหตุ</span></TableHead>
                                <TableHead className="text-center"><span className="lang-en">Actions</span><span className="lang-th">การกระทำ</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredBonusRecords.length > 0 ? (
                                filteredBonusRecords.map(bonus => (
                                    <TableRow key={bonus.id}>
                                        <TableCell>{bonus.date}</TableCell>
                                        <TableCell>{bonus.employee_name}</TableCell>
                                        <TableCell className="font-mono">฿{(bonus.amount || 0).toLocaleString()}</TableCell>
                                        <TableCell className="max-w-md truncate">{bonus.remarks}</TableCell>
                                        <TableCell className="text-center space-x-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => handleOpenBonusForm(bonus)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDeleteBonusClick(bonus)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        <span className="lang-en">No bonus records found.</span>
                                        <span className="lang-th">ไม่พบบันทึกโบนัส</span>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
           </Card>
        </TabsContent>
         <TabsContent value="licence">
           <Card>
            <CardHeader>
              <CardTitle><span className="lang-en">Licence Change History</span><span className="lang-th">ประวัติการเปลี่ยนใบอนุญาต</span></CardTitle>
               <CardDescription>
                <span className="lang-en">A log of all vehicles that have had their licence plates changed.</span>
                <span className="lang-th">บันทึกยานพาหนะทั้งหมดที่มีการเปลี่ยนป้ายทะเบียน</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2 lg:col-span-3">
                            <Label htmlFor="filter-licence" className="text-xs font-medium text-gray-500">
                                <span className="lang-en">Search by Plate:</span>
                                <span className="lang-th">ค้นหาตามป้ายทะเบียน:</span>
                            </Label>
                            <Input 
                                id="filter-licence" 
                                placeholder="Enter new or previous license plate..." 
                                className="bg-white dark:bg-gray-900" 
                                value={licenceFilter}
                                onChange={(e) => setLicenceFilter(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => setLicenceFilter('')}>
                            <FilterX className="mr-2 h-4 w-4" /> Clear Filter
                        </Button>
                    </div>
                </div>
                 <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><span className="lang-en">New Licence Plate</span><span className="lang-th">ป้ายทะเบียนใหม่</span></TableHead>
                                <TableHead><span className="lang-en">Previous Licence Plate</span><span className="lang-th">ป้ายทะเบียนเก่า</span></TableHead>
                                <TableHead><span className="lang-en">Vehicle</span><span className="lang-th">ยานพาหนะ</span></TableHead>
                                <TableHead><span className="lang-en">Issue Date</span><span className="lang-th">วันที่ออก</span></TableHead>
                                <TableHead><span className="lang-en">Issuing Authority</span><span className="lang-th">ผู้ออกใบอนุญาต</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : licenceHistory.length > 0 ? (
                                licenceHistory.map(v => (
                                    (v.licence_history || []).map((lh: any, index: number) => {
                                      const vehicleRecord = vehicles.find(vec => vec.id === lh.originalLicensePlate);
                                      return (
                                          <TableRow key={`${v.id}-${index}`}>
                                              <TableCell className="font-semibold">{lh.newLicensePlate}</TableCell>
                                              <TableCell>{lh.originalLicensePlate}</TableCell>
                                              <TableCell>{vehicleRecord?.vehicle || '-'}</TableCell>
                                              <TableCell>{lh.issueDate}</TableCell>
                                              <TableCell>{lh.issuingAuthority}</TableCell>
                                          </TableRow>
                                      )
                                    })
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        <span className="lang-en">No licence change records found.</span>
                                        <span className="lang-th">ไม่พบบันทึกการเปลี่ยนแปลงใบอนุญาต</span>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

       {selectedRecord && (
          <PurchaseDetailsDialog
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
                    <span className="lang-en">This action cannot be undone. This will permanently delete the vehicle record file and all associated data.</span>
                    <span className="lang-th">การกระทำนี้ไม่สามารถยกเลิกได้ การดำเนินการนี้จะลบไฟล์บันทึกยานพาหนะและข้อมูลที่เกี่ยวข้องทั้งหมดอย่างถาวร</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRecordToDelete(null)}><span className="lang-en">Cancel</span><span className="lang-th">ยกเลิก</span></AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90"><span className="lang-en">Delete</span><span className="lang-th">ลบ</span></AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isBonusDeleteConfirmOpen} onOpenChange={setIsBonusDeleteConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                    <span className="lang-en">Are you absolutely sure?</span>
                    <span className="lang-th">คุณแน่ใจหรือไม่?</span>
                </AlertDialogTitle>
                <AlertDialogDescription>
                    <span className="lang-en">This action cannot be undone. This will permanently delete this bonus record from both the vehicle and the employee's payroll data.</span>
                    <span className="lang-th">การกระทำนี้ไม่สามารถยกเลิกได้ การดำเนินการนี้จะลบบันทึกโบนัสนี้อย่างถาวรทั้งจากข้อมูลยานพาหนะและข้อมูลเงินเดือนของพนักงาน</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setBonusToDelete(null)}><span className="lang-en">Cancel</span><span className="lang-th">ยกเลิก</span></AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBonusConfirm} className="bg-destructive hover:bg-destructive/90"><span className="lang-en">Delete Bonus</span><span className="lang-th">ลบโบนัส</span></AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
