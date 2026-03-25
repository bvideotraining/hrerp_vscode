import { IsString } from 'class-validator';

export class BranchDto {
  @IsString()
  code: string;

  @IsString()
  name: string;
}
