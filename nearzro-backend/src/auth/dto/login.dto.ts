import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ 
    example: 'john@example.com or username', 
    description: 'Email address or username' 
  })
  @IsNotEmpty({ message: 'Email/username is required' })
  @IsString()
  @MinLength(3, { message: 'Email/username must be at least 3 characters' })
  @MaxLength(255, { message: 'Email/username must not exceed 255 characters' })
  email: string; // Can be email or username

  @ApiProperty({ 
    example: 'SecurePass123!', 
    description: 'User password'
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;
}
