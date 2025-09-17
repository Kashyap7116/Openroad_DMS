/**
 * Comprehensive Zod validation schemas for all forms in the application
 * Addresses High severity audit finding: Missing form validation
 */

import { z } from "zod";

// Base validation helpers
const optionalString = z.string().optional().or(z.literal(""));
const requiredString = z.string().min(1, "This field is required");
const optionalNumber = z.number().optional().or(z.literal(0));
const requiredNumber = z.number().min(0, "Must be a positive number");
const phoneNumber = z
  .string()
  .regex(/^[\d\-\+\(\)\s]+$/, "Invalid phone number format")
  .optional()
  .or(z.literal(""));
const email = z
  .string()
  .email("Invalid email format")
  .optional()
  .or(z.literal(""));
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// File validation for uploads
const fileSchema = z
  .instanceof(File)
  .optional()
  .or(z.string().optional())
  .or(z.null());

// Employee Form Validation Schemas
export const personalInfoSchema = z.object({
  name: requiredString.min(2, "Name must be at least 2 characters"),
  dob: dateString.optional().or(z.literal("")),
  nationality: requiredString,
  gender: z.enum(["Male", "Female", "Other"]),
  contact: phoneNumber,
  address: optionalString,
});

export const jobDetailsSchema = z.object({
  department: requiredString,
  position: requiredString,
  joining_date: dateString,
  contract_expiry_date: dateString.optional().or(z.literal("")),
  salary: requiredNumber.min(0, "Salary must be positive"),
  status: z.enum(["Active", "Inactive", "Terminated", "On Leave"]),
  grade: z.number().min(1).max(10),
});

export const qualificationSchema = z.object({
  education: optionalString,
  skills: optionalString,
});

export const documentsSchema = z.object({
  photo: fileSchema,
  id_proof: fileSchema,
  address_proof: fileSchema,
  education_cert: fileSchema,
  professional_cert: fileSchema,
});

export const emergencyContactSchema = z.object({
  name: optionalString,
  relation: optionalString,
  phone: phoneNumber,
});

export const experienceSchema = z.object({
  previous_jobs: optionalString,
  years: optionalNumber,
});

export const employeeFormSchema = z.object({
  employee_id: optionalString,
  personal_info: personalInfoSchema,
  job_details: jobDetailsSchema,
  qualification: qualificationSchema,
  documents: documentsSchema,
  emergency_contact: emergencyContactSchema,
  experience: experienceSchema,
});

// Vehicle Purchase Form Validation Schema
export const vehiclePurchaseFormSchema = z.object({
  previousLicensePlate: optionalString,
  brand: requiredString,
  otherBrand: optionalString,
  model: requiredString,
  otherModel: optionalString,
  year: requiredString.regex(/^\d{4}$/, "Year must be 4 digits"),
  yearOfPurchase: requiredString.regex(/^\d{4}$/, "Year must be 4 digits"),
  mileage: z.string().regex(/^\d+$/, "Mileage must be a number"),
  color: requiredString,
  vin: optionalString,
  engineNumber: optionalString,
  fuelType: z.array(z.string()).min(1, "Select at least one fuel type"),
  transmission: z.enum(["Manual", "Automatic", "CVT"]),
  paymentType: z.enum(["Cash", "Financing", "Lease"]),
  vehiclePrice: requiredNumber.min(0, "Vehicle price must be positive"),
  taxFee: optionalNumber,
  insuranceFee: optionalNumber,
  deliveryFee: optionalNumber,
  financingPayoff: optionalNumber,
  grandTotal: requiredNumber.min(0, "Grand total must be positive"),
  freelancerName: optionalString,
  freelancerPhone: phoneNumber,
  freelancerAddress: optionalString,
  commissionType: z.enum(["Fixed", "Percentage", ""]).optional(),
  commissionValue: optionalNumber,
  freelancerIdProof: fileSchema,
  insuranceCompany: optionalString,
  insuranceExpiry: dateString.optional().or(z.literal("")),
  taxExpiry: dateString.optional().or(z.literal("")),
  insuranceDoc: fileSchema,
  taxDoc: fileSchema,
  sellerName: requiredString.min(2, "Seller name is required"),
  sellerPhone: phoneNumber,
  sellerIdCard: fileSchema,
  status: z.enum(["Draft", "Pending", "Completed", "Cancelled"]),
  mileageBefore: optionalNumber,
  mileageAfter: optionalNumber,
  totalDistance: optionalNumber,
  invoiceDate: dateString,
  closingDate: dateString.optional().or(z.literal("")),
  remarks: optionalString,
  mainImage: fileSchema,
  additionalImages: z.array(fileSchema),
});

// Finance Form Validation Schema
export const financeFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: requiredString,
  license_plate: requiredString,
  amount: requiredNumber.min(0.01, "Amount must be greater than 0"),
  date: dateString,
  remarks: optionalString,
  uploaded_file: fileSchema,
});

// Sales Form Validation Schema
export const salesFormSchema = z.object({
  vehicleId: requiredString,
  customerName: requiredString.min(2, "Customer name is required"),
  customerPhone: phoneNumber,
  customerEmail: email,
  customerAddress: optionalString,
  salePrice: requiredNumber.min(0.01, "Sale price must be greater than 0"),
  downPayment: optionalNumber,
  financingAmount: optionalNumber,
  interestRate: z.number().min(0).max(100).optional(),
  loanTerm: z.number().min(1).optional().or(z.literal(0)),
  monthlyPayment: optionalNumber,
  saleDate: dateString,
  deliveryDate: dateString.optional().or(z.literal("")),
  warrantyPeriod: z.number().min(0).optional().or(z.literal(0)),
  tradeInVehicle: optionalString,
  tradeInValue: optionalNumber,
  salesPersonId: requiredString,
  commission: optionalNumber,
  status: z.enum(["Draft", "Pending", "Completed", "Cancelled"]),
  notes: optionalString,
  customerIdProof: fileSchema,
  saleDocuments: z.array(fileSchema).optional(),
});

// Maintenance Form Validation Schema
export const maintenanceFormSchema = z.object({
  vehicleId: requiredString,
  maintenanceType: z.enum([
    "Preventive",
    "Corrective",
    "Emergency",
    "Inspection",
  ]),
  description: requiredString.min(
    5,
    "Description must be at least 5 characters"
  ),
  cost: requiredNumber.min(0, "Cost must be positive"),
  serviceProvider: optionalString,
  serviceDate: dateString,
  nextServiceDate: dateString.optional().or(z.literal("")),
  mileageAtService: z.number().min(0).optional().or(z.literal(0)),
  partsReplaced: optionalString,
  laborCost: optionalNumber,
  partsCost: optionalNumber,
  warrantyInfo: optionalString,
  invoiceNumber: optionalString,
  invoiceDocument: fileSchema,
  beforeImages: z.array(fileSchema).optional(),
  afterImages: z.array(fileSchema).optional(),
  mechanicNotes: optionalString,
  status: z.enum(["Scheduled", "In Progress", "Completed", "Cancelled"]),
});

// Payroll Form Validation Schema
export const payrollFormSchema = z.object({
  employeeId: requiredString,
  payPeriodStart: dateString,
  payPeriodEnd: dateString,
  basicSalary: requiredNumber.min(0, "Basic salary must be positive"),
  overtime: optionalNumber,
  overtimeRate: optionalNumber,
  bonus: optionalNumber,
  allowances: optionalNumber,
  deductions: optionalNumber,
  taxDeduction: optionalNumber,
  socialSecurity: optionalNumber,
  netPay: requiredNumber.min(0, "Net pay must be positive"),
  paymentMethod: z.enum(["Bank Transfer", "Cash", "Check"]),
  paymentDate: dateString,
  bankAccount: optionalString,
  remarks: optionalString,
  status: z.enum(["Draft", "Approved", "Paid", "Cancelled"]),
});

// Attendance Form Validation Schema
export const attendanceFormSchema = z.object({
  employeeId: requiredString,
  date: dateString,
  clockIn: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .optional()
    .or(z.literal("")),
  clockOut: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .optional()
    .or(z.literal("")),
  breakStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .optional()
    .or(z.literal("")),
  breakEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .optional()
    .or(z.literal("")),
  totalHours: z.number().min(0).max(24).optional().or(z.literal(0)),
  overtimeHours: z.number().min(0).max(12).optional().or(z.literal(0)),
  status: z.enum(["Present", "Absent", "Late", "Half Day", "Holiday", "Leave"]),
  leaveType: z
    .enum(["Sick", "Personal", "Vacation", "Emergency", ""])
    .optional(),
  notes: optionalString,
  location: optionalString,
  approvedBy: optionalString,
});

// Holiday Form Validation Schema
export const holidayFormSchema = z.object({
  name: requiredString.min(2, "Holiday name is required"),
  date: dateString,
  type: z.enum(["Public", "Company", "Religious", "National"]),
  description: optionalString,
  isRecurring: z.boolean().optional(),
  applicableCountries: z.array(z.string()).optional(),
  compensationType: z.enum(["Paid", "Unpaid", "Double Pay"]),
  status: z.enum(["Active", "Inactive"]),
});

// User Management Form Validation Schema
export const userFormSchema = z.object({
  username: requiredString.min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  fullName: requiredString.min(2, "Full name is required"),
  role: z.enum([
    "Super Admin",
    "Admin",
    "HR Manager",
    "Finance Manager",
    "Sales Manager",
    "User",
  ]),
  department: optionalString,
  phone: phoneNumber,
  isActive: z.boolean(),
  permissions: z.array(z.string()).optional(),
  profileImage: fileSchema,
  lastLogin: dateString.optional().or(z.literal("")),
});

// Export types for TypeScript integration
export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
export type VehiclePurchaseFormData = z.infer<typeof vehiclePurchaseFormSchema>;
export type FinanceFormData = z.infer<typeof financeFormSchema>;
export type SalesFormData = z.infer<typeof salesFormSchema>;
export type MaintenanceFormData = z.infer<typeof maintenanceFormSchema>;
export type PayrollFormData = z.infer<typeof payrollFormSchema>;
export type AttendanceFormData = z.infer<typeof attendanceFormSchema>;
export type HolidayFormData = z.infer<typeof holidayFormSchema>;
export type UserFormData = z.infer<typeof userFormSchema>;

// Validation helper functions
export const validateEmployeeForm = (data: unknown) => {
  return employeeFormSchema.safeParse(data);
};

export const validateVehiclePurchaseForm = (data: unknown) => {
  return vehiclePurchaseFormSchema.safeParse(data);
};

export const validateFinanceForm = (data: unknown) => {
  return financeFormSchema.safeParse(data);
};

export const validateSalesForm = (data: unknown) => {
  return salesFormSchema.safeParse(data);
};

export const validateMaintenanceForm = (data: unknown) => {
  return maintenanceFormSchema.safeParse(data);
};

export const validatePayrollForm = (data: unknown) => {
  return payrollFormSchema.safeParse(data);
};

export const validateAttendanceForm = (data: unknown) => {
  return attendanceFormSchema.safeParse(data);
};

export const validateHolidayForm = (data: unknown) => {
  return holidayFormSchema.safeParse(data);
};

export const validateUserForm = (data: unknown) => {
  return userFormSchema.safeParse(data);
};

// Generic validation error formatter
export const formatValidationErrors = (errors: z.ZodError) => {
  return errors.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
};

// Form validation middleware for API routes
export const createValidationMiddleware = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        errors: formatValidationErrors(result.error),
        data: null,
      };
    }
    return {
      success: true,
      errors: null,
      data: result.data,
    };
  };
};
