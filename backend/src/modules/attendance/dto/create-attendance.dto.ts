import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'on_leave'
  | 'unpaid_leave';

export class CreateAttendanceDto {
  @ApiProperty({ description: 'Firestore employee document ID' })
  @IsString()
  employeeId: string;

  @ApiProperty({ example: 'EMP-001' })
  @IsString()
  employeeCode: string;

  @ApiProperty({ example: 'Ahmed Ali' })
  @IsString()
  employeeName: string;

  @ApiProperty({ example: 'Cairo Branch' })
  @IsString()
  branch: string;

  @ApiProperty({ example: 'WhiteCollar' })
  @IsString()
  @IsIn(['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'])
  category: string;

  @ApiProperty({ description: 'YYYY-MM-DD', example: '2026-03-24' })
  @IsString()
  date: string;

  @ApiProperty({
    enum: ['present', 'late', 'absent', 'on_leave', 'unpaid_leave'],
    example: 'present',
  })
  @IsString()
  @IsIn(['present', 'late', 'absent', 'on_leave', 'unpaid_leave'])
  status: AttendanceStatus;

  @ApiPropertyOptional({ description: 'HH:MM 24h', example: '08:10' })
  @IsOptional()
  @IsString()
  checkIn?: string;

  @ApiPropertyOptional({ description: 'HH:MM 24h', example: '16:30' })
  @IsOptional()
  @IsString()
  checkOut?: string;

  @ApiPropertyOptional({ description: 'Excuse / reason for late or absence' })
  @IsOptional()
  @IsString()
  excuse?: string;

  @ApiPropertyOptional({
    description:
      'Override late minutes manually. When provided, auto-calculation is skipped.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lateMinutesOverride?: number;

  @ApiPropertyOptional({
    description:
      'Deduction days override. Defaults: absent/unpaid_leave = 1, late auto from schedule.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deductionDaysOverride?: number;

  @ApiPropertyOptional({ description: 'Mark Saturday work manually' })
  @IsOptional()
  @IsBoolean()
  saturdayWorkOverride?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
