"use client";

import type { MaintenanceRecord } from "@/app/(dashboard)/maintenance/page";
import type { VehicleRecord } from "@/app/(dashboard)/purchase/page";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/modules/shared/components/ui/ui/button";
import { Input } from "@/modules/shared/components/ui/ui/input";
import { Label } from "@/modules/shared/components/ui/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/ui/select";
import { Textarea } from "@/modules/shared/components/ui/ui/textarea";
import { VehicleSelector } from "@/modules/shared/components/ui/vehicle-selector";
import React, { useEffect, useMemo, useState } from "react";
import { FileUpload } from "@/modules/shared/components/ui/ui/file-upload";
import { ScrollArea } from "@/modules/shared/components/ui/ui/scroll-area";

type MaintenanceFormData = Omit<
  MaintenanceRecord,
  "maintenance_id" | "vehicle" | "total"
>;

const initialFormData: MaintenanceFormData = {
  license_plate: "", // This will hold the permanent vehicle_id (original plate)
  service_date: "",
  items: "",
  cost: 0,
  tax: 0,
  remarks: "",
  invoiceFile: null,
  status: "Processing",
};

interface MaintenanceFormProps {
  vehicles: VehicleRecord[];
  onSubmit: (data: MaintenanceFormData) => void;
  onCancel: () => void;
  initialData?: MaintenanceRecord | null;
}

export function MaintenanceForm({
  vehicles,
  onSubmit,
  onCancel,
  initialData,
}: MaintenanceFormProps) {
  const [formData, setFormData] =
    useState<MaintenanceFormData>(initialFormData);
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      const { maintenance_id, vehicle, total, ...dataToEdit } = initialData;
      setFormData(dataToEdit);
    } else {
      setFormData(initialFormData);
    }
  }, [initialData]);

  const total = useMemo(
    () => formData.cost + formData.tax,
    [formData.cost, formData.tax]
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  const handleSelectChange = (id: string, value: any) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(file),
    });
    setFormData((prev) => ({ ...prev, invoiceFile: fileWithPreview }));
  };

  const removeImage = () => {
    if (formData.invoiceFile && typeof formData.invoiceFile !== "string") {
      URL.revokeObjectURL(formData.invoiceFile.preview);
      setFormData((prev) => ({ ...prev, invoiceFile: null }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.license_plate || !formData.service_date || !formData.items) {
      toast({
        title: "Validation Error",
        description:
          "Please fill in all required fields: Vehicle, Date, Items.",
        variant: "destructive",
      });
      return;
    }
    onSubmit(formData);
  };

  const availableVehicles = useMemo(
    () =>
      vehicles.filter((v) => v.status === "Completed" || v.status === "Sold"),
    [vehicles]
  );

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      <ScrollArea className="flex-grow pr-4">
        <div className="space-y-6 pt-4 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="license_plate">
                Vehicle <span className="text-destructive">*</span>
              </Label>
              <VehicleSelector
                vehicles={availableVehicles}
                value={formData.license_plate}
                onChange={(value) => handleSelectChange("license_plate", value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_date">
                Date of Service <span className="text-destructive">*</span>
              </Label>
              <Input
                id="service_date"
                type="date"
                value={formData.service_date}
                onChange={handleChange}
                required
              />
            </div>
            <div />

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="items">
                Repair / Service Items{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="items"
                value={formData.items}
                onChange={handleChange}
                placeholder="e.g., Oil Change, Brake Pads Replacement"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost (฿)</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost}
                onChange={handleNumberChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax">Tax (฿)</Label>
              <Input
                id="tax"
                type="number"
                value={formData.tax}
                onChange={handleNumberChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total">Total (฿)</Label>
              <Input
                id="total"
                value={total.toLocaleString()}
                readOnly
                className="font-bold bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={(value: "Processing" | "Completed") =>
                  handleSelectChange("status", value)
                }
                value={formData.status}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Add any optional remarks..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="invoiceFile">Upload Invoice (PDF/JPG)</Label>
              <FileUpload
                name="invoiceFile"
                file={formData.invoiceFile}
                onFileChange={handleFileChange}
                onRemove={removeImage}
                accept="image/*,application/pdf"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
      <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? "Save Changes" : "Add Record"}
        </Button>
      </div>
    </form>
  );
}
