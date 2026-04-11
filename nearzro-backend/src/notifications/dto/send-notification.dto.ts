import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationPriority, NotificationChannel } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsObject, IsString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SendNotificationDto {
  @ApiPropertyOptional({ example: 12 })
  @IsInt()
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  userId?: number;

  @ApiPropertyOptional({
    example: 'all',
    enum: ['all', 'customers', 'vendors', 'venue_owners', 'admins']
  })
  @IsString()
  @IsOptional()
  targetAudience?: 'all' | 'customers' | 'vendors' | 'venue_owners' | 'admins';

  @ApiPropertyOptional({ example: 'specific' })
  @IsString()
  @IsOptional()
  recipient?: string;

  @ApiProperty({
    enum: NotificationType,
    example: 'SYSTEM_ALERT'
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ example: 'Booking Confirmed' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Your booking is confirmed' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    enum: NotificationPriority,
    example: 'NORMAL'
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ example: { bookingId: 44, eventTitle: 'Wedding' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  @IsInt()
  eventId?: number;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    example: ['IN_APP', 'EMAIL']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];
}
