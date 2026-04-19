import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum, IsDateString } from 'class-validator';
import { VenueStatus } from '@prisma/client';

// Define VenueType locally to avoid import issues
const VenueType = {
  BANQUET: 'BANQUET',
  HOTEL: 'HOTEL',
  RESTAURANT: 'RESTAURANT',
  CONFERENCE_HALL: 'CONFERENCE_HALL',
  OPEN_AIR: 'OPEN_AIR',
  ROOFTOP: 'ROOFTOP',
  LAWN: 'LAWN',
  COMMUNITY_HALL: 'COMMUNITY_HALL',
} as const;
export type VenueType = typeof VenueType[keyof typeof VenueType];

/**
 * Pagination parameters with validation
 */
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// Redefine VenueStatus to match Prisma schema + 'ALL' for admin filtering
const VenueStatusQuery = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELISTED: 'DELISTED',
  ALL: 'ALL',
} as const;
type VenueStatusQuery = typeof VenueStatusQuery[keyof typeof VenueStatusQuery];

/**
 * Venue query parameters for filtering and pagination
 */
export class VenueQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by city name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by area/neighborhood' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ enum: VenueType, description: 'Filter by venue type' })
  @IsOptional()
  @IsEnum(VenueType)
  type?: VenueType;

  @ApiPropertyOptional({ enum: VenueStatusQuery, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(VenueStatusQuery)
  status?: VenueStatusQuery;

  @ApiPropertyOptional({ description: 'Minimum capacity' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @ApiPropertyOptional({ description: 'Maximum capacity' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxPrice?: number;

  @ApiPropertyOptional({
    enum: ['name', 'city', 'createdAt', 'price'],
    default: 'createdAt',
    description: 'Sort field'
  })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'city' | 'createdAt' | 'price' = 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort order'
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Search query parameters
 */
export class VenueSearchQueryDto {
  @ApiProperty({ description: 'Search query string', required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: VenueType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(VenueType)
  type?: VenueType;
}

/**
 * Route parameter validation DTO
 */
export class VenueIdParamDto {
  @ApiProperty({ description: 'Venue ID (must be a positive integer)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}
