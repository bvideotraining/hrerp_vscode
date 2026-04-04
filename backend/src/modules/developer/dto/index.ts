import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class AuthSetupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirm: string;
}

export class AuthVerifyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CreateOwnerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirm: string;
}

export class UpdateResourceDto {
  @IsString()
  @IsNotEmpty()
  value: string;
}
