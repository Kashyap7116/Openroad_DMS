
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import type { MaintenanceRecord } from '@/app/(dashboard)/maintenance/page';
import { FileText } from "lucide-react";

interface RecordDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  record: MaintenanceRecord | null;
}

const DetailItem = ({ label, value }: { label: string; value: string | number | React.ReactNode }) => (
    <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <p className="text-sm">{value}</p>
    </div>
);


export function RecordDetailsDialog({ isOpen, onClose, record }: RecordDetailsDialogProps) {
  if (!record) return null;

  const renderFilePreview = (file: any, name: string) => {
    if (!file) return <p className="text-sm text-muted-foreground"><span className="lang-en">Not provided</span><span className="lang-th">ไม่ได้ให้ไว้</span></p>;
    
    const fileUrl = typeof file === 'string' ? file : file.preview;
    const fileName = typeof file === 'string' ? name : file.name;
    const isImage = typeof file === 'string' ? (file.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file)) : file?.type?.startsWith('image');

    return (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{fileName}</a>
        {isImage && fileUrl && <Image src={fileUrl} alt="preview" width={40} height={40} className="rounded-md object-cover" />}
      </div>
    );
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle><span className="lang-en">Maintenance Details</span><span className="lang-th">รายละเอียดการซ่อมบำรุง</span></DialogTitle>
          <DialogDescription>
            <span className="lang-en">Viewing record for {record.vehicle} ({record.license_plate})</span>
            <span className="lang-th">กำลังดูบันทึกสำหรับ {record.vehicle} ({record.license_plate})</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
            <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Maintenance ID" value={record.maintenance_id} />
                    <DetailItem label="Service Date" value={record.service_date} />
                    <DetailItem label="Vehicle" value={record.vehicle} />
                    <DetailItem label="License Plate" value={record.license_plate} />
                </div>
                
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground"><span className="lang-en">Service Items</span><span className="lang-th">รายการบริการ</span></Label>
                    <p className="text-sm p-3 bg-muted rounded-md">{record.items}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailItem label="Cost" value={`฿${record.cost.toLocaleString()}`} />
                    <DetailItem label="Tax" value={`฿${record.tax.toLocaleString()}`} />
                    <DetailItem label="Total" value={<span className="font-bold">฿{record.total.toLocaleString()}</span>} />
                    <DetailItem label="Status" value={<Badge variant={record.status === 'Completed' ? 'default' : 'secondary'} className={record.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{record.status}</Badge>} />
                </div>

                {record.remarks && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground"><span className="lang-en">Remarks</span><span className="lang-th">หมายเหตุ</span></Label>
                        <p className="text-sm p-3 bg-muted rounded-md">{record.remarks}</p>
                    </div>
                )}
                
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground"><span className="lang-en">Invoice</span><span className="lang-th">ใบแจ้งหนี้</span></Label>
                    {renderFilePreview(record.invoiceFile, "invoice.pdf")}
                </div>

            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
