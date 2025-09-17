
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/modules/shared/components/ui/ui/dialog";
import { Button } from "@/modules/shared/components/ui/ui/button";
import { Label } from '@/modules/shared/components/ui/ui/label';
import { Input } from '@/modules/shared/components/ui/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, Upload, Download } from "lucide-react";
import { getHolidays, saveHolidays } from '@/modules/hr/services/hr-actions';
import { processHolidaysFile } from '@/ai/flows/process-holidays-file';

export type HolidayRecord = {
  date: string;
  name: string;
};

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface HolidayDialogProps {
  year: number;
  onCancel: () => void;
  onSave: () => void;
}

export function HolidayDialog({ year, onCancel, onSave }: HolidayDialogProps) {
    const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
    const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const loadHolidays = useCallback(async () => {
        setIsLoading(true);
        const data = await getHolidays(year);
        setHolidays(data.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setIsLoading(false);
    }, [year]);

    useEffect(() => {
        loadHolidays();
    }, [loadHolidays]);

    const handleAddHoliday = () => {
        if (!newHoliday.date || !newHoliday.name) {
            toast({ title: "Error", description: "Please enter both a date and a name for the holiday.", variant: "destructive" });
            return;
        }
        if (holidays.some(h => h.date === newHoliday.date)) {
             toast({ title: "Error", description: "This date is already added as a holiday.", variant: "destructive" });
            return;
        }
        setHolidays(prev => [...prev, newHoliday].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setNewHoliday({ date: '', name: '' });
    };

    const handleDeleteHoliday = (date: string) => {
        setHolidays(prev => prev.filter(h => h.date !== date));
    };
    
    const handleSaveChanges = async () => {
        setIsLoading(true);
        const result = await saveHolidays(year, holidays);
        if (result.success) {
            toast({ title: "Success", description: "Holiday list has been updated."});
            onSave(); // This will trigger a refetch on the main page
            onCancel(); // Close the dialog
        } else {
            toast({ title: "Error", description: `Failed to save holidays: ${result.error}`, variant: "destructive" });
        }
        setIsLoading(false);
    };

    const handleFileProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const fileDataUri = await fileToDataUri(file);
            const parsedHolidays = await processHolidaysFile({ fileDataUri });
            
            // Merge results, avoiding duplicates
            const holidaysMap = new Map(holidays.map(h => [h.date, h]));
            parsedHolidays.forEach(h => {
                if(h.date && h.name) holidaysMap.set(h.date, h)
            });

            setHolidays(Array.from(holidaysMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            
            toast({ title: "File Processed", description: `${parsedHolidays.length} holidays were parsed from the file.` });
        } catch (error) {
            console.error("Holiday file processing failed:", error);
            toast({ title: "Processing Failed", description: "The AI failed to process the holiday file. Please check the format.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
             // Reset file input
            e.target.value = '';
        }
    }

    return (
        <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>Manage Holidays for {year}</DialogTitle>
                <DialogDescription>Add or remove holidays. These will be considered for overtime calculation.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                 <div className="flex justify-between items-center gap-2 p-2 rounded-md bg-muted/50 border">
                    <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline" disabled={isProcessing}>
                             <label htmlFor="holiday-upload">
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                                Upload File
                            </label>
                        </Button>
                        <input type="file" id="holiday-upload" className="hidden" onChange={handleFileProcess} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                         <p className="text-xs text-muted-foreground">Upload an Excel or CSV file.</p>
                    </div>
                    <Button asChild size="sm" variant="link" className="text-xs">
                        <a href="/holidays_template.csv" download>
                           <Download className="mr-1 h-3 w-3"/> Download Template
                        </a>
                    </Button>
                </div>
                <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                    {isLoading ? <Loader2 className="mx-auto animate-spin" /> :
                     holidays.length > 0 ? (
                        holidays.map(holiday => (
                            <div key={holiday.date} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                <div>
                                    <p className="font-medium">{holiday.name}</p>
                                    <p className="text-sm text-muted-foreground">{new Date(holiday.date.replace(/-/g, '/')).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric'})}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteHoliday(holiday.date)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                     ) : (
                         <p className="text-sm text-center text-muted-foreground py-4">No holidays added for {year}.</p>
                     )}
                </div>

                <div className="flex items-end gap-2 border-t pt-4">
                    <div className="flex-grow space-y-1">
                        <Label htmlFor="holiday-name" className="text-xs">Holiday Name</Label>
                        <Input id="holiday-name" value={newHoliday.name} onChange={e => setNewHoliday(p => ({...p, name: e.target.value}))} />
                    </div>
                     <div className="flex-grow space-y-1">
                        <Label htmlFor="holiday-date" className="text-xs">Date</Label>
                        <Input id="holiday-date" type="date" value={newHoliday.date} onChange={e => setNewHoliday(p => ({...p, date: e.target.value}))} />
                    </div>
                    <Button onClick={handleAddHoliday}><PlusCircle className="h-4 w-4"/></Button>
                </div>
            </div>
            <DialogFooter>
                 <Button variant="outline" onClick={onCancel}>Cancel</Button>
                 <Button onClick={handleSaveChanges} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}



