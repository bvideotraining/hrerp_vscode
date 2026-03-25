import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ContentBlockDto {
  @IsString()
  id: string;

  @IsString()
  type: string; // 'hero' | 'cards' | 'richtext' | 'footer'

  @IsNumber()
  order: number;

  @IsOptional()
  data?: any;
}

export class CreateCmsPageDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  showInMenu?: boolean;

  @IsOptional()
  @IsNumber()
  menuOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  blocks?: ContentBlockDto[];
}

export class UpdateCmsPageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  showInMenu?: boolean;

  @IsOptional()
  @IsNumber()
  menuOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  blocks?: ContentBlockDto[];
}

// ─── Menu Configuration DTO ──────────────────────────────────────────────────

export class SocialLinkDto {
  @IsString()
  platform: string;

  @IsOptional()
  @IsString()
  url?: string;
}

export class MenuConfigDto {
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  backgroundStyle?: string; // 'solid' | 'gradient' | 'transparent' | 'blur'

  @IsOptional()
  @IsString()
  gradientFrom?: string;

  @IsOptional()
  @IsString()
  gradientTo?: string;

  @IsOptional()
  @IsString()
  menuItemColor?: string;

  @IsOptional()
  @IsString()
  menuItemHoverColor?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  logoText?: string;

  @IsOptional()
  @IsString()
  logoPosition?: string; // 'left' | 'center'

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @IsOptional()
  @IsBoolean()
  showSocialIcons?: boolean;

  @IsOptional()
  @IsBoolean()
  showSignInButton?: boolean;

  @IsOptional()
  @IsString()
  signInButtonText?: string;

  @IsOptional()
  @IsString()
  signInButtonUrl?: string;

  @IsOptional()
  @IsString()
  signInButtonColor?: string;

  @IsOptional()
  @IsString()
  signInButtonTextColor?: string;

  @IsOptional()
  @IsString()
  borderStyle?: string; // 'none' | 'solid' | 'shadow'

  @IsOptional()
  @IsBoolean()
  sticky?: boolean;
}
