"use client";

import type { VehicleRecord } from "@/app/(dashboard)/purchase/page";
import { Button } from "@/modules/shared/components/ui/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/ui/card";
import { DatePicker } from "@/modules/shared/components/ui/ui/date-picker";
import { Label } from "@/modules/shared/components/ui/ui/label";
import { MultiSelect } from "@/modules/shared/components/ui/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/ui/select";
import { VehicleSelector } from "@/modules/shared/components/ui/vehicle-selector";
import {
  getCustomReport,
  getVehicleLifecycleReport,
} from "@/modules/shared/services/reports-actions";
import { Download, Loader2, Search } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import { VehicleLifecycle } from "./vehicle-lifecycle";

interface CustomReportProps {
  vehicles: VehicleRecord[];
  employees: any[];
}

export function CustomReport({ vehicles, employees }: CustomReportProps) {
  const [reportType, setReportType] = useState("vehicleLifecycle");
  const [isLoading, setIsLoading] = useState(false);

  // State for Vehicle Lifecycle
  const [selectedLifecycleVehicle, setSelectedLifecycleVehicle] = useState("");
  const [lifecycleReportData, setLifecycleReportData] = useState<any>(null);

  // State for Vehicle History
  const [selectedHistoryVehicles, setSelectedHistoryVehicles] = useState<
    string[]
  >([]);

  // State for Date Range Reports
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const handleGenerateLifecycleReport = async () => {
    setLifecycleReportData(null);
    if (!selectedLifecycleVehicle) return;
    setIsLoading(true);
    const data = await getVehicleLifecycleReport(selectedLifecycleVehicle);
    setLifecycleReportData(data);
    setIsLoading(false);
  };

  const handleGenerateAndDownload = async () => {
    let reportName = "";
    let reportKey: "vehicleDateRange" | "employeeDateRange" | "vehicleHistory" =
      "vehicleDateRange";

    if (reportType === "vehicleHistory") {
      if (selectedHistoryVehicles.length === 0) {
        alert("Please select at least one vehicle for the history report.");
        return;
      }
      reportKey = "vehicleHistory";
      reportName = "Vehicle_History_Report";
    } else {
      if (!dateFrom || !dateTo) {
        alert("Please select a valid date range.");
        return;
      }
      reportKey =
        reportType === "vehicleDateRange"
          ? "vehicleDateRange"
          : "employeeDateRange";
      reportName =
        reportType === "vehicleDateRange"
          ? "Vehicle_Date_Range_Report"
          : "Employee_Date_Range_Report";
    }

    setIsLoading(true);
    try {
      const reportData = await getCustomReport({
        type: reportKey,
        from: dateFrom?.toISOString().split("T")[0],
        to: dateTo?.toISOString().split("T")[0],
        vehicleIds: selectedHistoryVehicles,
      });

      if (
        !reportData ||
        (Array.isArray(reportData) && reportData.length === 0)
      ) {
        alert("No data found for the selected criteria.");
        setIsLoading(false);
        return;
      }

      const wb = XLSX.utils.book_new();

      if (reportType === "vehicleHistory" && reportData) {
        Object.keys(reportData).forEach((sheetName) => {
          if (
            Array.isArray((reportData as any)[sheetName]) &&
            (reportData as any)[sheetName].length > 0
          ) {
            const ws = XLSX.utils.json_to_sheet((reportData as any)[sheetName]);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
          }
        });
      } else {
        const ws = XLSX.utils.json_to_sheet(reportData as any[]);
        XLSX.utils.book_append_sheet(wb, ws, "Report");
      }

      XLSX.writeFile(
        wb,
        `${reportName}_${new Date().toISOString().split("T")[0]}.xlsx`
      );
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("An error occurred while generating the report. Please try again.");
    }
    setIsLoading(false);
  };

  const vehicleMultiSelectOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.vehicle} (${v.license_plate})`,
  }));

  const renderFilterSection = () => {
    switch (reportType) {
      case "vehicleLifecycle":
        return (
          <div className="flex items-end gap-4">
            <div className="flex-grow space-y-2">
              <label htmlFor="vehicle-select" className="text-sm font-medium">
                Vehicle
              </label>
              <VehicleSelector
                vehicles={vehicles}
                value={selectedLifecycleVehicle}
                onChange={setSelectedLifecycleVehicle}
              />
            </div>
            <Button
              onClick={handleGenerateLifecycleReport}
              disabled={!selectedLifecycleVehicle || isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Generate Report
            </Button>
          </div>
        );
      case "vehicleHistory":
        return (
          <div className="flex items-end gap-4">
            <div className="flex-grow space-y-2">
              <Label>Vehicles</Label>
              <MultiSelect
                options={vehicleMultiSelectOptions}
                selected={selectedHistoryVehicles}
                onChange={setSelectedHistoryVehicles}
                placeholder="Select one or more vehicles..."
              />
            </div>
            <Button
              onClick={handleGenerateAndDownload}
              disabled={selectedHistoryVehicles.length === 0 || isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Generate & Download
            </Button>
          </div>
        );
      default: // Date range reports
        return (
          <div className="flex items-end gap-4">
            <div className="flex-grow space-y-2">
              <Label>From Date</Label>
              <DatePicker date={dateFrom} setDate={setDateFrom} />
            </div>
            <div className="flex-grow space-y-2">
              <Label>To Date</Label>
              <DatePicker date={dateTo} setDate={setDateTo} />
            </div>
            <Button
              onClick={handleGenerateAndDownload}
              disabled={!dateFrom || !dateTo || isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Generate & Download
            </Button>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Reports</CardTitle>
        <CardDescription>
          Generate specialized reports for vehicle lifecycles or data exports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicleLifecycle">
                  Vehicle Lifecycle Analysis
                </SelectItem>
                <SelectItem value="vehicleHistory">
                  Vehicle History Export (Excel)
                </SelectItem>
                <SelectItem value="vehicleDateRange">
                  Vehicle Data by Date Range (Excel)
                </SelectItem>
                <SelectItem value="employeeDateRange">
                  Employee Data by Date Range (Excel)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {renderFilterSection()}
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {lifecycleReportData && reportType === "vehicleLifecycle" && (
          <VehicleLifecycle report={lifecycleReportData} />
        )}
      </CardContent>
    </Card>
  );
}
