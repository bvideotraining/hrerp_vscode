// ─── Cash Advance Types ───────────────────────────────────────────────────

export type CashAdvanceStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface InstallmentRow {
  month: string;          // YYYY-MM
  dueAmount: number;
  paidAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
}

export interface CashAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  branch: string;

  /** Total requested amount */
  amount: number;

  /** Remaining unpaid amount (updated as installments are paid) */
  remainingAmount: number;

  /** Number of monthly repayment installments */
  installmentMonths: number;

  /** amount / installmentMonths (rounded) */
  monthlyInstallment: number;

  /** First payroll month of repayment — YYYY-MM */
  repaymentStartMonth: string;

  reason?: string;
  status: CashAdvanceStatus;

  /** Installment schedule — populated on approval */
  schedule: InstallmentRow[];

  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  note?: string;

  createdAt: string;
  updatedAt: string;
}

// ─── API payload types ────────────────────────────────────────────────────

export interface CreateCashAdvancePayload {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  branch: string;
  amount: number;
  installmentMonths: number;
  repaymentStartMonth: string;
  reason?: string;
}

export interface UpdateCashAdvancePayload {
  amount?: number;
  installmentMonths?: number;
  repaymentStartMonth?: string;
  reason?: string;
}

export interface DecideCashAdvancePayload {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
  note?: string;
}
