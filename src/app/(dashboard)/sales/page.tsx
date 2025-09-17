"use client";

import type { VehicleRecord } from "@/app/(dashboard)/purchase/page";
import { CarIcon } from "@/components/icons/car-icon";
import { ClockIcon } from "@/components/icons/clock-icon";
import { DocumentIcon } from "@/components/icons/document-icon";
import { DollarIcon } from "@/components/icons/dollar-icon";
import {
  SaleDetailsDialog,
  type SaleRecord,
} from "@/components/sale-details-dialog";
import { StatCard } from "@/components/stat-card";
import { useToast } from "@/hooks/use-toast";
import { getEmployees } from "@/modules/hr/services/hr-actions";
import { CommissionForm } from "@/modules/sales/components/commission-form";
import { CommissionLog } from "@/modules/sales/components/commission-log";
import { MultiStepSaleForm } from "@/modules/sales/forms/multi-step-sale-form";
import { saveSalesCommission } from "@/modules/sales/services/sales-actions";
import { PageHeader } from "@/modules/shared/components/page-header";
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
import { Button } from "@/modules/shared/components/ui/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/modules/shared/components/ui/ui/dialog";
import { Input } from "@/modules/shared/components/ui/ui/input";
import { Label } from "@/modules/shared/components/ui/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/modules/shared/components/ui/ui/tabs";
import {
  getAllVehicles,
  getVehicle,
  saveVehicle,
} from "@/modules/vehicles/services/vehicle-actions";
import { Award, Eye, Loader2, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function SalesPage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [filteredSales, setFilteredSales] = useState<VehicleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCommissionFormOpen, setIsCommissionFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<VehicleRecord | null>(
    null
  );
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<VehicleRecord | null>(
    null
  );
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    buyerName: "",
    licensePlate: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    const [allVehicles, allEmps] = await Promise.all([
      getAllVehicles(),
      getEmployees(),
    ]);
    setVehicles(allVehicles.filter((v) => v && v.id)); // Filter out null/invalid entries
    setAllEmployees(allEmps);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let salesList = vehicles.filter(
      (v) => v.status === "Sold" && v.sale_details
    );

    if (filters.fromDate) {
      salesList = salesList.filter(
        (v) => v.sale_details!.sale_details.sale_date >= filters.fromDate
      );
    }
    if (filters.toDate) {
      salesList = salesList.filter(
        (v) => v.sale_details!.sale_details.sale_date <= filters.toDate
      );
    }
    if (filters.buyerName) {
      salesList = salesList.filter((v) =>
        v
          .sale_details!.buyer.name.toLowerCase()
          .includes(filters.buyerName.toLowerCase())
      );
    }
    if (filters.licensePlate) {
      salesList = salesList.filter((v) =>
        v.license_plate
          .toLowerCase()
          .includes(filters.licensePlate.toLowerCase())
      );
    }

    setFilteredSales(salesList);
  }, [vehicles, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFilters((prev) => ({ ...prev, [id]: value }));
  };

  const clearFilters = () => {
    setFilters({ fromDate: "", toDate: "", buyerName: "", licensePlate: "" });
  };

  const handleFormSubmit = async (data: {
    vehicle_license: string;
    saleData: any;
  }) => {
    setIsFormOpen(false);
    setIsLoading(true);

    const vehicleToUpdate = await getVehicle(data.vehicle_license);
    if (!vehicleToUpdate) {
      toast({
        title: "Error",
        description: "Vehicle not found.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const updatedVehicle: VehicleRecord = {
      ...vehicleToUpdate,
      status: "Sold" as const,
      sale_details: data.saleData,
    };

    const result = await saveVehicle(updatedVehicle.id, updatedVehicle, true);

    if (result.success) {
      toast({
        title: "Sale Recorded",
        description: `The sale for ${data.vehicle_license} has been saved.`,
      });
      await fetchData();
    } else {
      toast({
        title: "Error",
        description: "Failed to save the sale.",
        variant: "destructive",
      });
    }

    setEditingRecord(null);
    setIsLoading(false);
  };

  const handleCommissionSubmit = async (data: any) => {
    setIsLoading(true);
    setIsCommissionFormOpen(false);
    const result = await saveSalesCommission(data);
    if (result.success) {
      toast({
        title: "Commission Recorded",
        description: `Commission has been successfully recorded for vehicle ${data.vehicle_id}.`,
      });
      await fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save commission.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleOpenForm = (record?: VehicleRecord | null) => {
    setEditingRecord(record || null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (record: VehicleRecord) => {
    setSelectedRecord(record);
    setIsDetailsOpen(true);
  };

  const handleDeleteClick = (license_plate: string) => {
    setRecordToDelete(license_plate);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (recordToDelete) {
      setIsLoading(true);
      const vehicleToUpdate = await getVehicle(recordToDelete);
      if (!vehicleToUpdate) {
        toast({
          title: "Error",
          description: "Vehicle not found for deletion.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      delete vehicleToUpdate.sale_details;
      vehicleToUpdate.status = "Completed"; // Revert status to Completed

      const result = await saveVehicle(
        vehicleToUpdate.id,
        vehicleToUpdate,
        true
      );

      if (result.success) {
        toast({
          title: "Sale Reverted",
          description: `Sale for ${recordToDelete} has been reverted.`,
        });
        await fetchData();
      } else {
        toast({
          title: "Error",
          description: "Failed to revert the sale.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }
    setIsDeleteConfirmOpen(false);
    setRecordToDelete(null);
  };

  const dashboardStats = useMemo(() => {
    const availableForSale = vehicles.filter(
      (p) => p.status === "Completed"
    ).length;
    const totalSold = vehicles.filter((v) => v.status === "Sold").length;
    const pendingSales = vehicles.filter(
      (v) => v.status === "Completed"
    ).length;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const startDate = new Date(currentYear, currentMonth - 1, 21);
    const endDate = new Date(currentYear, currentMonth, 20, 23, 59, 59, 999);

    const monthlyIncome = vehicles
      .filter((v) => {
        if (!v.sale_details?.sale_details?.sale_date) return false;
        const saleDate = new Date(v.sale_details.sale_details.sale_date);
        return saleDate >= startDate && saleDate <= endDate;
      })
      .reduce(
        (acc, v) => acc + (v.sale_details?.sale_details.sale_price || 0),
        0
      );

    return { availableForSale, totalSold, monthlyIncome, pendingSales };
  }, [vehicles]);

  const getLatestLicensePlate = (record: VehicleRecord) => {
    if (record.licence_history && record.licence_history.length > 0) {
      const sortedHistory = [...record.licence_history].sort(
        (a, b) =>
          new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
      );
      return sortedHistory[0].newLicensePlate;
    }
    return record.license_plate;
  };

  return (
    <>
      <PageHeader
        title="Vehicle Sales"
        description="Create and manage all vehicle sales transactions."
      >
        <Dialog
          open={isCommissionFormOpen}
          onOpenChange={setIsCommissionFormOpen}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Award className="mr-2 h-4 w-4" /> Record Commission
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Record Sales Commission</DialogTitle>
              <DialogDescription>
                Distribute commission to employees for a specific vehicle sale.
              </DialogDescription>
            </DialogHeader>
            <CommissionForm
              employees={allEmployees}
              vehicles={vehicles}
              onSubmit={handleCommissionSubmit}
              onCancel={() => setIsCommissionFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Dialog
          open={isFormOpen}
          onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingRecord(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenForm()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span className="lang-en">Record Vehicle Sale</span>
              <span className="lang-th">บันทึกการขายยานพาหนะ</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                <span className="lang-en">
                  {editingRecord ? "Edit" : "Add New"} Vehicle Sale
                </span>
                <span className="lang-th">
                  {editingRecord ? "แก้ไข" : "เพิ่ม"} การขายยานพาหนะ
                </span>
              </DialogTitle>
              <DialogDescription>
                <span className="lang-en">
                  {editingRecord
                    ? "Update the details for this sale."
                    : "Follow the steps to record a new vehicle sale."}
                </span>
                <span className="lang-th">
                  {editingRecord
                    ? "อัปเดตรายละเอียดสำหรับการขายนี้"
                    : "ทำตามขั้นตอนเพื่อบันทึกการขายยานพาหนะใหม่"}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-hidden">
              <MultiStepSaleForm
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingRecord(null);
                }}
                initialData={editingRecord}
                vehicles={vehicles}
              />
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mb-8">
        <StatCard
          title="Sales Income (Period)"
          description="From 21st to 20th"
          value={`฿${dashboardStats.monthlyIncome.toLocaleString()}`}
          icon={DollarIcon}
          iconBgColor="bg-green-100 dark:bg-green-900"
          iconColor="text-green-500 dark:text-green-300"
        />
        <StatCard
          title="Vehicles Available"
          value={String(dashboardStats.availableForSale)}
          icon={CarIcon}
          iconBgColor="bg-blue-100 dark:bg-blue-900"
          iconColor="text-blue-500 dark:text-blue-300"
        />
        <StatCard
          title="Vehicles Sold"
          value={String(dashboardStats.totalSold)}
          icon={DocumentIcon}
          iconBgColor="bg-orange-100 dark:bg-orange-900"
          iconColor="text-orange-500 dark:text-orange-300"
        />
        <StatCard
          title="Pending Sales"
          description="Vehicles with Completed status"
          value={String(dashboardStats.pendingSales)}
          icon={ClockIcon}
          iconBgColor="bg-purple-100 dark:bg-purple-900"
          iconColor="text-purple-500 dark:text-purple-300"
        />
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Vehicle Sales</TabsTrigger>
          <TabsTrigger value="commissions">Sales Commission</TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="lang-en">Recent Sales</span>
                <span className="lang-th">การขายล่าสุด</span>
              </CardTitle>
              <CardDescription>
                <span className="lang-en">
                  A log of all recent vehicle sales.
                </span>
                <span className="lang-th">
                  บันทึกการขายยานพาหนะล่าสุดทั้งหมด
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label
                      htmlFor="fromDate"
                      className="text-xs font-medium text-gray-500"
                    >
                      <span className="lang-en">From Date:</span>
                      <span className="lang-th">จากวันที่:</span>
                    </Label>
                    <Input
                      id="fromDate"
                      type="date"
                      value={filters.fromDate}
                      onChange={handleFilterChange}
                      className="bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="toDate"
                      className="text-xs font-medium text-gray-500"
                    >
                      <span className="lang-en">To Date:</span>
                      <span className="lang-th">ถึงวันที่:</span>
                    </Label>
                    <Input
                      id="toDate"
                      type="date"
                      value={filters.toDate}
                      onChange={handleFilterChange}
                      className="bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="buyerName"
                      className="text-xs font-medium text-gray-500"
                    >
                      <span className="lang-en">Buyer Name:</span>
                      <span className="lang-th">ชื่อผู้ซื้อ:</span>
                    </Label>
                    <Input
                      id="buyerName"
                      placeholder="Search by buyer..."
                      value={filters.buyerName}
                      onChange={handleFilterChange}
                      className="bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="licensePlate"
                      className="text-xs font-medium text-gray-500"
                    >
                      <span className="lang-en">License Plate:</span>
                      <span className="lang-th">ป้ายทะเบียน:</span>
                    </Label>
                    <Input
                      id="licensePlate"
                      placeholder="Search by license..."
                      value={filters.licensePlate}
                      onChange={handleFilterChange}
                      className="bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={clearFilters}>
                    <span className="lang-en">Clear Filters</span>
                    <span className="lang-th">ล้างตัวกรอง</span>
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Original License Plate</TableHead>
                      <TableHead>New License Plate</TableHead>
                      <TableHead>Buyer Name</TableHead>
                      <TableHead className="text-right">Sale Price</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredSales.length > 0 ? (
                      filteredSales.map((vehicle) => {
                        if (!vehicle.sale_details) return null;
                        const latestLicensePlate =
                          getLatestLicensePlate(vehicle);
                        return (
                          <TableRow key={vehicle.sale_details.sale_id}>
                            <TableCell className="font-medium">
                              {vehicle.sale_details.sale_id}
                            </TableCell>
                            <TableCell>
                              {vehicle.sale_details.sale_details.sale_date}
                            </TableCell>
                            <TableCell>{vehicle.id}</TableCell>
                            <TableCell>
                              {latestLicensePlate !== vehicle.id
                                ? latestLicensePlate
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {vehicle.sale_details.buyer.name}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ฿
                              {vehicle.sale_details.sale_details.sale_price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-gray-600"
                                onClick={() => handleViewDetails(vehicle)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-blue-600"
                                onClick={() => handleOpenForm(vehicle)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-red-600"
                                onClick={() => handleDeleteClick(vehicle.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          <span className="lang-en">
                            No sales records found.
                          </span>
                          <span className="lang-th">ไม่พบข้อมูลการขาย</span>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="commissions">
          <CommissionLog
            vehicles={vehicles}
            employees={allEmployees}
            isLoading={isLoading}
            onUpdate={fetchData}
          />
        </TabsContent>
      </Tabs>

      {selectedRecord && (
        <SaleDetailsDialog
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          record={selectedRecord.sale_details as SaleRecord | undefined}
          vehicleLicense={selectedRecord.license_plate}
        />
      )}

      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="lang-en">Are you absolutely sure?</span>
              <span className="lang-th">คุณแน่ใจหรือไม่?</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="lang-en">
                This will revert the sale, making the vehicle available again.
                This action cannot be easily undone.
              </span>
              <span className="lang-th">
                การดำเนินการนี้จะยกเลิกการขาย
                ทำให้ยานพาหนะกลับมาพร้อมขายอีกครั้ง
                การกระทำนี้ไม่สามารถยกเลิกได้ง่าย
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecordToDelete(null)}>
              <span className="lang-en">Cancel</span>
              <span className="lang-th">ยกเลิก</span>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              <span className="lang-en">Revert Sale</span>
              <span className="lang-th">ยกเลิกการขาย</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
