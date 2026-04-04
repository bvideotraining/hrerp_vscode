import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePayrollDto {
  @ApiProperty({ description: 'Employee Firestore document ID' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Payroll month in YYYY-MM format', example: '2026-03' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'payrollMonth must be in YYYY-MM format' })
  payrollMonth: string;

  /** Optional manual overrides — if provided, skip calculation for that field */
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  overrideBasicSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  overrideCashAdvance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePayrollDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  overrideBasicSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  overrideCashAdvance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PayrollFilterDto {
  @ApiPropertyOptional({ example: '2026-03' })
  @IsOptional()
  @IsString()
  payrollMonth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published'] })
  @IsOptional()
  @IsString()
  status?: 'draft' | 'published';

  @ApiPropertyOptional({ description: 'Search by employee name or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number;
}

// ─── Batch generation ───────────────────────────────────────────────────────

export class BatchGeneratePayrollDto {
  @ApiProperty({ description: 'Firestore document ID of the month_range to generate payroll for' })
  @IsString()
  monthRangeId: string;
}

// ─── Batch generate with filters ────────────────────────────────────────────

export const EMPLOYEE_CATEGORIES = ['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'] as const;
export type EmployeeCategory = (typeof EMPLOYEE_CATEGORIES)[number];

export class BatchGenerateFilteredDto {
  @ApiProperty({ enum: ['all', 'branch', 'categories', 'mix'], description: 'Generation scope' })
  @IsIn(['all', 'branch', 'categories', 'mix'])
  mode: 'all' | 'branch' | 'categories' | 'mix';

  @ApiProperty({ description: 'Payroll month in YYYY-MM format', example: '2026-04' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'payrollMonth must be in YYYY-MM format' })
  payrollMonth: string;

  @ApiPropertyOptional({ type: [String], description: 'Filter by branch names (used when mode is branch or mix)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branches?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Filter by employee categories (used when mode is categories or mix)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export interface BatchGenerateResultDto {
  payrollMonth: string;
  period: { startDate: string; endDate: string; monthName: string };
  succeeded: string[];
  failed: { employeeId: string; employeeName: string; error: string }[];
  skipped: string[];
}
