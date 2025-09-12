
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUpload } from '@/components/ui/file-upload';
import { ReviewSection, ReviewItem, renderFilePreview } from '@/components/shared/review-step';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';
import { generateNewId } from '@/lib/utils';
import { getAllVehicles } from '@/lib/vehicle-actions';
import { VehicleSelector } from '@/components/shared/vehicle-selector';

const steps = [
  { id: 1, title: 'Vehicle & Buyer' },
  { id: 2, title: 'Sale & Payment' },
  { id: 3, title: 'Freelancer Commission' },
  { id: 4, title: 'Documents' },
  { id: 5, title: 'Review & Submit' },
];

type FileWithPreview = File & { preview: string };

type SaleData = {
    sale_id: string;
    vehicle_license: string;
    buyer: {
        name: string;
        contact: string;
        address: string;
        id_proof: FileWithPreview | null | string;
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
        id_proof: FileWithPreview | null | string;
    };
    documents: (FileWithPreview | string)[];
};

const initialFormData: Omit<SaleData, 'sale_id'|'vehicle_license'> = {
    buyer: {
        name: '',
        contact: '',
        address: '',
        id_proof: null,
    },
    sale_details: {
        sale_price: 0,
        currency: 'THB',
        sale_date: '',
        payment_method: 'Cash',
        finance_company: '',
        down_payment: 0,
        loan_amount: 0,
        loan_tenure: 0,
        monthly_emi: 0,
    },
    freelancer_commission: {
        name: '',
        address: '',
        commission: 0,
        id_proof: null,
    },
    documents: [],
};


interface MultiStepSaleFormProps {
    onSubmit: (data: { vehicle_license: string, saleData: any }) => void;
    onCancel: () => void;
    initialData?: VehicleRecord | null;
    vehicles: VehicleRecord[];
}

export function MultiStepSaleForm({ onSubmit, onCancel, initialData, vehicles }: MultiStepSaleFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [formData, setFormData] = useState(initialFormData as any);
  const { toast } = useToast();

  const availableVehicles = useMemo(() => {
    return vehicles.filter(p => p.status === 'Completed');
  }, [vehicles]);

  useEffect(() => {
    if (initialData && initialData.sale_details) {
        setSelectedVehicle(initialData.id);
        // Ensure freelancer_commission exists
        const saleDetailsWithDefaults = {
            ...initialFormData,
            ...initialData.sale_details,
            freelancer_commission: initialData.sale_details.freelancer_commission || initialFormData.freelancer_commission
        };
        setFormData(saleDetailsWithDefaults);
    } else {
        setSelectedVehicle('');
        setFormData(initialFormData);
    }
  }, [initialData]);
  
  useEffect(() => {
      const { sale_price, down_payment } = formData.sale_details;
      if(formData.sale_details.payment_method === 'Financing') {
        const loanAmount = sale_price - (down_payment || 0);
        handleChange('sale_details', 'loan_amount', loanAmount > 0 ? loanAmount : 0)
      }
  }, [formData.sale_details.sale_price, formData.sale_details.down_payment, formData.sale_details.payment_method]);

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleChange = (section: keyof typeof initialFormData | 'freelancer_commission', field: string, value: any) => {
      setFormData(prev => {
          const newSectionData = { ...(prev[section] as object), [field]: value };
          return { ...prev, [section]: newSectionData };
      });
  };
  
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, section: 'buyer' | 'documents' | 'freelancer_commission', fieldName: string, isMultiple: boolean = false) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (isMultiple) {
            const newFiles = Array.from(files).map(file => Object.assign(file, {
                preview: URL.createObjectURL(file)
            }));
            setFormData(prev => ({
                ...prev,
                documents: [...prev.documents, ...newFiles]
            }));
        } else {
            const file = files[0];
            const fileWithPreview = Object.assign(file, {
                preview: URL.createObjectURL(file)
            });
            handleChange(section, fieldName, fileWithPreview);
        }
    };

    const removeImage = (section: 'buyer' | 'documents' | 'freelancer_commission', fieldName: string, index?: number) => {
        if (section === 'documents' && typeof index === 'number') {
            setFormData(prev => {
                const currentDocs = [...prev.documents];
                const fileToRemove = currentDocs[index];
                if (typeof fileToRemove !== 'string') {
                    URL.revokeObjectURL(fileToRemove.preview);
                }
                currentDocs.splice(index, 1);
                return { ...prev, documents: currentDocs };
            });
        } else { // Single file
             const file = (formData[section] as any)[fieldName] as FileWithPreview | string | null;
            if(file && typeof file !== 'string') URL.revokeObjectURL(file.preview);
            handleChange(section, fieldName, null);
        }
    };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedVehicle){
        toast({ title: "Validation Error", description: "Please select a vehicle.", variant: 'destructive' });
        setCurrentStep(0);
        return;
    }
    if(!formData.buyer.name || !formData.sale_details.sale_price){
        toast({ title: "Validation Error", description: "Buyer Name and Sale Price are required.", variant: 'destructive' });
        setCurrentStep(1);
        return;
    }
    
    let saleId = formData.sale_id;
    if (!saleId) {
        const allVehicles = await getAllVehicles();
        const allSaleIds = allVehicles
            .filter(v => v.sale_details?.sale_id)
            .map(v => v.sale_details.sale_id);
        saleId = generateNewId('SL', allSaleIds);
    }

    const finalSaleData = {
      ...formData,
      sale_id: saleId
    }

    onSubmit({ vehicle_license: selectedVehicle, saleData: finalSaleData });
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vehicle_license">Vehicle to Sell <span className="text-destructive">*</span></Label>
              <VehicleSelector
                vehicles={availableVehicles}
                value={selectedVehicle}
                onChange={setSelectedVehicle}
                disabled={!!initialData}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyerName">Buyer Name <span className="text-destructive">*</span></Label>
              <Input id="buyerName" value={formData.buyer.name} onChange={e => handleChange('buyer', 'name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyerContact">Buyer Contact Number</Label>
              <Input id="buyerContact" value={formData.buyer.contact} onChange={e => handleChange('buyer', 'contact', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="buyerAddress">Buyer Address</Label>
              <Textarea id="buyerAddress" value={formData.buyer.address} onChange={e => handleChange('buyer', 'address', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="buyerIdProof">Upload Buyer ID Proof</Label>
              <FileUpload name="buyerIdProof" file={formData.buyer.id_proof} onFileChange={(e) => handleFileChange(e, 'buyer', 'id_proof')} onRemove={() => removeImage('buyer', 'id_proof')} />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salePrice">Sale Price (฿) <span className="text-destructive">*</span></Label>
                <Input id="salePrice" type="number" value={formData.sale_details.sale_price} onChange={e => handleChange('sale_details', 'sale_price', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saleDate">Sale Date</Label>
                <Input id="saleDate" type="date" value={formData.sale_details.sale_date} onChange={e => handleChange('sale_details', 'sale_date', e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select onValueChange={(value) => handleChange('sale_details', 'payment_method', value)} value={formData.sale_details.payment_method}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Financing">Financing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.sale_details.payment_method === 'Financing' && (
              <Card className="p-4 bg-muted/50">
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="financeCompany">Finance Company</Label>
                        <Input id="financeCompany" value={formData.sale_details.finance_company} onChange={e => handleChange('sale_details', 'finance_company', e.target.value)} />
                    </div>
                    <div/>
                     <div className="space-y-2">
                        <Label htmlFor="down_payment">Down Payment (฿)</Label>
                        <Input id="down_payment" type="number" value={formData.sale_details.down_payment} onChange={e => handleChange('sale_details', 'down_payment', parseFloat(e.target.value) || 0)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="loan_amount">Loan Amount (฿)</Label>
                        <Input id="loan_amount" type="number" value={formData.sale_details.loan_amount} readOnly className="bg-background"/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="loan_tenure">Loan Tenure (Months)</Label>
                        <Input id="loan_tenure" type="number" value={formData.sale_details.loan_tenure} onChange={e => handleChange('sale_details', 'loan_tenure', parseInt(e.target.value) || 0)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="monthly_emi">Monthly EMI (฿)</Label>
                        <Input id="monthly_emi" type="number" value={formData.sale_details.monthly_emi} onChange={e => handleChange('sale_details', 'monthly_emi', parseFloat(e.target.value) || 0)} />
                    </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="freelancerName">Freelancer Name</Label>
              <Input id="freelancerName" value={formData.freelancer_commission.name} onChange={e => handleChange('freelancer_commission', 'name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission">Commission (฿)</Label>
              <Input id="commission" type="number" value={formData.freelancer_commission.commission} onChange={e => handleChange('freelancer_commission', 'commission', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="freelancerAddress">Freelancer Address</Label>
              <Textarea id="freelancerAddress" value={formData.freelancer_commission.address} onChange={e => handleChange('freelancer_commission', 'address', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="freelancerIdProof">Upload Freelancer ID Proof</Label>
              <FileUpload name="freelancerIdProof" file={formData.freelancer_commission.id_proof} onFileChange={(e) => handleFileChange(e, 'freelancer_commission', 'id_proof')} onRemove={() => removeImage('freelancer_commission', 'id_proof')} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-2">
            <Label htmlFor="documents">Upload Sales Contract & Other Documents</Label>
            <FileUpload name="documents" files={formData.documents} onFileChange={(e) => handleFileChange(e, 'documents', 'documents', true)} onRemove={(index) => removeImage('documents', 'documents', index)} isMultiple />
          </div>
        );
      case 4:
        return <ReviewStep formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full p-1">
      <div className="mb-4">
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-muted-foreground mt-2">
          Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
        </p>
      </div>
      <ScrollArea className="flex-grow pr-4">
        <Card>
            <CardContent className="pt-6">
                {renderContent()}
            </CardContent>
        </Card>
      </ScrollArea>
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>Back</Button>
        {currentStep < steps.length - 1 && <Button onClick={handleNext}>Next</Button>}
        {currentStep === steps.length - 1 && <Button onClick={handleSubmit}>{initialData ? 'Update Sale' : 'Submit Sale'}</Button>}
      </div>
    </div>
  );
}

const ReviewStep = ({ formData }: { formData: Omit<SaleData, 'sale_id'|'vehicle_license'> }) => {
    return (
        <div className="space-y-6">
            <ReviewSection title="Buyer Information">
                <ReviewItem label="Buyer Name" value={formData.buyer.name} />
                <ReviewItem label="Buyer Contact" value={formData.buyer.contact} />
                <ReviewItem label="Buyer Address" value={formData.buyer.address} className="md:col-span-2"/>
                <ReviewItem label="Buyer ID Proof" value={renderFilePreview(formData.buyer.id_proof, "id_proof")} />
            </ReviewSection>

            <ReviewSection title="Sale & Payment">
                <ReviewItem label="Sale Price" value={`฿${formData.sale_details.sale_price.toLocaleString()}`} isBold />
                <ReviewItem label="Sale Date" value={formData.sale_details.sale_date} />
                <ReviewItem label="Payment Method" value={formData.sale_details.payment_method} />
                {formData.sale_details.payment_method === 'Financing' && (
                    <>
                        <ReviewItem label="Finance Company" value={formData.sale_details.finance_company} />
                        <ReviewItem label="Down Payment" value={`฿${(formData.sale_details.down_payment || 0).toLocaleString()}`} />
                        <ReviewItem label="Loan Amount" value={`฿${(formData.sale_details.loan_amount || 0).toLocaleString()}`} />
                        <ReviewItem label="Loan Tenure" value={`${formData.sale_details.loan_tenure || 0} months`} />
                        <ReviewItem label="Monthly EMI" value={`฿${(formData.sale_details.monthly_emi || 0).toLocaleString()}`} />
                    </>
                )}
            </ReviewSection>

            {formData.freelancer_commission && formData.freelancer_commission.name && (
                 <ReviewSection title="Freelancer Commission">
                    <ReviewItem label="Freelancer Name" value={formData.freelancer_commission.name} />
                    <ReviewItem label="Commission" value={`฿${(formData.freelancer_commission.commission || 0).toLocaleString()}`} />
                    <ReviewItem label="Address" value={formData.freelancer_commission.address} className="md:col-span-2"/>
                    <ReviewItem label="ID Proof" value={renderFilePreview(formData.freelancer_commission.id_proof, "freelancer_id")} />
                </ReviewSection>
            )}
            
            <ReviewSection title="Uploaded Documents">
                <div className="md:col-span-2">
                {formData.documents.length > 0 ? formData.documents.map((doc, i) =>
                    <ReviewItem key={i} label={`Document ${i+1}`} value={renderFilePreview(doc, `document_${i+1}`)} />
                ) : <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
                </div>
            </ReviewSection>
        </div>
    );
};
