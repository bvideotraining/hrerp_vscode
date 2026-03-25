import { z } from 'zod';

// Zod v4 compatible validation schema for Employee form

export const employeeValidationSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),

  employeeCode: z
    .string()
    .min(3, 'Employee code must be at least 3 characters')
    .max(20, 'Employee code must be less than 20 characters')
    .transform((val) => val.toUpperCase()),

  email: z
    .string()
    .email('Please enter a valid email address'),

  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits'),

  nationalId: z
    .string()
    .min(5, 'National ID must be at least 5 characters')
    .max(20, 'National ID must be less than 20 characters'),

  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required'),

  gender: z.enum(['M', 'F']),

  branch: z
    .string()
    .min(1, 'Please select a branch'),

  department: z
    .string()
    .min(1, 'Please select a department'),

  jobTitle: z
    .string()
    .min(1, 'Please select a job title'),

  category: z.enum(['WhiteCollar', 'BlueCollar', 'Management', 'PartTime']),

  currentSalary: z
    .number()
    .min(0, 'Salary cannot be negative')
    .max(10000000, 'Salary exceeds maximum allowed'),

  startDate: z
    .string()
    .min(1, 'Start date is required'),

  resignationDate: z.string().optional(),

  currency: z
    .string()
    .min(1, 'Please select a currency'),

  paymentMethod: z
    .string()
    .min(1, 'Please select a payment method'),

  currentAddress: z.string().max(200, 'Address must be less than 200 characters').optional(),

  positionType: z.string().optional().default('Full-time'),

  employmentType: z
    .string()
    .min(1, 'Please select an employment type'),

  documents: z
    .array(
      z.object({
        id: z.string(),
        type: z.string().min(1, 'Document type is required'),
        file: z.string().optional().default(''),
        fileContent: z.string().optional(),
        receivedDate: z.string().min(1, 'Received date is required'),
        expiryDate: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(['Current', 'Expired', 'Renewal Pending']).optional().default('Current'),
      })
    )
    .optional()
    .default([]),

  employmentStatus: z.string().optional().default('Active'),

  profilePicture: z.string().optional(),

  nationality: z.string().optional(),

  bankName: z.string().optional(),

  accountNumber: z.string().optional(),
});

export type EmployeeFormData = z.infer<typeof employeeValidationSchema>;
