import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'WEDDING' })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({ example: 'Keshav Wedding' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: '2026-02-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'EVENING', enum: ['MORNING', 'EVENING', 'FULL_DAY'] })
  @IsString()
  timeSlot: string;

  @ApiProperty({ example: 'Bangalore' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: 'Whitefield' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiProperty({ example: 300 })
  @IsInt()
  guestCount: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  venueId?: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isExpress: boolean;
}
