import { IsString } from 'class-validator';

export class JobTitleDto {
  @IsString()
  name: string;

  @IsString()
  department: string;

  @IsString()
  category: string; // 'WhiteCollar' | 'BlueCollar' | 'Management' | 'PartTime'
}
