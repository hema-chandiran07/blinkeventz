import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsInt, 
  IsString, 
  IsDateString, 
  IsOptional, 
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { EventStatus } from '@prisma/client';
import { EventType, TimeSlot } from './create-event.dto';

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'WEDDING', enum: EventType })
  @IsOptional()
  @IsEnum(EventType, { message: 'eventType must be a valid EventType' })
  eventType?: EventType;

  @ApiPropertyOptional({ example: ' Abilash Wedding' })
  @IsOptional()
  @IsString()
  @Min(3, { message: 'title must be at least 3 characters' })
  @Max(200, { message: 'title must not exceed 200 characters' })
  title?: string;

  @ApiPropertyOptional({ example: '2026-02-15' })
  @IsOptional()
  @IsDateString({}, { message: 'date must be a valid ISO 8601 date string' })
  date?: string;

  @ApiPropertyOptional({ example: 'EVENING', enum: TimeSlot })
  @IsOptional()
  @IsEnum(TimeSlot, { message: 'timeSlot must be a valid TimeSlot' })
  timeSlot?: TimeSlot;

  @ApiPropertyOptional({ example: 'Bangalore' })
  @IsOptional()
  @IsString()
  @Min(2, { message: 'city must be at least 2 characters' })
  @Max(100, { message: 'city must not exceed 100 characters' })
  city?: string;

  @ApiPropertyOptional({ example: 'Whitefield' })
  @IsOptional()
  @IsString()
  @Min(2, { message: 'area must be at least 2 characters' })
  @Max(100, { message: 'area must not exceed 100 characters' })
  area?: string;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsInt({ message: 'guestCount must be an integer' })
  @Min(1, { message: 'guestCount must be at least 1' })
  @Max(10000, { message: 'guestCount must not exceed 10000' })
  guestCount?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt({ message: 'venueId must be an integer' })
  @Min(1, { message: 'venueId must be a positive number' })
  venueId?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isExpress?: boolean;

  @ApiPropertyOptional({ example: 'CONFIRMED', enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus, { message: 'status must be a valid EventStatus' })
  status?: EventStatus;
}
