import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';
import { KycDocType } from '@prisma/client';

export class VendorRegisterDto extends RegisterDto {
  @ApiProperty({ example: 'Elite Photography' })
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @ApiProperty({ example: 'PHOTOGRAPHY' })
  @IsNotEmpty()
  @IsString()
  businessType: string;

  @ApiProperty({ example: 'Professional photography services for weddings and events...' })
  @IsNotEmpty()
  @IsString()
  @MinLength(20)
  description: string;

  @ApiProperty({ example: 'Chennai' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'T Nagar' })
  @IsNotEmpty()
  @IsString()
  area: string;

  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  serviceRadiusKm?: number;

  @ApiProperty({ example: 'AADHAAR', enum: ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE'] })
  @IsNotEmpty()
  @IsString()
  kycDocType: string;

  @ApiProperty({ example: '1234-5678-9012' })
  @IsNotEmpty()
  @IsString()
  kycDocNumber: string;
}
