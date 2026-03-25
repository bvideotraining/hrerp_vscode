import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class SetLeaveBalanceDto {
  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  casual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sick?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  death?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maternity?: number;
}

export class InitBalanceDto {
  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsInt()
  year?: number;
}
