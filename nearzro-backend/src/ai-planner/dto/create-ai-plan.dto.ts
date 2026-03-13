import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAIPlanDto {
  @ApiProperty({ example: 500000 })
  @IsInt()
  @Min(1000)
  budget: number;

  @ApiProperty({ example: 'Wedding' })
  @IsString()
  eventType: string;

  @ApiProperty({ example: 'Chennai' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Velachery' })
  @IsString()
  area: string;

  @ApiProperty({ example: 300 })
  @IsInt()
  @Min(1)
  guestCount: number;

  @IsOptional()
  @IsInt()
  eventId?: number;
}
