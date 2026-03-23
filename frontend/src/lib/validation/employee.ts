import { z } from 'zod';


// Zod validation schemas for Employee form

export const employeeValidationSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]*$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),

  employeeCode: z
    .string()
    .min(3, 'Employee code must be at least 3 characters')
    .max(20, 'Employee code must be less than 20 characters')
    .regex(/^[A-Z0-9-]*$/, 'Employee code must be uppercase letters, numbers, and hyphens'),

  email: z
    .string()
    .email('Please enter a valid email address'),

  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[0-9\s-()]*$/, 'Please enter a valid phone number'),

  nationalId: z
    .string()
    .min(5, 'National ID must be at least 5 characters')
    .max(20, 'National ID must be less than 20 characters'),

  dateOfBirth: z
    .string()
    .refine((date: string) => {
      const birth = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear();
      return age >= 18 && age <= 75;
    }, 'Employee must be between 18 and 75 years old'),

  gender: z.enum(['M', 'F'])
    .refine(val => ['M', 'F'].includes(val), { message: 'Please select a valid gender' }),

  branch: z
    .string()
    .min(1, 'Please select a branch'),

  department: z
    .string()
    .min(1, 'Please select a department'),

  jobTitle: z
    .string()
    .min(1, 'Please select a job title'),

  category: z
    .enum(['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'])
    .refine(val => ['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'].includes(val), {
      message: 'Please select a valid category'
    }),

  currentSalary: z
    .number()
    .min(0, 'Salary cannot be negative')
    .min(1000, 'Salary must be at least 1,000')
    .max(10000000, 'Salary exceeds maximum allowed'),

  startDate: z
    .string()
    .refine((date: string) => {
      const start = new Date(date);
      const today = new Date();
      return start <= today;
    }, 'Start date cannot be in the future'),

  resignationDate: z
    .string()
    .optional()
    .refine(
      (date: string | undefined) => !date || new Date(date) > new Date(),
      'Resignation date must be in the future'
    ),

  currency: z
    .string()
    .min(1, 'Please select a currency'),

  paymentMethod: z
    .string()
    .min(1, 'Please select a payment method'),

  currentAddress: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters')
    .optional()
    .or(z.literal('')),

  positionType: z
    .string()
    .min(1, 'Please select a position type'),

  employmentType: z
    .string()
    .min(1, 'Please select an employment type'),

  documents: z
    .array(
      z.object({
        id: z.string(),
        type: z.string().min(1, 'Document type is required'),
        file: z.string().min(1, 'File name is required'),
        receivedDate: z.string().min(1, 'Received date is required'),
        expiryDate: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(['Current', 'Expired', 'Renewal Pending'])
      })
    )
    .optional()
    .default([]),

  employmentStatus: z
    .string()
    .optional()
    .default('Active'),
});

export type EmployeeFormData = z.infer<typeof employeeValidationSchema>;

export const validateEmployee = (data: unknown) => {
  try {
    return employeeValidationSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.issues.forEach((err: z.ZodIssue) => {
        const path = err.path.join('.');
        fieldErrors[path] = err.message;
      });
      return { success: false, errors: fieldErrors };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
};
