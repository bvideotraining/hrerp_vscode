import {
  IsString, IsOptional, IsNumber, IsDateString, Min,
  IsArray, ValidateNested, IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export const FORM_TYPES = ['form1', 'form6'] as const;
export type FormType = (typeof FORM_TYPES)[number];

export class SocialInsuranceAttachmentDto {
  @IsString()
  name: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsIn(FORM_TYPES)
  formType?: FormType;
}

export class CreateSocialInsuranceDto {
  @IsString()
  employeeId: string;

  @IsString()
  employeeName: string;

  @IsString()
  employeeCode: string;

  @IsString()
  insuranceNumber: string;

  @IsNumber()
  @Min(0)
  insurableWage: number;

  @IsDateString()
  enrollmentDate: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialInsuranceAttachmentDto)
  attachments?: SocialInsuranceAttachmentDto[];
}

export class UpdateSocialInsuranceDto {
  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;

  @IsOptional()
  @IsString()
  insuranceNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insurableWage?: number;

  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialInsuranceAttachmentDto)
  attachments?: SocialInsuranceAttachmentDto[];
}
