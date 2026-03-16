import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import { EventType, TimeSlot } from '../create-event.dto';

export class EventCustomerResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'WEDDING', enum: EventType })
  eventType: EventType;

  @ApiPropertyOptional({ example: 'Keshav Wedding' })
  title?: string;

  @ApiProperty({ example: '2026-02-15T00:00:00.000Z' })
  date: Date;

  @ApiProperty({ example: 'EVENING', enum: TimeSlot })
  timeSlot: TimeSlot;

  @ApiProperty({ example: 'Bangalore' })
  city: string;

  @ApiPropertyOptional({ example: 'Whitefield' })
  area?: string;

  @ApiProperty({ example: 300 })
  guestCount: number;

  @ApiPropertyOptional({ example: 12 })
  venueId?: number;

  @ApiProperty({ example: 'CONFIRMED', enum: EventStatus })
  status: EventStatus;

  @ApiProperty({ example: false })
  isExpress: boolean;

  @ApiProperty({ example: 150000 })
  subtotal: number;

  @ApiProperty({ example: 0 })
  discount: number;

  @ApiProperty({ example: 5000 })
  platformFee: number;

  @ApiProperty({ example: 15000 })
  tax: number;

  @ApiProperty({ example: 170000 })
  totalAmount: number;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  updatedAt: Date;
}

export class EventListItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'WEDDING', enum: EventType })
  eventType: EventType;

  @ApiPropertyOptional({ example: 'Keshav Wedding' })
  title?: string;

  @ApiProperty({ example: '2026-02-15T00:00:00.000Z' })
  date: Date;

  @ApiProperty({ example: 'EVENING', enum: TimeSlot })
  timeSlot: TimeSlot;

  @ApiProperty({ example: 'Bangalore' })
  city: string;

  @ApiPropertyOptional({ example: 'Whitefield' })
  area?: string;

  @ApiProperty({ example: 300 })
  guestCount: number;

  @ApiProperty({ example: 'CONFIRMED', enum: EventStatus })
  status: EventStatus;

  @ApiProperty({ example: false })
  isExpress: boolean;

  @ApiProperty({ example: 170000 })
  totalAmount: number;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  createdAt: Date;

  // Basic venue info (safe to expose)
  @ApiPropertyOptional({ type: () => EventVenueSummaryDto })
  venue?: EventVenueSummaryDto;

  // Service count only (no sensitive data)
  @ApiPropertyOptional({ example: 3 })
  serviceCount?: number;
}

export class EventVenueSummaryDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Grand Ballroom' })
  name: string;

  @ApiProperty({ example: 'Bangalore' })
  city: string;
}

export class EventManagerSummaryDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'John Doe' })
  name: string;
}

export class PaginatedEventResponseDto {
  @ApiProperty({ type: [EventListItemResponseDto] })
  data: EventListItemResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 8 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrevious: boolean;
}
