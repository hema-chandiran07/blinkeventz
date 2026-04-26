import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsArray, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationPriority } from '@prisma/client';

export class ComposeMessageDto {
  @ApiProperty({
    description: 'User ID to send the message to',
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'Message subject/title',
    example: 'Important Update',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Message body content',
    example: 'Your account has been updated successfully.',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Priority level of the message',
    enum: NotificationPriority,
    example: 'NORMAL',
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Channels to send the message through',
    enum: ['IN_APP', 'EMAIL'],
    isArray: true,
    example: ['IN_APP', 'EMAIL'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { bookingId: 44, action: 'confirm' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
