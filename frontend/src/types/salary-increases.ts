// ─── Salary Increases ──────────────────────────────────────────────────────

export interface SalaryIncrease {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department?: string;
  branch?: string;

  /** Primary scheduling month YYYY-MM */
  applyMonth: string;
  /** Derived from applyMonth for backward-compat: YYYY-MM-01 */
  effectiveDate?: string;

  /** Amount added on top of basic salary */
  increaseAmount: number;

  // ── Contextual fields (from employee master or admin manual entry) ──────
  basicSalary?: number;
  /** Gross = basicSalary + cumulative increases BEFORE this one */
  grossSalary?: number;
  hiringDate?: string;
  jobTitle?: string;
  previousIncreaseDate?: string;
  nextIncreaseMonth?: string;
  /** Gross AFTER this increase = grossSalary + increaseAmount */
  newGrossSalary?: number;

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
  applyMonth: string;
  increaseAmount: number;
  basicSalary?: number;
  grossSalary?: number;
  hiringDate?: string;
  jobTitle?: string;
  previousIncreaseDate?: string;
  nextIncreaseMonth?: string;
  newGrossSalary?: number;
  reason?: string;
  notes?: string;
}

export type UpdateSalaryIncreasePayload = Partial<CreateSalaryIncreasePayload>;

export interface BulkSaveIncreasePayload {
  creates: CreateSalaryIncreasePayload[];
  updates: { id: string; data: UpdateSalaryIncreasePayload }[];
  deletes: string[];
}
