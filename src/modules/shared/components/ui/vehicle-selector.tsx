'use client';

import React, { useMemo } from 'react';
import { Combobox } from '@/modules/shared/components/ui/ui/combobox';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';

interface VehicleSelectorProps {
  vehicles: VehicleRecord[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowOffice?: boolean; // New prop to optionally add "Office"
}

/**
 * A core, reusable component for selecting a vehicle.
 * It always binds to the vehicle's permanent ID (original license plate)
 * while displaying a user-friendly label.
 */
export function VehicleSelector({
  vehicles,
  value,
  onChange,
  placeholder = 'Select a vehicle...',
  disabled = false,
  allowOffice = false,
}: VehicleSelectorProps) {
  const vehicleOptions = useMemo(() => {
    const options = (vehicles || []).map((v) => ({
      value: v.id, // The value is the permanent ID.
      label: `${v.vehicle} (${v.license_plate})`, // The label is user-friendly.
    }));

    if (allowOffice) {
        return [{ value: "Office", label: "Office" }, ...options];
    }
    
    return options;
  }, [vehicles, allowOffice]);

  return (
    <Combobox
      options={vehicleOptions}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search vehicle name or plate..."
      disabled={disabled}
    />
  );
}


