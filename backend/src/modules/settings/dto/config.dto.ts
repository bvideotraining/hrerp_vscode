import { IsString, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class OfficialVacationDto {
  @IsString()
  name: string;

  @IsString()
  date: string;
}

export class SystemConfigDto {
  @IsString()
  defaultCurrency: string;

  @IsNumber()
  workingDaysPerWeek: number;

  @IsArray()
  @IsString({ each: true })
  weeklyHolidays: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfficialVacationDto)
  officialVacations: OfficialVacationDto[];
}
