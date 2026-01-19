import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsObject, IsString } from 'class-validator';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';

export class CreateNotificationDto {
  @ApiProperty()
  @IsInt()
  userId: number;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel = NotificationChannel.IN_APP;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
