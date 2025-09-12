
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { PayrollRecord, DeductionItem } from '@/app/(dashboard)/hr/payroll/page';

interface DeductionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
  onSave: (employeeId: string, deductions: DeductionItem[]) => void;
}

export function DeductionDialog({ isOpen, onClose, record, onSave }: DeductionDialogProps) {
  const { toast } = useToast();
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);
  const [newDeduction, setNewDeduction] = useState({ amount: '', remarks: '' });

  useEffect(() => {
    if (record) {
      setDeductions(record.deductions || []);
    }
  }, [record]);

  const handleAddDeduction = () => {
    const amount = parseFloat(newDeduction.amount);
    if (!amount || amount <= 0 || !newDeduction.remarks) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid amount and remarks for the deduction.",
        variant: "destructive"
      });
      return;
    }

    setDeductions(prev => [
      ...prev,
      {
        id: `ded-${Date.now()}`,
        amount,
        remarks: newDeduction.remarks
      }
    ]);
    setNewDeduction({ amount: '', remarks: '' });
  };
  
  const handleDeleteDeduction = (id: string) => {
    setDeductions(prev => prev.filter(d => d.id !== id));
  };

  const handleSave = () => {
    if (record) {
      onSave(record.employee_id, deductions);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage Deductions for {record.name}</DialogTitle>
          <DialogDescription>
            Add or remove deductions. Changes will be reflected in the net salary calculation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Existing Deductions</Label>
            <ScrollArea className="h-40 rounded-md border p-2">
              {deductions.length > 0 ? (
                deductions.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                    <div>
                      <p className="font-semibold">฿{d.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{d.remarks}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDeduction(d.id)}>
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-center text-muted-foreground py-4">No deductions added yet.</p>
              )}
            </ScrollArea>
          </div>
          <div className="border-t pt-4 space-y-4">
            <Label>Add New Deduction</Label>
            <div className="flex items-start gap-2">
              <div className="space-y-1">
                <Label htmlFor="amount" className="text-xs">Amount (฿)</Label>
                <Input id="amount" type="number" placeholder="500" value={newDeduction.amount} onChange={e => setNewDeduction(p => ({...p, amount: e.target.value}))}/>
              </div>
              <div className="flex-grow space-y-1">
                <Label htmlFor="remarks" className="text-xs">Remarks</Label>
                <Textarea id="remarks" placeholder="e.g., Late arrival fine" value={newDeduction.remarks} onChange={e => setNewDeduction(p => ({...p, remarks: e.target.value}))}/>
              </div>
              <div className="self-end">
                <Button onClick={handleAddDeduction} size="icon"><PlusCircle className="h-4 w-4"/></Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
