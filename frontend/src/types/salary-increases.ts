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
}

export type UpdateSalaryIncreasePayload = Partial<CreateSalaryIncreasePayload>;
