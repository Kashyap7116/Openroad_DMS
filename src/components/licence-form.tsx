'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';
import { getVehicle } from '@/lib/vehicle-actions';
import { VehicleSelector } from '@/components/shared/vehicle-selector';

export type LicenceFormData = {
    originalLicensePlate: string;
    newLicensePlate: string;
    issueDate: string;
    expiryDate?: string;
    issuingAuthority: string;
    remarks?: string;
    price: number;
}

const initialFormData: LicenceFormData = {
  originalLicensePlate: '',
  newLicensePlate: '',
  issueDate: new Date().toISOString().split('T')[0],
  expiryDate: '',
  issuingAuthority: '',
  remarks: '',
  price: 0,
};

interface LicenceFormProps {
    vehicles: VehicleRecord[];
    onSubmit: (data: LicenceFormData) => void;
    onCancel: () => void;
}

export function LicenceForm({ vehicles, onSubmit, onCancel }: LicenceFormProps) {
    const [formData, setFormData] = useState<LicenceFormData>(initialFormData);
    const { toast } = useToast();
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({...prev, [id]: value }));
    }
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.originalLicensePlate || !formData.newLicensePlate) {
            toast({
                title: "Validation Error",
                description: "Original and New License Plates are required.",
                variant: 'destructive',
            });
            return;
        }
        onSubmit(formData);
    }
    

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="originalLicensePlate">Vehicle <span className="text-destructive">*</span></Label>
                    <VehicleSelector
                        vehicles={vehicles}
                        value={formData.originalLicensePlate}
                        onChange={(value) => setFormData(prev => ({...prev, originalLicensePlate: value}))}
                    />
                 </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="newLicensePlate">New Licence Plate <span className="text-destructive">*</span></Label>
                    <Input id="newLicensePlate" value={formData.newLicensePlate} onChange={handleChange} required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="price">License Plate Fee (฿)</Label>
                    <Input id="price" type="number" value={formData.price} onChange={handleNumberChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="issuingAuthority">Issuing Authority</Label>
                    <Input id="issuingAuthority" value={formData.issuingAuthority} onChange={handleChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="issueDate">Issue Date</Label>
                    <Input id="issueDate" type="date" value={formData.issueDate} onChange={handleChange} />
                </div>
            </div>
            
             <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" value={formData.remarks || ''} onChange={handleChange} placeholder="Any notes..."/>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={!formData.originalLicensePlate}>
                    Submit
                </Button>
            </div>
        </form>
    );
}
