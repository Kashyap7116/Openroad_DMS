
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/modules/shared/components/ui/ui/dialog";
import { Button } from "@/modules/shared/components/ui/ui/button";
import { ScrollArea } from "@/modules/shared/components/ui/ui/scroll-area";
import { Download, Printer } from "lucide-react";
import type { PayrollRecord } from '@/app/(dashboard)/hr/payroll/page';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useMemo } from "react";

interface PayslipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
  period: { month: number, year: number };
  months: { value: number; label: string; }[];
}

const DetailRow = ({ label, value, isTotal = false, isNet = false, className = '' }: { label: string; value: string | number; isTotal?: boolean; isNet?: boolean, className?: string }) => (
    <div className={`flex justify-between items-center py-1.5 ${isTotal ? 'font-bold border-t' : ''} ${className}`}>
        <p className={`text-sm ${isNet ? 'text-base font-bold' : ''}`}>{label}</p>
        <p className={`text-sm text-right font-mono ${isNet ? 'text-base font-bold' : ''}`}>
            {typeof value === 'number' ? `THB ${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : value}
        </p>
    </div>
);

const AdvanceSummaryRow = ({ label, value }: { label: string; value: string | number; }) => (
     <div className="flex justify-between items-center text-sm py-1.5 px-2">
        <p className="text-gray-600">{label}</p>
        <p className="font-mono font-semibold">
            {typeof value === 'number' ? `THB ${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : String(value)}
        </p>
    </div>
);


export function PayslipDialog({ isOpen, onClose, record, period, months }: PayslipDialogProps) {
  const advanceSummary = useMemo(() => {
    if (!record || !record.all_time_financial_history) {
      return null;
    }
    const allHistory = record.all_time_financial_history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastAdvance = allHistory.find(tx => tx.type === 'Advance');

    if (!lastAdvance) {
      return null;
    }
    
    const repayments = allHistory.filter(tx => 
        tx.type === 'Deduction' && 
        tx.remarks?.includes('Advance Installment') &&
        tx.remarks?.includes(lastAdvance.id)
    );
    
    const totalRepaid = repayments.reduce((sum, tx) => sum + tx.amount, 0);
    const remainingAmount = lastAdvance.amount - totalRepaid;

    return {
      id: lastAdvance.id,
      total_advance: lastAdvance.amount,
      installments: lastAdvance.installments || 1,
      current_installment: repayments.length,
      remaining_amount: remainingAmount
    }

  }, [record]);


  if (!record) return null;
  
  const periodLabel = `${months.find(m => m.value === period.month)?.label} ${period.year}`;
  const totalDeductions = record.deductions.reduce((acc, d) => acc + d.amount, 0);
  const totalEarnings = record.prorated_salary + record.ot_pay + record.bonus + record.advance_given_this_period;
  
  const handleDownloadPdf = () => {
    const content = document.getElementById('payslip-content');
    if (content) {
      html2canvas(content, {
        scale: 2, // Higher scale for better quality
        onclone: (document) => {
          // Force white background and black text on the cloned element for PDF
          const clonedContent = document.getElementById('payslip-content');
          if (clonedContent) {
            clonedContent.style.fontFamily = 'sans-serif'; // Use a standard font
            clonedContent.querySelectorAll('*').forEach((el) => {
                const element = el as HTMLElement;
                element.style.color = 'black';
                element.style.borderColor = '#ccc';
            });
            // Ensure the main container has a white background
            clonedContent.style.backgroundColor = 'white';
          }
        },
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        
        // A4 page dimensions in points: 595.28 x 841.89
        const pdfWidth = 595.28;
        const pdfHeight = 841.89;
        
        const contentWidth = canvas.width;
        const contentHeight = canvas.height;
        
        // 1 inch = 72 points. 0.25 inch = 18 points.
        const margin = 18; 
        const availableWidth = pdfWidth - (margin * 2);
        
        const ratio = availableWidth / contentWidth;
        const imgWidth = availableWidth;
        const imgHeight = contentHeight * ratio;
        
        // Place the image in the top half of the page
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        
        pdf.save(`Payslip_${periodLabel}_${record.name.replace(/ /g, '_')}.pdf`);
      });
    }
  };
  
  const advance = advanceSummary;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Payslip Preview</DialogTitle>
          <DialogDescription>
            Preview for {record.name} - {periodLabel}. This will be exported to a half-page PDF.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] bg-gray-200 p-4">
            <div id="payslip-content" className="p-4 w-full mx-auto bg-white text-black font-sans">
                 <div className="p-5 border border-gray-300 rounded-lg" style={{ fontFamily: 'sans-serif', fontSize: '11pt' }}>
                    {/* Header */}
                    <div className="text-center mb-4">
                        <h1 className="text-xl font-bold">OpenroadDMS</h1>
                        <p className="text-sm text-gray-500">Payslip for {periodLabel}</p>
                    </div>

                    {/* Employee Details */}
                     <div className="mb-4 p-4 border border-gray-300 rounded">
                        <h2 className="text-sm font-bold mb-2 uppercase tracking-wider">Employee Information</h2>
                        <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-sm">
                            <span className="text-gray-600">Employee Name:</span> <span className="font-semibold col-span-1">{record.name}</span>
                            <span className="text-gray-600">Employee ID:</span> <span className="font-semibold col-span-1">{record.employee_id}</span>
                             <span className="text-gray-600">Department:</span> <span className="font-semibold col-span-1">{record.calculation_details.department || 'N/A'}</span>
                            <span className="text-gray-600">Position:</span> <span className="font-semibold col-span-1">{record.calculation_details.position || 'N/A'}</span>
                        </div>
                    </div>
                    
                    {/* Earnings & Deductions */}
                    <div className="grid grid-cols-2 gap-x-4">
                        <div className="p-4 border border-gray-300 rounded">
                            <h3 className="font-bold text-base mb-2">Earnings</h3>
                            <DetailRow label="Base Salary" value={record.base_salary} />
                            <DetailRow label={`Prorated Salary (${record.present_days}/${record.working_days} days)`} value={record.prorated_salary} />
                            <DetailRow label={`Payable Overtime (${(record.payable_ot_hours || 0).toFixed(2)} hrs)`} value={record.ot_pay} />
                            <DetailRow label="Bonus / Additions" value={record.bonus} />
                             {record.advance_given_this_period > 0 && <DetailRow label="Advance Credited" value={record.advance_given_this_period} />}
                            <DetailRow label="Total Earnings" value={totalEarnings} isTotal className="mt-2"/>
                        </div>
                         <div className="p-4 border border-gray-300 rounded">
                            <h3 className="font-bold text-base mb-2">Deductions</h3>
                            {record.deductions.length > 0 ? (
                                record.deductions.map(d => (
                                    <DetailRow key={d.id} label={d.remarks} value={d.amount} />
                                ))
                            ) : (
                                <DetailRow label="No Deductions" value={0} />
                            )}
                            <DetailRow label="Total Deductions" value={totalDeductions} isTotal className="mt-2"/>
                        </div>
                    </div>

                     {/* Net Salary */}
                     <div className="mt-4 p-2 border-y border-gray-300">
                        <DetailRow label="NET SALARY" value={record.net_salary} isNet />
                     </div>

                    {/* Advance Summary */}
                    {advance && advance.total_advance > 0 && (
                        <div className="mt-4 pt-2 border border-gray-300 rounded">
                            <h3 className="font-bold text-sm text-center my-1 uppercase tracking-wider">Advance Summary</h3>
                             <div className="border-t border-gray-300 p-2">
                                <AdvanceSummaryRow label="Total Advance Amount" value={advance.total_advance} />
                                <AdvanceSummaryRow label="Installments Paid" value={`${advance.current_installment} / ${advance.installments}`} />
                                <AdvanceSummaryRow label="Remaining Balance" value={advance.remaining_amount} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </ScrollArea>
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Button onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


