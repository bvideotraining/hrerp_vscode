import { IsString } from 'class-validator';

export class DepartmentDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  type: string; // 'operation' | 'non-operation'
}
