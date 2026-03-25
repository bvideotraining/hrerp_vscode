import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AttendanceFilterDto {
  @ApiPropertyOptional({ description: 'Start date YYYY-MM-DD', example: '2026-03-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date YYYY-MM-DD', example: '2026-03-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ description: 'Partial or full employee name (case-insensitive starts-with)' })
  @IsOptional()
  @IsString()
  employeeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiPropertyOptional({ description: 'Employee Firestore ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ enum: ['present', 'late', 'absent', 'on_leave', 'unpaid_leave'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number, 1-based' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
