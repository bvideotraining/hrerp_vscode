import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DeductionEntryDto {
  @IsNumber()
  upToMinutes: number;

  @IsNumber()
  days: number;
}

export class AttendanceRuleDto {
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  workStart?: string; // null for PartTime (flexible)

  @IsString()
  workEnd: string;

  @IsNumber()
  freeMinutes: number;

  @IsBoolean()
  isFlexible: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeductionEntryDto)
  deductionSchedule?: DeductionEntryDto[];
}
