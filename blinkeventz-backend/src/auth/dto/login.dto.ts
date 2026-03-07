import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com or username', description: 'Email address or username' })
  @IsNotEmpty()
  @IsString()
  email: string; // Can be email or username

  @ApiProperty({ example: 'SecurePass123!', required: false })
  @IsString()
  @MinLength(1)
  password?: string;
}
