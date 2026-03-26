import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateBonusDto {
  @IsString()
  employeeId: string;

  @IsString()
  employeeName: string;

  @IsString()
  employeeCode: string;

  @IsString()
  branch: string;

  @IsString()
  category: string;

  @IsString()
  monthId: string;

  @IsString()
  monthName: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  saturday?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  potty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  afterSchool?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transportation?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extraBonus?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBonusDto {
  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsString()
  monthName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  saturday?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  potty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  afterSchool?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transportation?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  extraBonus?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SyncSaturdaysDto {
  @IsString()
  monthId: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsString()
  @IsOptional()
  monthName?: string;
}
