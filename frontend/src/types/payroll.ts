// ─── Payroll ───────────────────────────────────────────────────────────────

export type PayrollStatus = 'draft' | 'published';

export interface AttendanceSummary {
  lateMinutes: number;
  deductionDays: number;
}

export interface LeaveSummary {
  unpaidDays: number;
}

export interface PayrollRecord {
  id: string;

  // Identity
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  branch: string;
  payrollMonth: string; // YYYY-MM

  // Earnings
  basicSalary: number;
  increaseAmount: number;
  grossSalary: number;
  saturdayShiftAllowance: number;
  dutyAllowance: number;
  pottyTrainingAllowance: number;
  afterSchoolAllowance: number;
  transportationAllowance: number;
  extraBonusAllowance: number;
  otherBonusAllowance: number;
  totalAllowances: number;
  bonuses: number;
  bonusNotes?: string | null;
  totalSalary: number;

  // Deductions
  medicalInsurance: number;
  socialInsurance: number;
  lateDeduction: number;
  absenceDeduction: number;
  cashAdvance: number;
  totalDeductions: number;

  // Final
  netSalary: number;
  dailyRate: number;

  // Metadata
  attendanceSummary: AttendanceSummary;
  leaveSummary: LeaveSummary;

  // Workflow
  status: PayrollStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface GeneratePayrollPayload {
  employeeId: string;
  payrollMonth: string; // YYYY-MM
  overrideBasicSalary?: number;
  overrideCashAdvance?: number;
  notes?: string;
}

export type GenerateMode = 'single' | 'all' | 'branch' | 'categories' | 'mix';

export interface BatchGeneratePayrollPayload {
  mode: 'all' | 'branch' | 'categories' | 'mix';
  payrollMonth: string; // YYYY-MM
  branches?: string[];
  categories?: string[];
  notes?: string;
}

export interface BatchGenerateResult {
  payrollMonth: string;
  succeeded: string[];
  failed: { employeeId: string; employeeName: string; error: string }[];
  skipped: string[];
}

export interface UpdatePayrollPayload {
  overrideBasicSalary?: number;
  overrideCashAdvance?: number;
  notes?: string;
}

export interface PayrollFilters {
  payrollMonth?: string;
  employeeId?: string;
  department?: string;
  branch?: string;
  status?: PayrollStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PayrollListResponse {
  items: PayrollRecord[];
  total: number;
  page: number;
  limit: number;
}

// Used for Excel/PDF export rows
export interface PayrollExportRow {
  'Employee Code': string;
  'Employee Name': string;
  Department: string;
  'Payroll Month': string;
  'Basic Salary (EGP)': number;
  'Increase Amount (EGP)': number;
  'Gross Salary (EGP)': number;
  'Allowances (EGP)': number;
  'Bonuses (EGP)': number;
  'Total Salary (EGP)': number;
  'Medical Insurance (EGP)': number;
  'Social Insurance (EGP)': number;
  'Late Deduction (EGP)': number;
  'Absence Deduction (EGP)': number;
  'Cash Advance (EGP)': number;
  'Total Deductions (EGP)': number;
  'Net Salary (EGP)': number;
  Status: string;
}
