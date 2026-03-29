import { IsString, IsArray, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class WidgetItemDto {
  @IsString()
  id: string;

  @IsNumber()
  order: number;
}

export class SaveDashboardLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetItemDto)
  widgets: WidgetItemDto[];

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
