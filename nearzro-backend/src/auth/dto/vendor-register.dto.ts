import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
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

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceRadiusKm?: number;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  basePrice?: number;

  @ApiProperty({ example: 'PER_EVENT', enum: ['PER_EVENT', 'PER_PERSON', 'PER_DAY', 'PACKAGE'], required: false })
  @IsOptional()
  @IsString()
  pricingModel?: string;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minGuests?: number;

  @ApiProperty({ example: 200, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxGuests?: number;

  @ApiProperty({ example: 'All inclusive packages', required: false })
  @IsOptional()
  @IsString()
  inclusions?: string;

  @ApiProperty({ example: 'Travel charges extra', required: false })
  @IsOptional()
  @IsString()
  exclusions?: string;

  @ApiProperty({ example: 'AADHAAR', enum: ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE'] })
  @IsNotEmpty()
  @IsString()
  kycDocType: string;

  @ApiProperty({ example: '1234-5678-9012' })
  @IsNotEmpty()
  @IsString()
  kycDocNumber: string;
}
