import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UpdateUserDto - HIGH-03 Security Fix
 * 
 * Strict DTO for admin user updates. Prevents mass assignment attacks
 * by whitelisting only safe fields. Combined with global ValidationPipe
 * (whitelist: true, forbidNonWhitelisted: true), any extra fields
 * like passwordHash, googleId, facebookId will be stripped/rejected.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User display name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Whether user account is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
