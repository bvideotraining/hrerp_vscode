import { IsString, IsEmail, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiProperty({ example: 'John Doe Updated', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: 'john.updated@company.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 55000, required: false })
  @IsOptional()
  @IsNumber()
  currentSalary?: number;

  @ApiProperty({ example: 'Senior Manager', required: false })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiProperty({ example: 'Inactive', required: false })
  @IsOptional()
  @IsString()
  employmentStatus?: string;

  // Explicitly re-declare documents so the whitelist validator keeps it
  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => value)
  documents?: any[];

  // Explicitly re-declare profilePicture so the whitelist validator keeps it
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value)
  profilePicture?: string;
}
