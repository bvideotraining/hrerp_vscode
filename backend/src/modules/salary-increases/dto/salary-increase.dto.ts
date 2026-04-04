import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Matches,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

  /** The month this increase takes effect — YYYY-MM (primary scheduling field) */
  @ApiProperty({ example: '2026-03' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'applyMonth must be YYYY-MM' })
  applyMonth: string;

  /** Amount added on top of basic salary */
  @ApiProperty()
  @IsNumber()
  @Min(0)
  increaseAmount: number;

  /** Employee basic salary at the time of this increase (admin entry) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  basicSalary?: number;

  /** Gross salary BEFORE this increase = basicSalary + previous cumulative increases */
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  grossSalary?: number;

  /** Employee hiring date YYYY-MM-DD (from employee master or admin entry) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hiringDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitle?: string;

  /** Most recent previous increase month YYYY-MM (derived from history or admin entry) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousIncreaseDate?: string;

  /** Next scheduled increase month YYYY-MM (admin entry or auto-computed) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextIncreaseMonth?: string;

  /** Gross salary AFTER this increase = grossSalary + increaseAmount */
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  newGrossSalary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  /** Workflow status: 'pending' (default) or 'applied' */
  @ApiPropertyOptional({ enum: ['pending', 'applied'], default: 'pending' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateSalaryIncreaseDto extends PartialType(CreateSalaryIncreaseDto) {}

class BulkUpdateItem {
  @IsString()
  id: string;

  @ValidateNested()
  @Type(() => UpdateSalaryIncreaseDto)
  data: UpdateSalaryIncreaseDto;
}

export class BulkSaveIncreaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalaryIncreaseDto)
  creates: CreateSalaryIncreaseDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItem)
  updates: BulkUpdateItem[];

  @IsArray()
  @IsString({ each: true })
  deletes: string[];
}
