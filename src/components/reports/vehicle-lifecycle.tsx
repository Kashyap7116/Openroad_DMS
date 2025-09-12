
'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDownRight, ArrowUpRight, DollarSign, Wrench, ShoppingCart, Tag, Download, UserCheck, Briefcase, CarIcon, User } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string, icon: React.ElementType, color: string }) => (
    <div className={`p-3 rounded-lg flex items-center gap-3 bg-card`}>
        <div className={`p-2 rounded-lg bg-${color}-500/10`}>
            <Icon className={`h-5 w-5 text-${color}-500`} />
        </div>
        <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
        </div>
    </div>
);

const DetailRow = ({ label, value, isAmount = false }: { label: string, value?: string | number | null, isAmount?: boolean }) => {
    if (!value && value !== 0) return null;
    return (
        <div className="py-2 border-b border-border/50 flex justify-between items-center text-xs">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold">{isAmount ? `฿${(Number(value) || 0).toLocaleString()}` : value || '-'}</dd>
        </div>
    )
};

const SectionCard = ({ title, icon: Icon, children, className }: { title: string, icon: React.ElementType, children: React.ReactNode, className?: string }) => (
    <Card className={`bg-card/50 ${className}`}>
        <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary"/> {title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <dl className="text-xs">
                {children}
            </dl>
        </CardContent>
    </Card>
);


export function VehicleLifecycle({ report }: { report: any }) {
  const { vehicle, summary } = report;

  const handleDownloadPdf = () => {
    const reportElement = document.getElementById('vehicle-lifecycle-report');
    if (reportElement) {
        html2canvas(reportElement, {
            scale: 2,
            useCORS: true,
             onclone: (document) => {
                const clonedContent = document.getElementById('vehicle-lifecycle-report');
                if (clonedContent) {
                    clonedContent.style.fontFamily = 'sans-serif';
                    clonedContent.style.backgroundColor = 'white';
                    clonedContent.querySelectorAll('*').forEach((el: any) => {
                       el.style.color = 'black';
                       el.style.borderColor = '#ccc';
                    });
                     clonedContent.querySelectorAll('.bg-card').forEach((el: any) => {
                        el.style.backgroundColor = '#f9fafb';
                     });
                     clonedContent.querySelectorAll('.bg-card\\/50').forEach((el: any) => {
                        el.style.backgroundColor = '#f9fafb';
                     });
                      clonedContent.querySelectorAll('.text-muted-foreground').forEach((el: any) => {
                        el.style.color = '#6b7280';
                     });
                }
            },
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;

            let imgWidth = pdfWidth - 40; 
            let imgHeight = imgWidth / ratio;
            
            if (imgHeight > pdfHeight - 40) {
              imgHeight = pdfHeight - 40;
              imgWidth = imgHeight * ratio;
            }

            const x = (pdfWidth - imgWidth) / 2;
            const y = 20;
            
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            pdf.save(`${vehicle.license_plate}_Lifecycle_Report.pdf`);
        });
    }
  };


  return (
    <div className="space-y-4">
        <div className="flex justify-between items-start">
             <div>
                <h2 className="text-xl font-bold">{vehicle.vehicle} - {vehicle.license_plate}</h2>
                <p className="text-sm text-muted-foreground">Full financial and operational lifecycle analysis.</p>
            </div>
            <Button onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
        </div>
        <div id="vehicle-lifecycle-report" className="space-y-4 p-4 bg-muted/30 dark:bg-muted/10 rounded-lg">
            <div className="text-center mb-4">
                <h2 className="text-lg font-bold">Vehicle Lifecycle Analysis</h2>
                <p className="text-sm text-muted-foreground">{vehicle.vehicle} ({vehicle.license_plate})</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Total Expenses" value={`฿${summary.totalExpenses.toLocaleString()}`} icon={ArrowDownRight} color="red" />
                <StatCard title="Total Income" value={`฿${summary.totalIncome.toLocaleString()}`} icon={ArrowUpRight} color="green" />
                <StatCard title="Net Profit / Loss" value={`฿${summary.profitLoss.toLocaleString()}`} icon={DollarSign} color={summary.profitLoss >= 0 ? "green" : "red"} />
            </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SectionCard title="Vehicle Details" icon={CarIcon}>
                <DetailRow label="Original License Plate" value={vehicle.fullData.previousLicensePlate || vehicle.license_plate} />
                <DetailRow label="Current License Plate" value={vehicle.license_plate} />
                <DetailRow label="Brand" value={vehicle.fullData.otherBrand || vehicle.fullData.brand} />
                <DetailRow label="Model" value={vehicle.fullData.otherModel || vehicle.fullData.model} />
                <DetailRow label="Year" value={vehicle.fullData.year} />
                <DetailRow label="VIN/Chassis No." value={vehicle.fullData.vin} />
                <DetailRow label="Engine No." value={vehicle.fullData.engineNumber} />
                <DetailRow label="Color" value={vehicle.fullData.color} />
                <DetailRow label="Initial Mileage" value={`${(vehicle.fullData.mileage || 0).toLocaleString()} km`} />
            </SectionCard>
            
            <SectionCard title="Purchase Details" icon={ShoppingCart}>
                <DetailRow label="Purchase ID" value={vehicle.id} />
                <DetailRow label="Purchase Date" value={vehicle.date} />
                <DetailRow label="Seller" value={vehicle.seller} />
                <DetailRow label="Seller Phone" value={vehicle.fullData.sellerPhone} />
                <DetailRow label="Purchase Price" value={summary.purchaseCost} isAmount />
                <DetailRow label="Other Fees" value={summary.otherPurchaseFees} isAmount />
                <DetailRow label="Total Purchase Cost" value={summary.totalPurchaseCost} isAmount />
            </SectionCard>

            <SectionCard title="Freelancer Details" icon={Briefcase}>
                <DetailRow label="Freelancer Name" value={vehicle.fullData.freelancerName} />
                <DetailRow label="Freelancer Phone" value={vehicle.fullData.freelancerPhone} />
                <DetailRow label="Commission Type" value={vehicle.fullData.commissionType} />
                <DetailRow label="Commission Value" value={`${vehicle.fullData.commissionType === 'Fixed' ? '฿' : ''}${(vehicle.fullData.commissionValue || 0).toLocaleString()}${vehicle.fullData.commissionType === 'Percentage' ? '%' : ''}`} />
            </SectionCard>

            <SectionCard title="Other Financials" icon={DollarSign}>
                {(vehicle.financial_history || [])
                  .filter((tx: any) => !['Vehicle Purchase Cost'].includes(tx.category))
                  .map((tx: any) => (
                     <DetailRow key={tx.transaction_id} label={`${tx.category} (${tx.date})`} value={tx.amount} isAmount />
                ))}
            </SectionCard>
            
            <SectionCard title="Maintenance History" icon={Wrench}>
                {(vehicle.maintenance_history || []).map((m: any) => (
                    <DetailRow key={m.maintenance_id} label={`${m.items} (${m.service_date})`} value={m.total} isAmount />
                ))}
            </SectionCard>
            
            <SectionCard title="Employee Bonuses" icon={User}>
                {(vehicle.bonus_history || []).map((b: any) => (
                    <DetailRow key={b.id} label={`${b.employee_name} (${b.date})`} value={b.amount} isAmount />
                ))}
            </SectionCard>

            {vehicle.sale_details && (
                <SectionCard title="Sale Details" icon={Tag}>
                    <DetailRow label="Sale ID" value={vehicle.sale_details.sale_id} />
                    <DetailRow label="Sale Date" value={vehicle.sale_details.sale_details.sale_date} />
                    <DetailRow label="Buyer" value={vehicle.sale_details.buyer.name} />
                    <DetailRow label="Buyer Phone" value={vehicle.sale_details.buyer.contact} />
                    <DetailRow label="Sale Price" value={summary.salePrice} isAmount />
                </SectionCard>
            )}
            
          </div>
        </div>
    </div>
  );
}
