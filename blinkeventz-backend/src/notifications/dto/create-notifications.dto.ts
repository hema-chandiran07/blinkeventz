import { IsEnum, IsInt, IsOptional, IsObject, IsString } from 'class-validator';
import {NotificationType, NotificationChannel,  NotificationPriority,} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  userId: number;

  @IsEnum(NotificationType)
  @ApiProperty({ enum: NotificationType, example: 'BOOKING_CONFIRMED' })
  type: NotificationType;

  @IsString()
  @ApiPropertyOptional({ example: 'Booking Confirmed' })
  title: string;

  @IsString()
  @ApiPropertyOptional({ example: 'Your booking is confirmed' })
  message: string;

  @IsOptional()
  @ApiPropertyOptional({ enum: NotificationPriority })
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority = NotificationPriority.NORMAL;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({
    example: { bookingId: 44 }
  })
  metadata?: Record<string, any>;

  @IsOptional()
  @ApiPropertyOptional({ example: 9 })
  eventId?: number;
}
