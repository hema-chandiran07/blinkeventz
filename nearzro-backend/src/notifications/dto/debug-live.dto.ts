import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEmail, IsString, Matches, MaxLength } from 'class-validator';

export class DebugLiveDto {
  @ApiProperty({
    description: 'Email address to send test email to',
    example: 'test@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiProperty({
    description: 'Phone number to send SMS and WhatsApp to (E.164 format)',
    example: '+919876543210',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  phone?: string;

  @ApiProperty({
    description: 'Message content to send',
    example: 'Test notification from NearZro',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1600, { message: 'Message must be 1600 characters or less' })
  message?: string;
}
