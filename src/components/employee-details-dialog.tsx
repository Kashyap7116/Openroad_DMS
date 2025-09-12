
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { FileText, UserSquare, Briefcase, Heart, BookOpen, GraduationCap, Star, FileUp, Phone, Download, Mail, MapPin, Building, Banknote, CalendarDays, User } from "lucide-react";
import type { EmployeeRecord } from '@/app/(dashboard)/hr/employees/page';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Card } from "./ui/card";


interface EmployeeDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  record: EmployeeRecord | null;
}

const DetailItem = ({ label, value, icon: Icon, className }: { label: string; value?: string | number | React.ReactNode, icon?: React.ElementType, className?: string }) => (
    <div className={cn("flex items-start gap-3", className)}>
        {Icon && <Icon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />}
        <div className="flex flex-col overflow-hidden">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="text-sm font-medium break-words">{value || '-'}</div>
        </div>
    </div>
);

const DetailSection = ({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) => (
    <div className={cn("bg-card border rounded-lg p-4", className)}>
        <h3 className="text-base font-semibold mb-4 text-primary">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
        </div>
    </div>
);

const renderFilePreview = (fileUrl: any, name: string) => {
    if (!fileUrl || typeof fileUrl !== 'string') {
        return <p className="text-sm text-muted-foreground"><span className="lang-en">Not provided</span><span className="lang-th">ไม่ได้ให้ไว้</span></p>;
    }
    
    const fileName = fileUrl.split('/').pop() || name;
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(fileName);

    return (
        <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all" title={fileName}>
                {fileName}
            </a>
            {isImage && <Image src={fileUrl} alt="preview" width={32} height={32} className="rounded-md object-cover flex-shrink-0" />}
        </div>
    );
};


export function EmployeeDetailsDialog({ isOpen, onClose, record }: EmployeeDetailsDialogProps) {
  if (!record) return null;

  const photoUrl = record.documents.photo;
  
  const handleDownloadPdf = () => {
    const content = document.getElementById('employee-details-content');
    if (content) {
      html2canvas(content, { 
          scale: 2, 
          useCORS: true,
          onclone: (doc) => {
              const clonedContent = doc.getElementById('employee-details-content');
              if (clonedContent) {
                  clonedContent.style.fontFamily = 'Poppins, sans-serif';
                  clonedContent.style.backgroundColor = 'white';
                  clonedContent.querySelectorAll('*').forEach((el: any) => {
                      el.style.color = '#111827';
                      el.style.wordWrap = 'break-word';
                      el.style.overflowWrap = 'break-word';
                  });
                   clonedContent.querySelectorAll('.bg-card').forEach((el: any) => {
                      el.style.backgroundColor = '#f9fafb';
                      el.style.border = '1px solid #e5e7eb';
                   });
                   clonedContent.querySelectorAll('.text-primary').forEach((el: any) => el.style.color = '#2563eb');
                   clonedContent.querySelectorAll('.text-muted-foreground').forEach((el: any) => el.style.color = '#6b7280');
              }
          }
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        let pdfImgWidth = pdfWidth - 40; // 20pt margin on each side
        let pdfImgHeight = pdfImgWidth / ratio;

        if (pdfImgHeight > pdfHeight - 40) {
            pdfImgHeight = pdfHeight - 40;
            pdfImgWidth = pdfImgHeight * ratio;
        }
        
        pdf.addImage(imgData, 'PNG', 20, 20, pdfImgWidth, pdfImgHeight);
        pdf.save(`Employee_Profile_${record.personal_info.name}.pdf`);
      });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Employee Profile</DialogTitle>
          <DialogDescription>
            A comprehensive overview of the employee's record.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 -mx-6 px-6 bg-muted/30">
             <div className="space-y-4 py-4" id="employee-details-content">
                <Card className="p-4 bg-card">
                   <div className="flex flex-col sm:flex-row items-center gap-6">
                        <Avatar className="h-28 w-28 border-4 border-primary/20 flex-shrink-0">
                          <AvatarImage src={photoUrl || ''} alt={record.personal_info.name} />
                          <AvatarFallback className="text-4xl">{record.personal_info.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow text-center sm:text-left">
                            <h2 className="text-2xl font-bold">{record.personal_info.name}</h2>
                            <p className="text-primary">{record.job_details.position}</p>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5"/> {record.employee_id}</span>
                                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5"/> {record.personal_info.contact}</span>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                             <Badge variant="outline" className={cn("text-base px-4 py-1",
                                record.job_details.status === 'Active' ? 'text-green-700 border-green-300 bg-green-50' : 
                                record.job_details.status === 'Left' ? 'text-red-700 border-red-300 bg-red-50' :
                                'text-yellow-700 border-yellow-300 bg-yellow-50'
                            )}>{record.job_details.status}</Badge>
                        </div>
                    </div>
                </Card>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-4">
                       <DetailSection title="Job & Salary Information">
                            <DetailItem icon={Building} label="Department" value={record.job_details.department} />
                            <DetailItem icon={Briefcase} label="Position" value={record.job_details.position} />
                            <DetailItem icon={CalendarDays} label="Joining Date" value={record.job_details.joining_date} />
                            <DetailItem icon={Banknote} label="Salary" value={`฿${record.job_details.salary.toLocaleString()}`} />
                        </DetailSection>
                         <DetailSection title="Qualifications & Experience">
                            <DetailItem icon={GraduationCap} label="Education" value={record.qualification.education} />
                            <DetailItem icon={Star} label="Skills" value={record.qualification.skills} />
                            <DetailItem icon={Briefcase} label="Previous Jobs" value={record.experience.previous_jobs} className="md:col-span-2"/>
                            <DetailItem icon={CalendarDays} label="Years of Experience" value={`${record.experience.years} years`} />
                        </DetailSection>
                         <DetailSection title="Uploaded Documents" className="md:col-span-2">
                            <DetailItem label="ID Proof" value={renderFilePreview(record.documents.id_proof, 'id_proof.jpg')} />
                            <DetailItem label="Education Certificate" value={renderFilePreview(record.documents.education_cert, 'education_cert.pdf')} />
                            <DetailItem label="Professional Certificate" value={renderFilePreview(record.documents.professional_cert, 'professional_cert.pdf')} />
                            <DetailItem label="Address Proof" value={renderFilePreview(record.documents.address_proof, 'address_proof.pdf')} />
                        </DetailSection>
                    </div>
                    <div className="space-y-4">
                        <DetailSection title="Personal Information">
                           <DetailItem icon={UserSquare} label="Nationality" value={record.personal_info.nationality} />
                           <DetailItem icon={CalendarDays} label="Date of Birth" value={record.personal_info.dob} />
                           <DetailItem icon={User} label="Gender" value={record.personal_info.gender} />
                           <DetailItem icon={MapPin} label="Address" value={record.personal_info.address} className="md:col-span-2"/>
                        </DetailSection>
                        <DetailSection title="Emergency Contact">
                            <DetailItem icon={User} label="Contact Name" value={record.emergency_contact.name} />
                            <DetailItem icon={Heart} label="Relation" value={record.emergency_contact.relation} />
                            <DetailItem icon={Phone} label="Phone Number" value={record.emergency_contact.phone} />
                        </DetailSection>
                    </div>
                </div>
            </div>
        </ScrollArea>
         <DialogFooter className="border-t pt-4 bg-background">
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
