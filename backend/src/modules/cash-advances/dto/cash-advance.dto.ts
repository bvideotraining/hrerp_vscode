import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  Min,
  IsInt,
  Matches,
} from 'class-validator';

export const CASH_ADVANCE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CashAdvanceStatus = (typeof CASH_ADVANCE_STATUSES)[number];

// ─── Create ────────────────────────────────────────────────────────────────

export class CreateCashAdvanceDto {
  @IsString()
  employeeId: string;

  /** Snapshot of employee name at request time */
  @IsString()
  employeeName: string;

  /** Snapshot of employee code at request time */
  @IsString()
  employeeCode: string;

  /** Snapshot of employee branch at request time */
  @IsString()
  branch: string;

  /** Total cash advance amount requested */
  @IsNumber()
  @Min(1)
  amount: number;

  /** Number of monthly installments to repay the advance */
  @IsInt()
  @Min(1)
  installmentMonths: number;

  /** The first payroll month to start deducting, format YYYY-MM */
  @Matches(/^\d{4}-\d{2}$/, { message: 'repaymentStartMonth must be YYYY-MM' })
  repaymentStartMonth: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Update (admin) ────────────────────────────────────────────────────────

export class UpdateCashAdvanceDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  installmentMonths?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'repaymentStartMonth must be YYYY-MM' })
  repaymentStartMonth?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Decision (approve / reject) ─────────────────────────────────────────

export class DecideCashAdvanceDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  /** Required when rejecting */
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  /** Optional note when approving */
  @IsOptional()
  @IsString()
  note?: string;
}
