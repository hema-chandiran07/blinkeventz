import { IsInt, IsString, IsDateString } from 'class-validator';

export class CreateTempEventDto {
  @IsInt()
  userId: number;

  @IsDateString()
  eventDate: string;

  @IsString()
  city: string;

  @IsString()
  area: string;
}
