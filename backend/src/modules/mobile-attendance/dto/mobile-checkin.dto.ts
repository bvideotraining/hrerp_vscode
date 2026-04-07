import { IsString, IsNumber, IsOptional, Min, Max, IsEnum } from 'class-validator';

export enum CheckinType {
  CHECK_IN = 'check-in',
  CHECK_OUT = 'check-out',
}

export class MobileCheckinDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsEnum(CheckinType)
  type: CheckinType;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsNumber()
  accuracy?: number;
}
