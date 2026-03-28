import {
  IsString,
  IsOptional,
  IsNumber,
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
