import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export const DEPENDENT_RELATIONS = [
  'wife',
  'husband',
  'son',
  'daughter',
  'parent',
] as const;
export type DependentRelation = (typeof DEPENDENT_RELATIONS)[number];

export class MedicalInsuranceDependentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsIn(DEPENDENT_RELATIONS)
  relation: DependentRelation;

  @IsString()
  nationalId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  birthDate?: string;
}

export class CreateMedicalInsuranceDto {
  @IsString()
  employeeId: string;

  @IsString()
  employeeName: string;

  @IsString()
  employeeCode: string;

  /** Billing month in YYYY-MM format */
  @IsString()
  billingMonth: string;

  /** Service start date in YYYY-MM-DD format */
  @IsDateString()
  enrollmentDate: string;

  @IsNumber()
  @Min(0)
  employeeAmount: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalInsuranceDependentDto)
  dependents?: MedicalInsuranceDependentDto[];
}

export class UpdateMedicalInsuranceDto {
  @IsOptional()
  @IsString()
  billingMonth?: string;

  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  employeeAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalInsuranceDependentDto)
  dependents?: MedicalInsuranceDependentDto[];
}
