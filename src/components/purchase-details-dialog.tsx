"use client";

import type { VehicleRecord } from "@/app/(dashboard)/purchase/page";
import {
  ReviewItem,
  ReviewSection,
  renderFilePreview,
} from "@/modules/shared/components/ui/review-step";
import { Badge } from "@/modules/shared/components/ui/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/modules/shared/components/ui/ui/dialog";
import { ScrollArea } from "@/modules/shared/components/ui/ui/scroll-area";
import { cn } from "@/modules/shared/utils/utils";
import Image from "next/image";

interface PurchaseDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  record: VehicleRecord | null;
}

export function PurchaseDetailsDialog({
  isOpen,
  onClose,
  record,
}: PurchaseDetailsDialogProps) {
  if (!record || !record.fullData) return null;

  const formData = record.fullData;
  const originalLicensePlate = record.id;
  const newLicensePlate = record.license_plate;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Purchase Details: {record.vehicle}</DialogTitle>
          <DialogDescription>
            Viewing record for License Plate {record.license_plate}.
            <Badge
              variant="outline"
              className={cn(
                "ml-2",
                record.status === "Completed"
                  ? "text-green-700 border-green-300 bg-green-50"
                  : record.status === "Processing"
                  ? "text-yellow-700 border-yellow-300 bg-yellow-50"
                  : record.status === "Sold"
                  ? "text-blue-700 border-blue-300 bg-blue-50"
                  : ""
              )}
            >
              {record.status}
            </Badge>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4">
          <div className="space-y-6 py-4">
            <ReviewSection title="Vehicle Information">
              <ReviewItem label="Purchase ID" value={record.id} />
              <ReviewItem
                label="Original License Plate"
                value={originalLicensePlate}
              />
              {newLicensePlate && newLicensePlate !== originalLicensePlate && (
                <ReviewItem
                  label="Current License Plate"
                  value={newLicensePlate}
                  isBold
                />
              )}
              <ReviewItem
                label="Brand"
                value={formData.otherBrand || formData.brand}
              />
              <ReviewItem
                label="Model"
                value={formData.otherModel || formData.model}
              />
              <ReviewItem label="Year" value={formData.year} />
              <ReviewItem label="Mileage" value={`${formData.mileage} km`} />
              <ReviewItem label="Color" value={formData.color} />
              <ReviewItem label="VIN / Chassis" value={formData.vin} />
              <ReviewItem label="Engine Number" value={formData.engineNumber} />
              <ReviewItem
                label="Fuel Type(s)"
                value={formData.fuelType.join(", ")}
              />
              <ReviewItem label="Transmission" value={formData.transmission} />
            </ReviewSection>

            <ReviewSection title="Pricing">
              <ReviewItem label="Payment Type" value={formData.paymentType} />
              <ReviewItem
                label="Vehicle Price"
                value={`฿${(formData.vehiclePrice || 0).toLocaleString()}`}
              />
              <ReviewItem
                label="Tax Fee"
                value={`฿${(formData.taxFee || 0).toLocaleString()}`}
              />
              <ReviewItem
                label="Insurance Fee"
                value={`฿${(formData.insuranceFee || 0).toLocaleString()}`}
              />
              <ReviewItem
                label="Delivery/Service Fee"
                value={`฿${(formData.deliveryFee || 0).toLocaleString()}`}
              />
              {formData.paymentType === "Financing Pay-off" && (
                <ReviewItem
                  label="Financing Payoff"
                  value={`฿${(formData.financingPayoff || 0).toLocaleString()}`}
                />
              )}
              <ReviewItem
                label="Grand Total"
                value={`฿${(formData.grandTotal || 0).toLocaleString()}`}
                isBold
              />
            </ReviewSection>

            <ReviewSection title="Freelancer Commission">
              <ReviewItem
                label="Freelancer Name"
                value={formData.freelancerName}
              />
              <ReviewItem label="Phone" value={formData.freelancerPhone} />
              <ReviewItem label="Address" value={formData.freelancerAddress} />
              <ReviewItem
                label="Commission Type"
                value={formData.commissionType}
              />
              <ReviewItem
                label="Commission Value"
                value={`${formData.commissionType === "Fixed" ? "฿" : ""}${(
                  formData.commissionValue || 0
                ).toLocaleString()}${
                  formData.commissionType === "Percentage" ? "%" : ""
                }`}
              />
              <ReviewItem
                label="ID Proof"
                value={renderFilePreview(
                  formData.freelancerIdProof,
                  "freelancer_id"
                )}
              />
            </ReviewSection>

            <ReviewSection title="Insurance & Tax">
              <ReviewItem
                label="Insurance Company"
                value={formData.insuranceCompany}
              />
              <ReviewItem
                label="Insurance Expiry"
                value={formData.insuranceExpiry}
              />
              <ReviewItem label="Tax Expiry" value={formData.taxExpiry} />
              <ReviewItem
                label="Insurance Document"
                value={renderFilePreview(
                  formData.insuranceDoc,
                  "insurance_doc.pdf"
                )}
              />
              <ReviewItem
                label="Tax Document"
                value={renderFilePreview(formData.taxDoc, "tax_doc.pdf")}
              />
            </ReviewSection>

            <ReviewSection title="Seller Information">
              <ReviewItem label="Seller Name" value={formData.sellerName} />
              <ReviewItem label="Seller Phone" value={formData.sellerPhone} />
              <ReviewItem
                label="Seller ID Card"
                value={renderFilePreview(formData.sellerIdCard, "seller_id")}
              />
            </ReviewSection>

            <ReviewSection title="Processing & Account Closing">
              <ReviewItem
                label="Mileage Before Trip"
                value={`${formData.mileageBefore} km`}
              />
              <ReviewItem
                label="Mileage After Trip"
                value={`${formData.mileageAfter} km`}
              />
              <ReviewItem
                label="Total Distance"
                value={`${formData.totalDistance} km`}
              />
              <ReviewItem label="Invoice Date" value={formData.invoiceDate} />
              <ReviewItem label="Closing Date" value={formData.closingDate} />
              <ReviewItem label="Remarks" value={formData.remarks} />
            </ReviewSection>

            <ReviewSection title="Vehicle Images">
              <div>
                <h4 className="font-medium text-sm mb-2">Main Image</h4>
                {formData.mainImage ? (
                  <Image
                    src={
                      typeof formData.mainImage === "string"
                        ? formData.mainImage
                        : formData.mainImage.preview
                    }
                    alt="Main Vehicle"
                    width={150}
                    height={100}
                    className="rounded-md object-cover"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided</p>
                )}
              </div>
              <div>
                <h4 className="font-medium text-sm mt-4 mb-2">
                  Additional Images
                </h4>
                <div className="flex flex-wrap gap-2">
                  {formData.additionalImages &&
                  formData.additionalImages.length > 0 ? (
                    formData.additionalImages.map(
                      (file: any, index: number) => (
                        <Image
                          key={index}
                          src={typeof file === "string" ? file : file.preview}
                          alt={`Additional ${index + 1}`}
                          width={100}
                          height={75}
                          className="rounded-md object-cover"
                        />
                      )
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      None provided
                    </p>
                  )}
                </div>
              </div>
            </ReviewSection>

            {record.bonus_history && record.bonus_history.length > 0 && (
              <ReviewSection title="Employee Bonuses">
                {record.bonus_history.map((bonus: any, index: number) => (
                  <div
                    key={index}
                    className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2 p-2 border-b"
                  >
                    <ReviewItem
                      label="Employee"
                      value={bonus.employee_name || bonus.employee_id}
                    />
                    <ReviewItem label="Date" value={bonus.date} />
                    <ReviewItem label="Amount" value={bonus.amount} isBold />
                    <ReviewItem
                      label="Remarks"
                      value={bonus.remarks}
                      className="md:col-span-3"
                    />
                  </div>
                ))}
              </ReviewSection>
            )}

            {record.licence_history && record.licence_history.length > 0 && (
              <ReviewSection title="Licence History">
                {record.licence_history.map((licence: any, index: number) => (
                  <div
                    key={index}
                    className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3 p-2 border-b"
                  >
                    <ReviewItem
                      label="New Plate"
                      value={licence.newLicensePlate}
                      isBold
                    />
                    <ReviewItem label="Issue Date" value={licence.issueDate} />
                    <ReviewItem
                      label="Authority"
                      value={licence.issuingAuthority}
                    />
                  </div>
                ))}
              </ReviewSection>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
