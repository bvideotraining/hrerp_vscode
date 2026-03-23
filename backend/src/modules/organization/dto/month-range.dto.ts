import { IsString } from 'class-validator';

export class MonthRangeDto {
  @IsString()
  monthName: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;
}
