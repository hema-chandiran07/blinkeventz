import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsInt, 
  IsString, 
  IsDateString, 
  IsOptional, 
  IsBoolean,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

/**
 * Event Type Enum
 * Defines the types of events that can be created
 */
export enum EventType {
  WEDDING = 'WEDDING',
  CORPORATE = 'CORPORATE',
  BIRTHDAY = 'BIRTHDAY',
  ANNIVERSARY = 'ANNIVERSARY',
  BABY_SHOWER = 'BABY_SHOWER',
  ENGAGEMENT = 'ENGAGEMENT',
  RECEPTION = 'RECEPTION',
  HALDI = 'HALDI',
  MEHNDI = 'MEHNDI',
  SANGEET = 'SANGEET',
  CONFERENCE = 'CONFERENCE',
  SEMINAR = 'SEMINAR',
  WORKSHOP = 'WORKSHOP',
  EXHIBITION = 'EXHIBITION',
  OTHER = 'OTHER',
}

/**
 * Time Slot Enum
 * Defines available time slots for events
 */
export enum TimeSlot {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  FULL_DAY = 'FULL_DAY',
}

export class CreateEventDto {
  @ApiProperty({ example: 'WEDDING', enum: EventType })
  @IsEnum(EventType, { message: 'eventType must be a valid EventType: WEDDING, CORPORATE, BIRTHDAY, ANNIVERSARY, BABY_SHOWER, ENGAGEMENT, RECEPTION, HALDI, MEHNDI, SANGEET, CONFERENCE, SEMINAR, WORKSHOP, EXHIBITION, OTHER' })
  eventType: EventType;

  @ApiPropertyOptional({ example: 'Abilash Wedding' })
  @IsOptional()
  @IsString()
  @Min(3, { message: 'title must be at least 3 characters' })
  @Max(200, { message: 'title must not exceed 200 characters' })
  title?: string;

  @ApiProperty({ example: '2026-02-15' })
  @IsDateString({}, { message: 'date must be a valid ISO 8601 date string' })
  date: string;

  @ApiProperty({ example: 'EVENING', enum: TimeSlot })
  @IsEnum(TimeSlot, { message: 'timeSlot must be a valid TimeSlot: MORNING, EVENING, or FULL_DAY' })
  timeSlot: TimeSlot;

  @ApiProperty({ example: 'Bangalore' })
  @IsString()
  @Min(2, { message: 'city must be at least 2 characters' })
  @Max(100, { message: 'city must not exceed 100 characters' })
  city: string;

  @ApiPropertyOptional({ example: 'Whitefield' })
  @IsOptional()
  @IsString()
  @Min(2, { message: 'area must be at least 2 characters' })
  @Max(100, { message: 'area must not exceed 100 characters' })
  area?: string;

  @ApiProperty({ example: 300 })
  @IsInt({ message: 'guestCount must be an integer' })
  @Min(1, { message: 'guestCount must be at least 1' })
  @Max(10000, { message: 'guestCount must not exceed 10000' })
  guestCount: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt({ message: 'venueId must be an integer' })
  @Min(1, { message: 'venueId must be a positive number' })
  venueId?: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isExpress: boolean;
}
