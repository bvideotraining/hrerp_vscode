// ─── Salary Increases ──────────────────────────────────────────────────────

export interface SalaryIncrease {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department?: string;
  branch?: string;
  increaseAmount: number;
  effectiveDate: string; // YYYY-MM-DD
  reason?: string;
  notes?: string;
  jobTitle?: string;
  hiringDate?: string;
  basicSalary?: number;
  grossSalary?: number;
  previousIncreaseDate?: string;
  nextIncreaseMonth?: string;
  newGrossSalary?: number;
  applyMonth?: string;
  /** Workflow status: 'pending' (default) | 'applied' */
  status?: 'pending' | 'applied';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalaryIncreasePayload {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department?: string;
  branch?: string;
  increaseAmount: number;
  effectiveDate: string;
  reason?: string;
  notes?: string;
  jobTitle?: string;
  hiringDate?: string;
  basicSalary?: number;
  grossSalary?: number;
  previousIncreaseDate?: string;
  nextIncreaseMonth?: string;
  newGrossSalary?: number;
  applyMonth?: string;
  status?: 'pending' | 'applied';
}

export type UpdateSalaryIncreasePayload = Partial<CreateSalaryIncreasePayload>;
