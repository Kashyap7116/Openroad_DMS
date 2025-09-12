
'use client';

import React, { useState } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface UploadDialogProps {
  onSubmit: (f: string) => Promise<void>;
  onCancel: () => void;
}

function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


export function UploadDialog({ onSubmit, onCancel }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!file) {
        toast({ title: "No File Selected", description: "Please select a file to upload.", variant: "destructive" });
        return;
    }
    
    setIsProcessing(true);
    try {
        const fileDataUri = await fileToDataUri(file);
        await onSubmit(fileDataUri);
    } catch (error) {
        console.error("File reading or processing failed:", error);
        toast({ title: "Upload Failed", description: "Could not read or process the selected file.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Upload Attendance Sheet</DialogTitle>
        <DialogDescription>
          Select the file to upload. The AI will automatically detect the attendance period (e.g., Aug 21 - Sep 20) and process the records from CSV or Excel files.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="file">File</Label>
          <Input id="file" type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" disabled={isProcessing} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!file || isProcessing}>
          {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Upload and Process'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
