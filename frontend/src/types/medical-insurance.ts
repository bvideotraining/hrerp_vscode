export const DEPENDENT_RELATIONS = [
  'wife',
  'husband',
  'son',
  'daughter',
  'parent',
] as const;

export type DependentRelation = (typeof DEPENDENT_RELATIONS)[number];

export interface MedicalInsuranceDependent {
  id: string;
  name: string;
  relation: DependentRelation;
  nationalId: string;
  amount: number;
  birthDate?: string;
}

export interface MedicalInsuranceRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  billingMonth: string;       // YYYY-MM
  enrollmentDate: string;     // YYYY-MM-DD
  employeeAmount: number;
  dependents: MedicalInsuranceDependent[];
  totalDependentAmount: number;
  totalAmount: number;
  payrollDeductionAmount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMedicalInsurancePayload {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  billingMonth: string;
  enrollmentDate: string;
  employeeAmount: number;
  /** id is optional on create (backend generates missing ids server-side) */
  dependents?: MedicalInsuranceDependent[];
}

export interface UpdateMedicalInsurancePayload {
  billingMonth?: string;
  enrollmentDate?: string;
  employeeAmount?: number;
  dependents?: MedicalInsuranceDependent[];
}
