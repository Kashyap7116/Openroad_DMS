"use client";

import type { VehicleRecord } from "@/app/(dashboard)/purchase/page";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/modules/shared/components/ui/ui/button";
import { Input } from "@/modules/shared/components/ui/ui/input";
import { Label } from "@/modules/shared/components/ui/ui/label";
import {
  MultiSelect,
  type Option,
} from "@/modules/shared/components/ui/ui/multi-select";
import { Textarea } from "@/modules/shared/components/ui/ui/textarea";
import { VehicleSelector } from "@/modules/shared/components/ui/vehicle-selector";
import React, { useMemo, useState } from "react";

interface CommissionFormProps {
  employees: any[];
  vehicles: VehicleRecord[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function CommissionForm({
  employees,
  vehicles,
  onSubmit,
  onCancel,
}: CommissionFormProps) {
  const { toast } = useToast();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [commissionAmount, setCommissionAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState("");

  const employeeOptions: Option[] = useMemo(
    () =>
      employees.map((e) => ({
        value: e.employee_id,
        label: e.personal_info.name,
      })),
    [employees]
  );

  const soldVehicles = useMemo(
    () => vehicles.filter((v) => v.status === "Sold"),
    [vehicles]
  );

  const totalCommission = useMemo(() => {
    return (commissionAmount || 0) * selectedEmployees.length;
  }, [commissionAmount, selectedEmployees]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedEmployees.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one employee.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedVehicle) {
      toast({
        title: "Validation Error",
        description: "Please select a vehicle.",
        variant: "destructive",
      });
      return;
    }
    if (!commissionAmount || commissionAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Commission amount must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    const formData = {
      employee_ids: selectedEmployees,
      vehicle_id: selectedVehicle,
      commission_per_employee: commissionAmount,
      total_commission: totalCommission,
      remark: remarks,
      date: new Date().toISOString().split("T")[0],
    };

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4 pb-4">
      <div className="space-y-2">
        <Label htmlFor="employees">Employees</Label>
        <MultiSelect
          options={employeeOptions}
          selected={selectedEmployees}
          onChange={setSelectedEmployees}
          placeholder="Select one or more employees..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vehicle">Vehicle</Label>
        <VehicleSelector
          vehicles={soldVehicles}
          value={selectedVehicle}
          onChange={setSelectedVehicle}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="commissionAmount">
          Commission Amount (per employee)
        </Label>
        <Input
          id="commissionAmount"
          type="number"
          value={commissionAmount}
          onChange={(e) => setCommissionAmount(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="totalAmount">Total Commission Amount</Label>
        <Input
          id="totalAmount"
          type="text"
          value={`฿${totalCommission.toLocaleString()}`}
          readOnly
          className="font-bold bg-muted"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks (Optional)</Label>
        <Textarea
          id="remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Commission</Button>
      </div>
    </form>
  );
}
