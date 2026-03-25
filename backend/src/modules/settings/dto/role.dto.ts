import { IsString, IsOptional, IsIn, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class RolePermissionDto {
  @IsString()
  moduleId: string;

  @IsString()
  moduleName: string;

  @IsArray()
  @IsString({ each: true })
  actions: string[];
}

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['full', 'custom'])
  accessType: 'full' | 'custom';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  permissions?: RolePermissionDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopeBranches?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopeDepartments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopeType?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopeJobTitles?: string[];

  @IsOptional()
  @IsBoolean()
  isBuiltIn?: boolean;
}
