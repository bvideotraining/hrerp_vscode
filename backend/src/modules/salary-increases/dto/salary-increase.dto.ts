import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateSalaryIncreaseDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty()
  @IsString()
  employeeCode: string;

  @ApiProperty()
  @IsString()
  employeeName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branch?: string;

  /** Amount added on top of basic salary */
  @ApiProperty()
  @IsNumber()
  @Min(0)
  increaseAmount: number;

  /** ISO date string YYYY-MM-DD: the increase is active for payroll months >= this date */
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  effectiveDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSalaryIncreaseDto extends PartialType(CreateSalaryIncreaseDto) {}
