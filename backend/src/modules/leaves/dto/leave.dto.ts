import { IsString, IsOptional, IsIn, IsDateString, IsNumber, Min } from 'class-validator';

export const LEAVE_TYPES = ['annual', 'casual', 'sick', 'death', 'maternity', 'unpaid', 'emergency', 'paternity', 'other'] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export class CreateLeaveDto {
  @IsString()
  employeeId: string;

  @IsString()
  employeeName: string;

  @IsIn(LEAVE_TYPES)
  leaveType: LeaveType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(0.5)
  totalDays: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  employeeBranch?: string;
}

export class UpdateLeaveDto {
  @IsOptional()
  @IsIn(LEAVE_STATUSES)
  status?: LeaveStatus;

  @IsOptional()
  @IsString()
  rejectedReason?: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsIn(LEAVE_TYPES)
  leaveType?: LeaveType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  totalDays?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
