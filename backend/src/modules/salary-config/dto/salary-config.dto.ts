import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ─── Line-item DTO ────────────────────────────────────────────────────────

export class SalaryLineItemDto {
  @ApiProperty({ description: 'Item label, e.g. "Housing Allowance" or "Social Insurance"' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Amount in EGP (≥ 0)' })
  @IsNumber()
  @Min(0)
  amount: number;

  /** Tracks where the item came from so the UI can flag auto-imported rows */
  @ApiPropertyOptional({
    description: 'Source identifier: bonuses | salary_increases | social_insurance | medical_insurance | cash_advance | attendance | leave | manual',
  })
  @IsOptional()
  @IsString()
  source?: string;
}

// ─── Create DTO ───────────────────────────────────────────────────────────

export class CreateSalaryConfigDto {
  @ApiProperty({ description: 'Firestore employee document ID' })
  @IsString()
  employeeId: string;

  @ApiProperty()
  @IsString()
  employeeCode: string;

  @ApiProperty()
  @IsString()
  employeeName: string;

  @ApiProperty()
  @IsString()
  department: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiProperty({
    description: 'Payroll month in YYYY-MM format, e.g. "2026-03"',
    example: '2026-03',
  })
  @IsString()
  month: string;

  @ApiProperty({ description: 'Monthly basic salary in EGP (≥ 0)' })
  @IsNumber()
  @Min(0)
  basicSalary: number;

  @ApiPropertyOptional({ type: [SalaryLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryLineItemDto)
  allowances?: SalaryLineItemDto[];

  @ApiPropertyOptional({ type: [SalaryLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryLineItemDto)
  deductions?: SalaryLineItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Update DTO ───────────────────────────────────────────────────────────

export class UpdateSalaryConfigDto extends PartialType(CreateSalaryConfigDto) {}
