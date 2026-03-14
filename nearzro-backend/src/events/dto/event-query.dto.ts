import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsInt, 
  IsString, 
  IsDateString, 
  IsOptional, 
  IsEnum,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus } from '@prisma/client';

/**
 * Event Query DTO
 * 
 * Supports pagination and filtering for event list endpoints.
 * Default page size is 20, maximum is 100.
 */
export class EventQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Number of items per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must not exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Filter by start date' })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Filter by end date' })
  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate?: string;

  @ApiPropertyOptional({ example: 'CONFIRMED', enum: EventStatus, description: 'Filter by event status' })
  @IsOptional()
  @IsEnum(EventStatus, { message: 'status must be a valid EventStatus' })
  status?: EventStatus;

  @ApiPropertyOptional({ example: 'Bangalore', description: 'Filter by city' })
  @IsOptional()
  @IsString()
  @Min(2, { message: 'city must be at least 2 characters' })
  city?: string;

  @ApiPropertyOptional({ example: 'Whitefield', description: 'Filter by area' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ example: 12, description: 'Filter by venue ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'venueId must be an integer' })
  @Min(1, { message: 'venueId must be a positive number' })
  venueId?: number;

  @ApiPropertyOptional({ example: true, description: 'Filter by express events' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isExpress?: boolean;

  @ApiPropertyOptional({ 
    example: 'date', 
    enum: ['date', 'createdAt', 'totalAmount', 'guestCount'],
    description: 'Field to sort by' 
  })
  @IsOptional()
  @IsString()
  sortBy?: 'date' | 'createdAt' | 'totalAmount' | 'guestCount' = 'createdAt';

  @ApiPropertyOptional({ 
    example: 'desc', 
    enum: ['asc', 'desc'],
    description: 'Sort direction' 
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
