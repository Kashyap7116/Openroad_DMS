"use client";

import type { EmployeeRecord } from "@/app/(dashboard)/hr/employees/page";
import { useToast } from "@/hooks/use-toast";
import {
  formatValidationErrors,
  validateEmployeeForm,
} from "@/lib/validation-schemas";
import { Button } from "@/modules/shared/components/ui/ui/button";
import { FileUpload } from "@/modules/shared/components/ui/ui/file-upload";
import { Input } from "@/modules/shared/components/ui/ui/input";
import { Label } from "@/modules/shared/components/ui/ui/label";
import { ScrollArea } from "@/modules/shared/components/ui/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/ui/select";
import { Textarea } from "@/modules/shared/components/ui/ui/textarea";
import {
  Briefcase,
  FileUp,
  GraduationCap,
  Heart,
  Loader2,
  UserSquare,
} from "lucide-react";
import React, { useEffect, useState } from "react";

type FileWithPreview = File & { preview: string };
type FormData = EmployeeRecord;

const initialFormData: FormData = {
  employee_id: "",
  personal_info: {
    name: "",
    dob: "",
    nationality: "Thai",
    gender: "Male",
    contact: "",
    address: "",
  },
  job_details: {
    department: "",
    position: "",
    joining_date: "",
    contract_expiry_date: "",
    salary: 0,
    status: "Active",
    grade: 4,
  },
  qualification: {
    education: "",
    skills: "",
  },
  documents: {
    photo: null,
    id_proof: null,
    address_proof: null,
    education_cert: null,
    professional_cert: null,
  },
  emergency_contact: {
    name: "",
    relation: "",
    phone: "",
  },
  experience: {
    previous_jobs: "",
    years: 0,
  },
};

interface EmployeeFormProps {
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  initialData?: EmployeeRecord | null;
  countries: { name: string; code: string }[];
}

const FormSection = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <div className="space-y-4 rounded-lg border p-4">
    <h3 className="text-lg font-semibold flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      {title}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

export function EmployeeForm({
  onSubmit,
  onCancel,
  initialData,
  countries,
}: EmployeeFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      // Ensure all document fields exist
      const initialDocs = initialData.documents || {};
      const completeDocs = {
        photo: initialDocs.photo || null,
        id_proof: initialDocs.id_proof || null,
        address_proof: initialDocs.address_proof || null,
        education_cert: initialDocs.education_cert || null,
        professional_cert: initialDocs.professional_cert || null,
      };
      setFormData({ ...initialData, documents: completeDocs });
    } else {
      setFormData(initialFormData);
    }
  }, [initialData]);

  const handleChange = (section: keyof FormData, field: string, value: any) => {
    setFormData((prev) => {
      const newSectionData = { ...(prev[section] as object), [field]: value };
      return { ...prev, [section]: newSectionData };
    });
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: keyof FormData["documents"]
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(file),
    });
    handleChange("documents", fieldName, fileWithPreview);
  };

  const removeFile = (fieldName: keyof FormData["documents"]) => {
    const file = formData.documents[fieldName] as FileWithPreview | null;
    if (file && typeof file !== "string") URL.revokeObjectURL(file.preview);
    handleChange("documents", fieldName, null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data using Zod schema
    const validationResult = validateEmployeeForm(formData);

    if (!validationResult.success) {
      const errorMessages = formatValidationErrors(validationResult.error);
      toast({
        title: "Validation Error",
        description: `Please fix the following errors: ${errorMessages
          .map((err) => err.message)
          .join(", ")}`,
        variant: "destructive",
      });

      // Log detailed errors for debugging
      console.error("Form validation errors:", errorMessages);
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      <ScrollArea className="flex-grow pr-4 -mx-4 px-4">
        <div className="space-y-6 py-4">
          <FormSection title="Personal Information" icon={UserSquare}>
            <div className="md:col-span-2">
              <Label htmlFor="name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.personal_info.name}
                onChange={(e) =>
                  handleChange("personal_info", "name", e.target.value)
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.personal_info.dob}
                onChange={(e) =>
                  handleChange("personal_info", "dob", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.personal_info.gender}
                onValueChange={(v) =>
                  handleChange("personal_info", "gender", v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nationality">Nationality</Label>
              {countries.length === 0 ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Select
                  value={formData.personal_info.nationality}
                  onValueChange={(v) =>
                    handleChange("personal_info", "nationality", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                value={formData.personal_info.contact}
                onChange={(e) =>
                  handleChange("personal_info", "contact", e.target.value)
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.personal_info.address}
                onChange={(e) =>
                  handleChange("personal_info", "address", e.target.value)
                }
              />
            </div>
          </FormSection>

          <FormSection title="Job Details" icon={Briefcase}>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.job_details.department}
                onChange={(e) =>
                  handleChange("job_details", "department", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="position">
                Position <span className="text-destructive">*</span>
              </Label>
              <Input
                id="position"
                value={formData.job_details.position}
                onChange={(e) =>
                  handleChange("job_details", "position", e.target.value)
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="joining_date">Joining Date</Label>
              <Input
                id="joining_date"
                type="date"
                value={formData.job_details.joining_date}
                onChange={(e) =>
                  handleChange("job_details", "joining_date", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="contract_expiry_date">Contract Expiry Date</Label>
              <Input
                id="contract_expiry_date"
                type="date"
                value={formData.job_details.contract_expiry_date || ""}
                onChange={(e) =>
                  handleChange(
                    "job_details",
                    "contract_expiry_date",
                    e.target.value
                  )
                }
              />
            </div>
            <div>
              <Label htmlFor="salary">Salary (฿)</Label>
              <Input
                id="salary"
                type="number"
                value={formData.job_details.salary}
                onChange={(e) =>
                  handleChange(
                    "job_details",
                    "salary",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.job_details.status}
                onValueChange={(v) => handleChange("job_details", "status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Left">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormSection>

          <FormSection title="Emergency Contact" icon={Heart}>
            <div>
              <Label htmlFor="ec_name">Contact Name</Label>
              <Input
                id="ec_name"
                value={formData.emergency_contact.name}
                onChange={(e) =>
                  handleChange("emergency_contact", "name", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="ec_relation">Relation</Label>
              <Input
                id="ec_relation"
                value={formData.emergency_contact.relation}
                onChange={(e) =>
                  handleChange("emergency_contact", "relation", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="ec_phone">Phone Number</Label>
              <Input
                id="ec_phone"
                value={formData.emergency_contact.phone}
                onChange={(e) =>
                  handleChange("emergency_contact", "phone", e.target.value)
                }
              />
            </div>
          </FormSection>

          <FormSection title="Qualifications & Experience" icon={GraduationCap}>
            <div className="md:col-span-2">
              <Label htmlFor="education">Education</Label>
              <Input
                id="education"
                value={formData.qualification.education}
                onChange={(e) =>
                  handleChange("qualification", "education", e.target.value)
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                value={formData.qualification.skills}
                onChange={(e) =>
                  handleChange("qualification", "skills", e.target.value)
                }
                placeholder="e.g. Sales, English, Driving"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="prev_jobs">Previous Jobs</Label>
              <Textarea
                id="prev_jobs"
                value={formData.experience.previous_jobs}
                onChange={(e) =>
                  handleChange("experience", "previous_jobs", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="years_exp">Years of Experience</Label>
              <Input
                id="years_exp"
                type="number"
                value={formData.experience.years}
                onChange={(e) =>
                  handleChange(
                    "experience",
                    "years",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
          </FormSection>

          <FormSection title="Document Uploads" icon={FileUp}>
            <div>
              <Label htmlFor="photo">Photo</Label>
              <FileUpload
                name="photo"
                file={formData.documents.photo}
                onFileChange={(e) => handleFileChange(e, "photo")}
                onRemove={() => removeFile("photo")}
                accept="image/*"
              />
            </div>
            <div>
              <Label htmlFor="id_proof">ID Proof</Label>
              <FileUpload
                name="id_proof"
                file={formData.documents.id_proof}
                onFileChange={(e) => handleFileChange(e, "id_proof")}
                onRemove={() => removeFile("id_proof")}
              />
            </div>
            <div>
              <Label htmlFor="address_proof">Address Proof</Label>
              <FileUpload
                name="address_proof"
                file={formData.documents.address_proof}
                onFileChange={(e) => handleFileChange(e, "address_proof")}
                onRemove={() => removeFile("address_proof")}
              />
            </div>
            <div>
              <Label htmlFor="education_cert">Education Certificate</Label>
              <FileUpload
                name="education_cert"
                file={formData.documents.education_cert}
                onFileChange={(e) => handleFileChange(e, "education_cert")}
                onRemove={() => removeFile("education_cert")}
              />
            </div>
            <div>
              <Label htmlFor="professional_cert">
                Professional Certificate
              </Label>
              <FileUpload
                name="professional_cert"
                file={formData.documents.professional_cert}
                onFileChange={(e) => handleFileChange(e, "professional_cert")}
                onRemove={() => removeFile("professional_cert")}
              />
            </div>
          </FormSection>
        </div>
      </ScrollArea>
      <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? "Save Changes" : "Add Employee"}
        </Button>
      </div>
    </form>
  );
}
