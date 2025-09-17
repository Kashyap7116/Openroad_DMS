
'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/modules/shared/components/ui/ui/button';
import { Label } from '@/modules/shared/components/ui/ui/label';
import { Input } from '@/modules/shared/components/ui/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/modules/shared/components/ui/ui/select';
import { Textarea } from '@/modules/shared/components/ui/ui/textarea';
import type { Adjustment } from './employee-finance-client';
import { getEmployees } from '@/modules/hr/services/hr-actions';
import { Loader2 } from 'lucide-react';


type FinanceFormData = Omit<Adjustment, 'id'>;

interface EmployeeFinanceFormProps {
  onSubmit: () => void;
  onCancel: () => void;
  formData: FinanceFormData;
  setFormData: (data: FinanceFormData) => void;
  isEditing: boolean;
}

export function EmployeeFinanceForm({ onSubmit, onCancel, formData, setFormData, isEditing }: EmployeeFinanceFormProps) {
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEmployees() {
        setIsLoading(true);
        const emps = await getEmployees();
        setAllEmployees(emps);
        setIsLoading(false);
    }
    loadEmployees();
  }, []);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSelectChange = (id: keyof FinanceFormData, value: string) => {
    const newFormData = { ...formData, [id]: value };
    if (id === 'type' && value !== 'Advance') {
        newFormData.installments = undefined;
    }
    setFormData(newFormData);
  };
  
  const handleNumberChange = (id: keyof FinanceFormData, value: string) => {
    setFormData({...formData, [id]: parseFloat(value) || 0 });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee_id">Employee</Label>
          <Select
            onValueChange={(value) => handleSelectChange('employee_id', value)}
            value={formData.employee_id}
            disabled={isEditing}
          >
            <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
            <SelectContent>
              {allEmployees.map(e => (
                <SelectItem key={e.employee_id} value={e.employee_id}>{e.personal_info.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            onValueChange={(value) => handleSelectChange('type', value)}
            value={formData.type}
            disabled={isEditing}
          >
            <SelectTrigger><SelectValue placeholder="Select adjustment type" /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Credit</SelectLabel>
                <SelectItem value="Bonus">Bonus</SelectItem>
                <SelectItem value="Addition">Addition</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Debit</SelectLabel>
                <SelectItem value="Advance">Advance</SelectItem>
                <SelectItem value="Deduction">Deduction</SelectItem>
                <SelectItem value="Employee Expense">Employee Expense</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={formData.date} onChange={handleChange} />
        </div>
         <div className="space-y-2">
          <Label htmlFor="amount">Amount (฿)</Label>
          <Input id="amount" type="number" value={formData.amount} onChange={(e) => handleNumberChange('amount', e.target.value)} />
        </div>
      </div>
      
      {formData.type === 'Advance' && (
        <div className="space-y-2">
            <Label htmlFor="installments">Installments (Months)</Label>
            <Input id="installments" type="number" value={formData.installments || ''} onChange={(e) => handleNumberChange('installments', e.target.value)} placeholder="e.g., 6" />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea id="remarks" value={formData.remarks || ''} onChange={handleChange} />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{isEditing ? 'Save Changes' : 'Add Adjustment'}</Button>
      </div>
    </form>
  );
}



