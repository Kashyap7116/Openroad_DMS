

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

export type SaleRecord = {
    sale_id: string;
    vehicle_license: string;
    buyer: {
        name: string;
        contact: string;
        address: string;
        id_proof: any;
    };
    sale_details: {
        sale_price: number;
        currency: 'THB';
        sale_date: string;
        payment_method: string;
        finance_company: string;
        down_payment?: number;
        loan_amount?: number;
        loan_tenure?: number;
        monthly_emi?: number;
    };
    freelancer_commission?: {
        name: string;
        address: string;
        commission: number;
        id_proof: any;
    };
    documents: any[];
};


interface SaleDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  record: SaleRecord | null | undefined;
  vehicleLicense: string;
}

const DetailItem = ({ label, value, isBold = false, className = '' }: { label: string; value?: string | number | React.ReactNode, isBold?: boolean, className?: string }) => (
    <div className={cn("flex flex-col", className)}>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className={cn("text-sm", isBold && "font-bold")}>{value || '-'}</div>
    </div>
);

const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div>
        <h3 className="text-lg font-semibold border-b pb-2 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {children}
        </div>
    </div>
);

const renderFilePreview = (file: any, name: string) => {
    if (!file) return <p className="text-sm text-muted-foreground"><span className="lang-en">Not provided</span><span className="lang-th">ไม่ได้ให้ไว้</span></p>;
    const fileName = typeof file === 'string' ? name : file.name;
    const fileUrl = typeof file === 'string' ? file : file.preview;
    const isImage = typeof file === 'string' ? file.startsWith('data:image') : file?.type?.startsWith('image');
    
    return (
        <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{fileName}</a>
             {isImage && fileUrl && <Image src={fileUrl} alt="preview" width={40} height={40} className="rounded-md object-cover" />}
        </div>
    );
};


export function SaleDetailsDialog({ isOpen, onClose, record, vehicleLicense }: SaleDetailsDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle><span className="lang-en">Sale Details:</span><span className="lang-th">รายละเอียดการขาย:</span> {record.sale_id}</DialogTitle>
          <DialogDescription>
            <span className="lang-en">Viewing sale record for vehicle with license plate {vehicleLicense}.</span>
            <span className="lang-th">กำลังดูบันทึกการขายสำหรับยานพาหนะที่มีป้ายทะเบียน {vehicleLicense}</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4">
             <div className="space-y-6 py-4">
                <DetailSection title="Vehicle & Buyer">
                    <DetailItem label="Vehicle License Plate" value={vehicleLicense} isBold />
                    <DetailItem label="Buyer Name" value={record.buyer.name} />
                    <DetailItem label="Buyer Contact" value={record.buyer.contact} />
                    <DetailItem label="Buyer Address" value={record.buyer.address} className="md:col-span-2"/>
                    <DetailItem label="Buyer ID Proof" value={renderFilePreview(record.buyer.id_proof, "id_proof")} />
                </DetailSection>

                <DetailSection title="Sale & Payment">
                    <DetailItem label="Sale Price" value={`฿${record.sale_details.sale_price.toLocaleString()}`} isBold />
                    <DetailItem label="Sale Date" value={record.sale_details.sale_date} />
                    <DetailItem label="Payment Method" value={record.sale_details.payment_method} />
                    {record.sale_details.payment_method === 'Financing' && (
                    <>
                        <DetailItem label="Finance Company" value={record.sale_details.finance_company} />
                        <DetailItem label="Down Payment" value={`฿${(record.sale_details.down_payment || 0).toLocaleString()}`} />
                        <DetailItem label="Loan Amount" value={`฿${(record.sale_details.loan_amount || 0).toLocaleString()}`} />
                        <DetailItem label="Loan Tenure" value={`${record.sale_details.loan_tenure || 0} months`} />
                        <DetailItem label="Monthly EMI" value={`฿${(record.sale_details.monthly_emi || 0).toLocaleString()}`} />
                    </>
                    )}
                </DetailSection>

                {record.freelancer_commission && record.freelancer_commission.name && (
                     <DetailSection title="Freelancer Commission">
                        <DetailItem label="Freelancer Name" value={record.freelancer_commission.name} />
                        <DetailItem label="Commission" value={`฿${(record.freelancer_commission.commission || 0).toLocaleString()}`} />
                        <DetailItem label="Address" value={record.freelancer_commission.address} className="md:col-span-2"/>
                        <DetailItem label="ID Proof" value={renderFilePreview(record.freelancer_commission.id_proof, "freelancer_id")} />
                    </DetailSection>
                )}
                
                <DetailSection title="Uploaded Documents">
                    <div className="md:col-span-2">
                    {record.documents.length > 0 ? record.documents.map((doc, i) =>
                        <DetailItem key={i} label={`Document ${i+1}`} value={renderFilePreview(doc, `document_${i+1}`)} />
                    ) : <p className="text-sm text-muted-foreground"><span className="lang-en">No documents uploaded.</span><span className="lang-th">ไม่มีเอกสารที่อัปโหลด</span></p>}
                    </div>
                </DetailSection>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
