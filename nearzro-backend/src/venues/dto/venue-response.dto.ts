import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
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
 * Venue Response DTO - Excludes PII (owner email, phone)
 * Used for all public API responses
 */
export class VenueResponseDto {
  @ApiProperty({ description: 'Unique venue identifier' })
  @Expose()
  id: number;

  @ApiProperty({ description: 'Venue name' })
  @Expose()
  name: string;

  @ApiProperty({ enum: VenueType, description: 'Type of venue' })
  @Expose()
  type: VenueType;

  @ApiProperty({ description: 'Venue description', required: false })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Street address' })
  @Expose()
  address: string;

  @ApiProperty({ description: 'City name' })
  @Expose()
  city: string;

  @ApiProperty({ description: 'Area/neighborhood' })
  @Expose()
  area: string;

  @ApiProperty({ description: 'Pincode' })
  @Expose()
  pincode: string;

  @ApiProperty({ description: 'Minimum capacity' })
  @Expose()
  capacityMin: number;

  @ApiProperty({ description: 'Maximum capacity' })
  @Expose()
  capacityMax: number;

  @ApiProperty({ description: 'Base price for morning slot', required: false })
  @Expose()
  basePriceMorning?: number;

  @ApiProperty({ description: 'Base price for evening slot', required: false })
  @Expose()
  basePriceEvening?: number;

  @ApiProperty({ description: 'Base price for full day', required: false })
  @Expose()
  basePriceFullDay?: number;

  @ApiProperty({ description: 'Amenities', required: false })
  @Expose()
  amenities?: string;

  @ApiProperty({ description: 'Policies', required: false })
  @Expose()
  policies?: string;

  @ApiProperty({ enum: VenueStatus, description: 'Venue status' })
  @Expose()
  status: VenueStatus;

  @ApiProperty({ description: 'Venue images', required: false })
  @Expose()
  images?: string[];

  @ApiProperty({ description: 'Venue photos', required: false })
  @Expose()
  photos?: Array<{ id: number; url: string; isCover: boolean }>;

  @ApiProperty({ description: 'Creation timestamp', required: false })
  @Expose()
  createdAt?: Date;

  @ApiProperty({ description: 'Last update timestamp', required: false })
  @Expose()
  updatedAt?: Date;

  // ============================================
  // EXCLUDED FIELDS (PII - Never expose these)
  // ============================================

  /** @hidden */
  @Exclude()
  ownerId: number;

  /** @hidden - PII */
  @Exclude()
  ownerEmail: string;

  /** @hidden - PII */
  @Exclude()
  ownerPhone: string;

  /** @hidden */
  @Exclude()
  ownerName: string;

  /** @hidden - Internal use only */
  @Exclude()
  username: string;

  /** @hidden - Internal use only */
  @Exclude()
  rejectionReason?: string;
}

/**
 * Paginated Venue Response with metadata
 */
export class PaginatedVenueResponseDto {
  @ApiProperty({ description: 'Array of venues' })
  @Expose()
  data: VenueResponseDto[];

  @ApiProperty({ description: 'Current page number' })
  @Expose()
  page: number;

  @ApiProperty({ description: 'Items per page' })
  @Expose()
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  @Expose()
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  @Expose()
  totalPages: number;

  @ApiProperty({ description: 'Has next page' })
  @Expose()
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page' })
  @Expose()
  hasPrev: boolean;
}

/**
 * Venue detail for owner/admin (includes owner info)
 * Only use this for authenticated owner or admin endpoints
 */
export interface VenueDetailResponseDto extends VenueResponseDto {
  ownerId: number;
  ownerName: string;
  rejectionReason?: string;
}
