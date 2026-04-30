import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Valid refresh token'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(512, { message: 'refreshToken must not exceed 512 characters' })
  refreshToken: string;
}

export class TokenResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token for obtaining new access tokens' })
  refreshToken: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'Token type' })
  tokenType: string = 'Bearer';
}
