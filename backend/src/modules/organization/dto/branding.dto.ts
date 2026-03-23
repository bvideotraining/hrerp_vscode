import { IsString, IsOptional } from 'class-validator';

export class BrandingDto {
  @IsString()
  appName: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
