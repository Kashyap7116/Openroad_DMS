

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { TransactionRecord } from '@/components/finance/vehicle-finance-client';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';
import { FileUpload } from '@/components/ui/file-upload';
import { Combobox } from '@/components/ui/combobox';

type FileWithPreview = File & { preview: string };

type FinanceFormData = Omit<TransactionRecord, 'transaction_id' | 'currency'> & {
  uploaded_file: FileWithPreview | string | null;
};

const incomeCategories = [
  'Customer Transfer', 'Financing Transfer', 'Vehicle Capital', 'Director Loan', 'Miscellaneous Income'
];
const expenseCategories = [
  'Rent', 'Utilities', 'Fuel', 'Office Supplies', 'Toll Fees', 'Background Check Fees',
  'Commission Fees', 'Spare Parts / Repairs', 'Vehicle Purchase Cost', 'Miscellaneous Expense'
];

const initialFormData: FinanceFormData = {
  type: 'expense',
  category: '',
  license_plate: '',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  remarks: '',
  uploaded_file: null,
};

interface FinanceFormProps {
  vehicles: VehicleRecord[],
  onSubmit: (data: Omit<TransactionRecord, 'transaction_id' | 'currency'>) => void;
  onCancel: () => void;
  initialData?: TransactionRecord | null;
}

export function FinanceForm({ vehicles, onSubmit, onCancel, initialData }: FinanceFormProps) {
  const [formData, setFormData] = useState<FinanceFormData>(initialFormData);
  const { toast } = useToast();

  const vehicleOptions = useMemo(() => {
    const availableVehicles = vehicles.filter(v => v.status === 'Completed' || v.status === 'Sold');
    return [
        { value: "Office", label: "Office" },
        ...availableVehicles.map(v => ({
            value: v.license_plate,
            label: `${v.license_plate} (${v.vehicle})`
        }))
    ];
  }, [vehicles]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
      });
    } else {
      setFormData(initialFormData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  const handleSelectChange = (id: string, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleTypeChange = (value: 'income' | 'expense') => {
    setFormData(prev => ({ ...prev, type: value, category: '' }));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const fileWithPreview = Object.assign(file, {
        preview: URL.createObjectURL(file)
    });
    setFormData(prev => ({ ...prev, uploaded_file: fileWithPreview }));
  };

  const removeFile = () => {
    const file = formData.uploaded_file;
    if (file && typeof file !== 'string') {
        URL.revokeObjectURL(file.preview);
    }
    setFormData(prev => ({ ...prev, uploaded_file: null }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.amount || !formData.license_plate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields: Linked Entity, Category and Amount.",
        variant: "destructive"
      });
      return;
    }
    
    onSubmit(formData);
  };
  
  const categories = formData.type === 'income' ? incomeCategories : expenseCategories;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        <div className="space-y-2">
            <Label>Transaction Type</Label>
            <RadioGroup value={formData.type} onValueChange={handleTypeChange} className="flex space-x-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="expense" id="expense"/><Label htmlFor="expense" className="font-normal">Expense</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="income" id="income"/><Label htmlFor="income" className="font-normal">Income</Label></div>
            </RadioGroup>
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="license_plate">Linked Entity</Label>
            <Combobox 
                options={vehicleOptions}
                value={formData.license_plate}
                onChange={(value) => handleSelectChange('license_plate', value)}
                placeholder="Select a vehicle or office"
                searchPlaceholder="Search vehicles..."
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select onValueChange={(value) => handleSelectChange('category', value)} value={formData.category}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
            </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={formData.date} onChange={handleChange} />
            </div>
        </div>

        <div className="space-y-2">
            <Label htmlFor="amount">Amount (฿)</Label>
            <Input id="amount" type="number" value={formData.amount} onChange={handleNumberChange} />
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" value={formData.remarks || ''} onChange={handleChange} placeholder="Add any optional remarks..."/>
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="file_upload">Upload File (Bill/Receipt)</Label>
            <FileUpload name="uploaded_file" file={formData.uploaded_file} onFileChange={handleFileChange} onRemove={removeFile} />
        </div>

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">{initialData ? 'Save Changes' : 'Add Transaction'}</Button>
        </div>
    </form>
  );
}
