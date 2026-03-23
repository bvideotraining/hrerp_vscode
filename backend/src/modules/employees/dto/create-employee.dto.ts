import { IsString, IsEmail, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'EMP001' })
  @IsString()
  employeeCode: string;

  @ApiProperty({ example: 'john@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+971501234567' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsString()
  dateOfBirth: string;

  @ApiProperty({ example: 'Engineering' })
  @IsString()
  department: string;

  @ApiProperty({ example: 'Dubai' })
  @IsString()
  branch: string;

  @ApiProperty({ example: 'Senior Engineer' })
  @IsString()
  jobTitle: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  currentSalary: number;

  @ApiProperty({ example: '2023-01-15' })
  @IsString()
  startDate: string;

  // Optional fields

  @ApiProperty({ example: 'Active', required: false })
  @IsOptional()
  @IsString()
  employmentStatus?: string;

  @ApiProperty({ example: 'WhiteCollar', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'Full-time', required: false })
  @IsOptional()
  @IsString()
  positionType?: string;

  @ApiProperty({ example: 'Full-Time', required: false })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiProperty({ example: 'M', required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ example: 'UAE', required: false })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({ example: '123456789', required: false })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiProperty({ example: 'Single', required: false })
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiProperty({ example: 'Dubai, UAE', required: false })
  @IsOptional()
  @IsString()
  currentAddress?: string;

  @ApiProperty({ example: 'Abu Dhabi, UAE', required: false })
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @ApiProperty({ example: 'AED', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'Bank Transfer', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsOptional()
  @IsString()
  resignationDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reportingManager?: string;

  @ApiProperty({ example: 45000, required: false })
  @IsOptional()
  @IsNumber()
  previousSalary?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  salaryIncreaseDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  swiftCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  documents?: any[];
}
