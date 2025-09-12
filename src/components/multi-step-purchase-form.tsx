

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUpload } from '@/components/ui/file-upload';
import { ReviewSection, ReviewItem, renderFilePreview } from '@/components/shared/review-step';
import brandsData from '../../database/purchase/brand.json';
import modelsData from '../../database/purchase/model.json';
import { Combobox } from '@/components/ui/combobox';

const steps = [
  { id: 1, title: 'Vehicle Information' },
  { id: 2, title: 'Pricing' },
  { id: 3, title: 'Freelancer Commission' },
  { id: 4, title: 'Insurance & Tax' },
  { id: 5, title: 'Seller Information' },
  { id: 6, title: 'Processing & Account Closing' },
  { id: 7, title: 'Vehicle Images' },
  { id: 8, title: 'Review & Submit' },
];

const fuelTypes = [
  { id: 'petrol', label: 'Petrol' },
  { id: 'diesel', label: 'Diesel' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'electric', label: 'Electric' },
  { id: 'cng', label: 'CNG' },
];

type FileWithPreview = File & { preview: string };

type FormData = {
    previousLicensePlate: string;
    brand: string;
    otherBrand: string;
    model: string;
    otherModel: string;
    year: string;
    yearOfPurchase: string;
    mileage: string;
    color: string;
    vin: string;
    engineNumber: string;
    fuelType: string[];
    transmission: string;
    paymentType: string;
    vehiclePrice: number;
    taxFee: number;
    insuranceFee: number;
    deliveryFee: number;
    financingPayoff: number;
    grandTotal: number;
    freelancerName: string;
    freelancerPhone: string;
    freelancerAddress: string;
    commissionType: string;
    commissionValue: number;
    freelancerIdProof: FileWithPreview | null | string;
    insuranceCompany: string;
    insuranceExpiry: string;
    taxExpiry: string;
    insuranceDoc: FileWithPreview | null | string;
    taxDoc: FileWithPreview | null | string;
    sellerName: string;
    sellerPhone: string;
    sellerIdCard: FileWithPreview | null | string;
    status: string;
    mileageBefore: number;
    mileageAfter: number;
    totalDistance: number;
    invoiceDate: string;
    closingDate: string;
    remarks: string;
    mainImage: FileWithPreview | null | string;
    additionalImages: (FileWithPreview | string)[];
};

const initialFormData: FormData = {
    previousLicensePlate: '',
    brand: '',
    otherBrand: '',
    model: '',
    otherModel: '',
    year: '',
    yearOfPurchase: '',
    mileage: '',
    color: '',
    vin: '',
    engineNumber: '',
    fuelType: [],
    transmission: '',
    paymentType: 'Full Payment',
    vehiclePrice: 0,
    taxFee: 0,
    insuranceFee: 0,
    deliveryFee: 0,
    financingPayoff: 0,
    grandTotal: 0,
    freelancerName: '',
    freelancerPhone: '',
    freelancerAddress: '',
    commissionType: 'Fixed',
    commissionValue: 0,
    freelancerIdProof: null,
    insuranceCompany: '',
    insuranceExpiry: '',
    taxExpiry: '',
    insuranceDoc: null,
    taxDoc: null,
    sellerName: '',
    sellerPhone: '',
    sellerIdCard: null,
    status: 'Processing',
    mileageBefore: 0,
    mileageAfter: 0,
    totalDistance: 0,
    invoiceDate: '',
    closingDate: '',
    remarks: '',
    mainImage: null,
    additionalImages: [],
};

interface MultiStepPurchaseFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
    initialData?: any | null;
}

export function MultiStepPurchaseForm({ onSubmit, onCancel, initialData }: MultiStepPurchaseFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({...initialFormData});
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
        setFormData({ ...initialFormData, ...initialData });
    } else {
        setFormData({ ...initialFormData });
    }
  }, [initialData]);


  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSelectChange = (id: string, value: string) => {
    const newFormData = { ...formData, [id]: value };
    if (id === 'brand') {
        newFormData.model = ''; // Reset model when brand changes
        if (value !== 'other') {
          newFormData.otherBrand = '';
        }
    }
    if (id === 'model' && value !== 'other') {
        newFormData.otherModel = '';
    }
    setFormData(newFormData);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  const handleCheckboxChange = (id: string) => {
    setFormData(prev => {
        const newFuelTypes = prev.fuelType.includes(id)
            ? prev.fuelType.filter(item => item !== id)
            : [...prev.fuelType, id];
        return { ...prev, fuelType: newFuelTypes };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof FormData, isMultiple: boolean = false) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (isMultiple) {
          const newFiles = Array.from(files).map(file => Object.assign(file, {
              preview: URL.createObjectURL(file)
          }));
          setFormData(prev => ({ ...prev, [fieldName]: [...(prev[fieldName] as (FileWithPreview | string)[]), ...newFiles] } as FormData));
      } else {
          const file = files[0];
          const fileWithPreview = Object.assign(file, {
              preview: URL.createObjectURL(file)
          });
          setFormData(prev => ({ ...prev, [fieldName]: fileWithPreview } as FormData));
      }
  };

  const removeImage = (fieldName: keyof FormData, index?: number) => {
      if (typeof index === 'number') { // For additionalImages
          const currentImages = formData[fieldName] as (FileWithPreview | string)[];
          const fileToRemove = currentImages[index];
          if(typeof fileToRemove !== 'string' && fileToRemove.preview) URL.revokeObjectURL(fileToRemove.preview);
          const newImages = currentImages.filter((_, i) => i !== index);
          setFormData(prev => ({ ...prev, [fieldName]: newImages }));
      } else { // For single images like mainImage
          const file = formData[fieldName] as FileWithPreview | string | null;
          if(file && typeof file !== 'string' && file.preview) URL.revokeObjectURL(file.preview);
          setFormData(prev => ({ ...prev, [fieldName]: null }));
      }
  };
  
  useMemo(() => {
    const { vehiclePrice, taxFee, insuranceFee, deliveryFee, financingPayoff } = formData;
    const total = vehiclePrice + taxFee + insuranceFee + deliveryFee + (formData.paymentType === 'Financing Pay-off' ? financingPayoff : 0);
    setFormData(prev => ({ ...prev, grandTotal: total }));
  }, [formData.vehiclePrice, formData.taxFee, formData.insuranceFee, formData.deliveryFee, formData.financingPayoff, formData.paymentType]);

  useMemo(() => {
    const distance = formData.mileageAfter - formData.mileageBefore;
    setFormData(prev => ({ ...prev, totalDistance: distance > 0 ? distance : 0 }));
  }, [formData.mileageBefore, formData.mileageAfter]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if(!formData.previousLicensePlate){
        toast({ title: "Validation Error", description: "Previous License Plate is required.", variant: 'destructive' });
        setCurrentStep(0);
        return;
    }
    if(!formData.mainImage){
        toast({ title: "Validation Error", description: "Main Vehicle Image is required.", variant: 'destructive' });
        setCurrentStep(6);
        return;
    }
    
    onSubmit(formData);
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  
  const brandOptions = [
    ...brandsData.map(b => ({ value: b.name, label: b.name })),
    { value: "other", label: "Other" }
  ];

  const modelOptions = useMemo(() => {
    if (!formData.brand || formData.brand === 'other') return [{ value: "other", label: "Other" }];
    const brandId = brandsData.find(b => b.name === formData.brand)?.id;
    if (!brandId) return [{ value: "other", label: "Other" }];
    return [
        ...modelsData.filter(m => m.brand_id === brandId).map(m => ({ value: m.name, label: m.name })),
        { value: "other", label: "Other" }
    ];
  }, [formData.brand]);
  
  const showOtherBrandInput = formData.brand === 'other';
  const showOtherModelInput = formData.brand !== 'other' && formData.model === 'other';

  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="previousLicensePlate">Original License Plate (Vehicle ID) <span className="text-destructive">*</span></Label>
              <Input id="previousLicensePlate" value={formData.previousLicensePlate} onChange={handleChange} required disabled={!!initialData} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Combobox options={brandOptions} value={formData.brand} onChange={(value) => handleSelectChange('brand', value)} placeholder='Select Brand' />
            </div>
             {showOtherBrandInput && <div className="space-y-2"><Label htmlFor="otherBrand">Other Brand Name</Label><Input id="otherBrand" value={formData.otherBrand} onChange={handleChange} placeholder="Enter brand name"/></div>}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Combobox options={modelOptions} value={formData.model} onChange={(value) => handleSelectChange('model', value)} placeholder='Select Model' disabled={!formData.brand && !showOtherBrandInput} />
            </div>
            {(showOtherModelInput || formData.brand === 'other') && <div className="space-y-2"><Label htmlFor="otherModel">Other Model Name</Label><Input id="otherModel" value={formData.otherModel} onChange={handleChange} placeholder="Enter model name"/></div>}
            <div className="space-y-2"><Label htmlFor="year">Year of Manufacture</Label><Input id="year" type="number" value={formData.year} onChange={handleChange} /></div>
            <div className="space-y-2"><Label htmlFor="yearOfPurchase">Year of Purchase</Label><Input id="yearOfPurchase" type="number" value={formData.yearOfPurchase} onChange={handleChange} /></div>
            <div className="space-y-2"><Label htmlFor="mileage">Mileage (km)</Label><Input id="mileage" type="number" value={formData.mileage} onChange={handleChange} /></div>
            <div className="space-y-2"><Label htmlFor="color">Color</Label><Input id="color" value={formData.color} onChange={handleChange} /></div>
            <div className="space-y-2"><Label htmlFor="vin">VIN / Chassis Number</Label><Input id="vin" value={formData.vin} onChange={handleChange} /></div>
            <div className="space-y-2"><Label htmlFor="engineNumber">Engine Number</Label><Input id="engineNumber" value={formData.engineNumber} onChange={handleChange} /></div>
            <div className="space-y-2 md:col-span-2">
                <Label>Fuel Type</Label>
                <div className="flex flex-wrap gap-4 pt-2">
                {fuelTypes.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox id={item.id} checked={formData.fuelType.includes(item.id)} onCheckedChange={() => handleCheckboxChange(item.id)} />
                    <Label htmlFor={item.id} className="font-normal">{item.label}</Label>
                    </div>
                ))}
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transmission">Transmission</Label>
              <Select onValueChange={(value) => handleSelectChange('transmission', value)} value={formData.transmission}>
                <SelectTrigger><SelectValue placeholder="Select Transmission" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Automatic">Automatic</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <Label>Payment Type</Label>
                <RadioGroup value={formData.paymentType} onValueChange={(value) => handleSelectChange('paymentType', value)}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Full Payment" id="full"/><Label htmlFor="full">Full Payment</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Financing Pay-off" id="finance"/><Label htmlFor="finance">Financing Pay-off</Label></div>
                </RadioGroup>
                
                {formData.paymentType === 'Financing Pay-off' && (
                    <div className="space-y-2 pt-4">
                        <Label htmlFor="financingPayoff">Financing Payoff (฿)</Label>
                        <Input id="financingPayoff" type="number" value={formData.financingPayoff} onChange={handleNumberChange} />
                    </div>
                )}
            </div>
            <div className="space-y-4 rounded-lg bg-gray-50 p-4 border dark:bg-gray-900/50">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Label htmlFor="vehiclePrice">Vehicle Price (฿)</Label><Input id="vehiclePrice" type="number" className="text-right" value={formData.vehiclePrice} onChange={handleNumberChange} />
                    <Label htmlFor="taxFee">Tax Fee (฿)</Label><Input id="taxFee" type="number" className="text-right" value={formData.taxFee} onChange={handleNumberChange} />
                    <Label htmlFor="insuranceFee">Insurance Fee (฿)</Label><Input id="insuranceFee" type="number" className="text-right" value={formData.insuranceFee} onChange={handleNumberChange} />
                    <Label htmlFor="deliveryFee">Delivery/Service Fee (฿)</Label><Input id="deliveryFee" type="number" className="text-right" value={formData.deliveryFee} onChange={handleNumberChange} />
                </div>
                <hr/>
                <div className="flex justify-between items-center font-bold text-lg">
                    <span>Grand Total</span>
                    <span>฿{formData.grandTotal.toLocaleString()}</span>
                </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="freelancerName">Freelancer Name</Label><Input id="freelancerName" value={formData.freelancerName} onChange={handleChange} /></div>
            <div className="space-y-2"><Label htmlFor="freelancerPhone">Phone Number</Label><Input id="freelancerPhone" type="tel" value={formData.freelancerPhone} onChange={handleChange} /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="freelancerAddress">Address</Label><Input id="freelancerAddress" value={formData.freelancerAddress} onChange={handleChange} /></div>
            <div className="space-y-2">
              <Label>Commission Type</Label>
              <RadioGroup value={formData.commissionType} onValueChange={(value) => handleSelectChange('commissionType', value)} className="flex gap-4 pt-2">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Fixed" id="fixed"/><Label htmlFor="fixed">Fixed</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Percentage" id="percentage"/><Label htmlFor="percentage">Percentage</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
                <Label htmlFor="commissionValue">Commission Value ({formData.commissionType === 'Fixed' ? '฿' : '%'})</Label>
                <Input id="commissionValue" type="number" value={formData.commissionValue} onChange={handleNumberChange} />
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="freelancerIdProof">Upload Freelancer ID Proof</Label>
                 <FileUpload name="freelancerIdProof" file={formData.freelancerIdProof} onFileChange={(e) => handleFileChange(e, 'freelancerIdProof')} onRemove={() => removeImage('freelancerIdProof')} />
            </div>
          </div>
        );
      case 3:
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="insuranceCompany">Insurance Company</Label><Input id="insuranceCompany" value={formData.insuranceCompany} onChange={handleChange} /></div>
                <div className="space-y-2"><Label htmlFor="insuranceExpiry">Insurance Expiry Date</Label><Input id="insuranceExpiry" type="date" value={formData.insuranceExpiry} onChange={handleChange} /></div>
                <div className="space-y-2"><Label htmlFor="taxExpiry">Tax Expiry Date</Label><Input id="taxExpiry" type="date" value={formData.taxExpiry} onChange={handleChange} /></div>
                <div/>
                <div className="space-y-2">
                    <Label htmlFor="insuranceDoc">Upload Insurance Document</Label>
                    <FileUpload name="insuranceDoc" file={formData.insuranceDoc} onFileChange={(e) => handleFileChange(e, 'insuranceDoc')} onRemove={() => removeImage('insuranceDoc')} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="taxDoc">Upload Tax Document</Label>
                    <FileUpload name="taxDoc" file={formData.taxDoc} onFileChange={(e) => handleFileChange(e, 'taxDoc')} onRemove={() => removeImage('taxDoc')} />
                </div>
            </div>
        );
      case 4:
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="sellerName">Seller Name</Label><Input id="sellerName" value={formData.sellerName} onChange={handleChange} /></div>
                <div className="space-y-2"><Label htmlFor="sellerPhone">Seller Phone Number</Label><Input id="sellerPhone" type="tel" value={formData.sellerPhone} onChange={handleChange} /></div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="sellerIdCard">Upload Seller ID Card</Label>
                    <FileUpload name="sellerIdCard" file={formData.sellerIdCard} onFileChange={(e) => handleFileChange(e, 'sellerIdCard')} onRemove={() => removeImage('sellerIdCard')} />
                </div>
            </div>
        );
      case 5:
        return (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select onValueChange={(value) => handleSelectChange('status', value)} value={formData.status}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Processing">Processing</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Sold">Sold</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div />
                <div className="space-y-2"><Label htmlFor="mileageBefore">Mileage Before Trip</Label><Input id="mileageBefore" type="number" value={formData.mileageBefore} onChange={handleNumberChange}/></div>
                <div className="space-y-2"><Label htmlFor="mileageAfter">Mileage After Trip</Label><Input id="mileageAfter" type="number" value={formData.mileageAfter} onChange={handleNumberChange}/></div>
                <div className="space-y-2"><Label>Total Distance (km)</Label><Input value={formData.totalDistance} readOnly className="font-bold bg-gray-100 dark:bg-gray-800" /></div>
                <div/>
                <div className="space-y-2"><Label htmlFor="invoiceDate">Invoice Date</Label><Input id="invoiceDate" type="date" value={formData.invoiceDate} onChange={handleChange}/></div>
                <div className="space-y-2"><Label htmlFor="closingDate">Closing Date</Label><Input id="closingDate" type="date" value={formData.closingDate} onChange={handleChange}/></div>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="remarks">Remarks</Label><Textarea id="remarks" value={formData.remarks} onChange={handleChange} /></div>
            </div>
        );
      case 6:
        return (
            <div>
                 <div className="space-y-2 mb-4">
                    <Label>Main Vehicle Image <span className="text-destructive">*</span></Label>
                    <FileUpload name="mainImage" file={formData.mainImage} onFileChange={(e) => handleFileChange(e, 'mainImage')} onRemove={() => removeImage('mainImage')} accept="image/*" />
                 </div>
                 <div className="space-y-2">
                    <Label>Additional Images</Label>
                    <FileUpload name="additionalImages" files={formData.additionalImages} onFileChange={(e) => handleFileChange(e, 'additionalImages', true)} onRemove={(index) => removeImage('additionalImages', index)} isMultiple accept="image/*" />
                 </div>
            </div>
        );
      case 7:
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
        {currentStep === steps.length - 1 && <Button onClick={handleSubmit}>{initialData ? 'Update Purchase' : 'Submit Purchase'}</Button>}
      </div>
    </div>
  );
}

const ReviewStep = ({ formData }: { formData: FormData }) => {
    return (
        <div className="space-y-6">
            <ReviewSection title="Vehicle Information">
                <ReviewItem label="Original License Plate" value={formData.previousLicensePlate} />
                <ReviewItem label="Brand" value={formData.otherBrand || formData.brand} />
                <ReviewItem label="Model" value={formData.otherModel || formData.model} />
                <ReviewItem label="Year of Manufacture" value={formData.year} />
                <ReviewItem label="Year of Purchase" value={formData.yearOfPurchase} />
                <ReviewItem label="Mileage" value={`${formData.mileage} km`} />
                <ReviewItem label="Color" value={formData.color} />
                <ReviewItem label="VIN / Chassis" value={formData.vin} />
                <ReviewItem label="Engine Number" value={formData.engineNumber} />
                <ReviewItem label="Fuel Type(s)" value={formData.fuelType.join(', ')} />
                <ReviewItem label="Transmission" value={formData.transmission} />
            </ReviewSection>

            <ReviewSection title="Pricing">
                <ReviewItem label="Payment Type" value={formData.paymentType} />
                <ReviewItem label="Vehicle Price" value={`฿${formData.vehiclePrice.toLocaleString()}`} />
                <ReviewItem label="Tax Fee" value={`฿${formData.taxFee.toLocaleString()}`} />
                <ReviewItem label="Insurance Fee" value={`฿${formData.insuranceFee.toLocaleString()}`} />
                <ReviewItem label="Delivery/Service Fee" value={`฿${formData.deliveryFee.toLocaleString()}`} />
                {formData.paymentType === 'Financing Pay-off' && <ReviewItem label="Financing Payoff" value={`฿${formData.financingPayoff.toLocaleString()}`} />}
                <ReviewItem label="Grand Total" value={`฿${formData.grandTotal.toLocaleString()}`} isBold />
            </ReviewSection>

            <ReviewSection title="Freelancer Commission">
                <ReviewItem label="Freelancer Name" value={formData.freelancerName} />
                <ReviewItem label="Phone" value={formData.freelancerPhone} />
                <ReviewItem label="Address" value={formData.freelancerAddress} />
                <ReviewItem label="Commission Type" value={formData.commissionType} />
                <ReviewItem label="Commission Value" value={`${formData.commissionType === 'Fixed' ? '฿' : ''}${formData.commissionValue.toLocaleString()}${formData.commissionType === 'Percentage' ? '%' : ''}`} />
                <ReviewItem label="ID Proof" value={renderFilePreview(formData.freelancerIdProof, "freelancer_id.pdf")} />
            </ReviewSection>

            <ReviewSection title="Insurance & Tax">
                 <ReviewItem label="Insurance Company" value={formData.insuranceCompany} />
                 <ReviewItem label="Insurance Expiry" value={formData.insuranceExpiry} />
                 <ReviewItem label="Tax Expiry" value={formData.taxExpiry} />
                 <ReviewItem label="Insurance Document" value={renderFilePreview(formData.insuranceDoc, 'insurance_doc')} />
                 <ReviewItem label="Tax Document" value={renderFilePreview(formData.taxDoc, 'tax_doc')} />
            </ReviewSection>
            
            <ReviewSection title="Seller Information">
                 <ReviewItem label="Seller Name" value={formData.sellerName} />
                 <ReviewItem label="Seller Phone" value={formData.sellerPhone} />
                 <ReviewItem label="Seller ID Card" value={renderFilePreview(formData.sellerIdCard, "seller_id.pdf")} />
            </ReviewSection>

            <ReviewSection title="Processing & Account Closing">
                <ReviewItem label="Status" value={formData.status} />
                <ReviewItem label="Mileage Before Trip" value={`${formData.mileageBefore} km`} />
                <ReviewItem label="Mileage After Trip" value={`${formData.mileageAfter} km`} />
                <ReviewItem label="Total Distance" value={`${formData.totalDistance} km`} />
                <ReviewItem label="Invoice Date" value={formData.invoiceDate} />
                <ReviewItem label="Closing Date" value={formData.closingDate} />
                <ReviewItem label="Remarks" value={formData.remarks} />
            </ReviewSection>

            <ReviewSection title="Vehicle Images">
                <div>
                    <h4 className="font-medium text-sm mb-2">Main Image</h4>
                    {renderFilePreview(formData.mainImage, "main_image.jpg")}
                </div>
                 <div>
                    <h4 className="font-medium text-sm mt-4 mb-2">Additional Images</h4>
                    <div className="flex flex-wrap gap-2">
                    {formData.additionalImages.length > 0 ? formData.additionalImages.map((file, index) => (
                        <div key={index}>{renderFilePreview(file, `additional_${index+1}.jpg`)}</div>
                    )) : <p className="text-sm text-muted-foreground">None provided</p>}
                    </div>
                </div>
            </ReviewSection>
        </div>
    );
};
