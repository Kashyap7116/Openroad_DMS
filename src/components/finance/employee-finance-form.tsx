

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Adjustment } from '@/components/finance/employee-finance-client';
import { getEmployees } from '@/lib/hr-actions';
import { Loader2 } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';
import { MultiSelect, type Option } from '@/components/ui/multi-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const visitTypes = {
    'View car at shop – Not Completed': 150,
    'View car at shop – Completed': 500,
    'View car in Bangkok – Not Completed': 300,
    'View car in Bangkok – Completed': 1300,
    'View car in another province over 100 km (no overnight, not completed)': 1100,
    'View car in another province over 100 km (no overnight, completed)': 2100,
    'View car in another province over 100 km (overnight, not completed)': 1300,
    'View car in another province over 100 km (overnight, completed)': 2300,
};

type BonusFormData = Omit<Adjustment, 'id' | 'employee_id'> & { 
  employee_ids: string[];
  license_plate?: string;
  visit_type?: string;
  manualVehicleNumber?: string;
};

interface BonusFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: Adjustment | null;
  vehicles?: VehicleRecord[];
}

export function BonusForm({ onSubmit, onCancel, initialData, vehicles = [] }: BonusFormProps) {
  const [allEmployees, setAllEmployees] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState<BonusFormData>({
    employee_ids: initialData ? [initialData.employee_id] : [],
    type: 'Bonus',
    amount: initialData?.amount || 0,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    remarks: initialData?.remarks || '',
    license_plate: (initialData as any)?.license_plate || '',
    visit_type: (initialData as any)?.visit_type || '',
    manualVehicleNumber: '',
  });

  const vehicleOptions = useMemo(() => {
    return [
      { value: "No Booking", label: "No Booking" },
      ...vehicles.map(v => {
        const originalPlate = v.id;
        return {
          value: originalPlate,
          label: `${v.vehicle} (${originalPlate})`
        };
      })
    ];
  }, [vehicles]);

  const totalBonusAmount = useMemo(() => {
    const numEmployees = formData.employee_ids.length;
    return (formData.amount || 0) * (numEmployees > 0 ? numEmployees : 1);
  }, [formData.amount, formData.employee_ids.length]);


  useEffect(() => {
    if (initialData) {
      const remarks = initialData.remarks || '';
      const visitTypeMatch = Object.keys(visitTypes).find(vt => remarks.includes(vt));
      const licensePlate = (initialData as any).license_plate;
      const manualVehicleMatch = licensePlate === 'No Booking' ? remarks.match(/for (.*?)\./)?.[1] : '';
        
      setFormData({
          ...(initialData as any),
          employee_ids: [initialData.employee_id],
          visit_type: visitTypeMatch || '',
          license_plate: licensePlate || 'No Booking',
          manualVehicleNumber: manualVehicleMatch,
          remarks: remarks.split('. ')[1] || '',
      });
    }
  }, [initialData]);
  

  useEffect(() => {
    async function loadEmployees() {
        setIsLoading(true);
        const emps = await getEmployees();
        setAllEmployees(emps.map((e: any) => ({
            value: e.employee_id,
            label: `${e.personal_info.name} (${e.employee_id})`
        })));
        setIsLoading(false);
    }
    loadEmployees();
  }, []);
  
  useEffect(() => {
    if(formData.visit_type) {
      const amount = visitTypes[formData.visit_type as keyof typeof visitTypes] || 0;
      setFormData(prev => ({...prev, amount }));
    }
  }, [formData.visit_type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };
  
  const handleMultiSelectChange = (values: string[]) => {
      setFormData({ ...formData, employee_ids: values });
  };

  const handleSelectChange = (id: keyof BonusFormData, value: string) => {
    setFormData({ ...formData, [id]: value });
  };
  
  const handleNumberChange = (id: keyof BonusFormData, value: string) => {
    setFormData({...formData, [id]: parseFloat(value) || 0 });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = {
        ...formData,
        amount: formData.amount, // Per employee amount
        total_commission: totalBonusAmount, // Total for all employees
    };
    onSubmit(submissionData);
  };
  

  if (isLoading) {
    return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
       <ScrollArea className="flex-grow pr-4">
        <div className="space-y-4 pt-4 pb-6">
          <div className="space-y-2">
              <Label htmlFor="employee_id"><span className="lang-en">Employee(s)</span><span className="lang-th">พนักงาน</span></Label>
               <MultiSelect
                    options={allEmployees}
                    selected={formData.employee_ids}
                    onChange={handleMultiSelectChange}
                    placeholder="Select one or more employees..."
                    disabled={!!initialData}
                />
            </div>
          
            <>
                <div className="space-y-2">
                  <Label htmlFor="license_plate">Vehicle</Label>
                  <Combobox 
                    options={vehicleOptions}
                    value={formData.license_plate || ''}
                    onChange={(value) => handleSelectChange('license_plate', value)}
                    placeholder="Select a vehicle..."
                    searchPlaceholder="Search vehicles..."
                  />
                </div>
                 {formData.license_plate === 'No Booking' && (
                  <div className="space-y-2">
                      <Label htmlFor="manualVehicleNumber">Manual Vehicle Number</Label>
                      <Input id="manualVehicleNumber" value={formData.manualVehicleNumber} onChange={handleChange} placeholder="e.g., HR26-1234"/>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="visit_type">Visit Type</Label>
                  <Select onValueChange={(value) => handleSelectChange('visit_type', value)} value={formData.visit_type}>
                    <SelectTrigger><SelectValue placeholder="Select visit type" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(visitTypes).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date"><span className="lang-en">Date</span><span className="lang-th">วันที่</span></Label>
              <Input id="date" type="date" value={formData.date} onChange={handleChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="amount"><span className="lang-en">
                Total Bonus Amount (฿)
              </span><span className="lang-th">
                จำนวนโบนัสทั้งหมด (฿)
              </span></Label>
              <Input 
                id="amount" 
                type="text" 
                value={`฿${totalBonusAmount.toLocaleString()}`} 
                readOnly
                className='font-bold bg-muted'
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="remarks"><span className="lang-en">Remarks</span><span className="lang-th">หมายเหตุ</span></Label>
            <Textarea id="remarks" value={formData.remarks || ''} onChange={handleChange} />
          </div>
        </div>
      </ScrollArea>
       <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}><span className="lang-en">Cancel</span><span className="lang-th">ยกเลิก</span></Button>
        <Button type="submit">
            <span className="lang-en">{initialData ? 'Save Changes' : 'Submit'}</span>
            <span className="lang-th">{initialData ? 'บันทึกการเปลี่ยนแปลง' : 'ส่ง'}</span>
        </Button>
      </div>
    </form>
  );
}
