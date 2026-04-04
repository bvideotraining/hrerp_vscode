// ─── Salary Config — monthly, per-employee ─────────────────────────────────

export interface SalaryLineItem {
  name: string;
  amount: number;
  /** Tracks origin for UI badge: bonuses | social_insurance | medical_insurance | manual */
  source?: string;
}

export interface SalaryConfig {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  branch?: string;
  /** Format: YYYY-MM */
  month: string;
  basicSalary: number;
  /** Resolved from salary_increases and cached here */
  increaseAmount: number;
  /** = basicSalary + increaseAmount */
  grossSalary: number;
  allowances: SalaryLineItem[];
  deductions: SalaryLineItem[];
  totalAllowances: number;
  totalDeductions: number;
  /** = grossSalary + totalAllowances - totalDeductions */
  totalSalary: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalaryConfigPayload {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  branch?: string;
  month: string;
  basicSalary: number;
  allowances?: SalaryLineItem[];
  deductions?: SalaryLineItem[];
  notes?: string;
}

export type UpdateSalaryConfigPayload = Partial<CreateSalaryConfigPayload>;
