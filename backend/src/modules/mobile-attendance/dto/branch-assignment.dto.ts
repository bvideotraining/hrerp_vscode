import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateBranchAssignmentDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export interface BranchAssignmentResponse {
  branchId: string;
  branchName: string;
  employeeCode: string;
  isPrimary: boolean;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  address: string;
}
