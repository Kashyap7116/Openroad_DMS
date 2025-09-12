
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AttendanceRecord } from '@/app/(dashboard)/hr/attendance/page';

interface AttendanceFormProps {
    record: AttendanceRecord;
    onSubmit: (updatedRecord: AttendanceRecord) => void;
    onCancel: () => void;
}

export function AttendanceForm({ record, onSubmit, onCancel }: AttendanceFormProps) {
    const [formData, setFormData] = useState<AttendanceRecord>(record);

    useEffect(() => {
        setFormData(record);
    }, [record]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (value: string) => {
        setFormData(prev => ({ ...prev, status: value as AttendanceRecord['status'] }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
                <h4 className="font-semibold">{formData.name}</h4>
                <p className="text-sm text-muted-foreground">{new Date(formData.date.replace(/-/g, '/')).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select onValueChange={handleSelectChange} value={formData.status}>
                        <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Present">Present</SelectItem>
                            <SelectItem value="Late">Late</SelectItem>
                            <SelectItem value="Absent">Absent</SelectItem>
                            <SelectItem value="Leave">Leave</SelectItem>
                            <SelectItem value="Holiday">Holiday</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="in_time">In Time</Label>
                    <Input id="in_time" type="time" value={formData.in_time} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="out_time">Out Time</Label>
                    <Input id="out_time" type="time" value={formData.out_time} onChange={handleChange} />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" value={formData.remarks} onChange={handleChange} placeholder="Add any remarks..." />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
            </div>
        </form>
    );
}
