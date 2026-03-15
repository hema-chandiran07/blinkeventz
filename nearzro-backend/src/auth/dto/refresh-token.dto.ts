import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Valid refresh token'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
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
