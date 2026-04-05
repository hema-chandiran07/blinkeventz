import { IsEmail, IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class SendPhoneOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^[0-9+]+$/, { message: 'Phone number must contain only numbers and an optional + prefix' })
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp!: string;
}

export class VerifyPhoneOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'OTP is required' })
  @IsString()
  otp!: string;
}