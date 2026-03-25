import { IsString, IsBoolean, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationRuleDto {
  @IsString()
  moduleId: string;

  @IsString()
  moduleName: string;

  @IsArray()
  @IsString({ each: true })
  events: string[];

  @IsArray()
  @IsString({ each: true })
  roleIds: string[];
}

export class NotificationConfigDto {
  @IsBoolean()
  emailEnabled: boolean;

  @IsBoolean()
  pushEnabled: boolean;

  @IsBoolean()
  inAppEnabled: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationRuleDto)
  rules: NotificationRuleDto[];
}

export class ResetSystemDto {
  @IsString()
  resetPassword: string;

  @IsString()
  confirmPhrase: string;
}
