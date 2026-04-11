import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, MaxLength, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVendorDto {
  @ApiProperty({
    example: 'Royal Catering Services',
    description: 'Vendor business name',
  })
  @IsNotEmpty({ message: 'businessName is required' })
  @IsString()
  @MaxLength(255, { message: 'businessName must not exceed 255 characters' })
  businessName: string;

  @ApiPropertyOptional({
    example: 'We provide premium wedding catering services',
    description: 'Optional vendor description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'description must not exceed 2000 characters' })
  description?: string;

  @ApiPropertyOptional({
    example: 'CATERING',
    description: 'Service category',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'serviceCategory must not exceed 100 characters' })
  serviceCategory?: string;

  @ApiProperty({
    example: 'Chennai',
    description: 'City where vendor operates',
  })
  @IsNotEmpty({ message: 'city is required' })
  @IsString()
  @MaxLength(100, { message: 'city must not exceed 100 characters' })
  city: string;

  @ApiProperty({
    example: 'Velachery',
    description: 'Service area',
  })
  @IsNotEmpty({ message: 'area is required' })
  @IsString()
  @MaxLength(100, { message: 'area must not exceed 100 characters' })
  area: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'phone must not exceed 20 characters' })
  phone?: string;

  @ApiPropertyOptional({
    example: 25,
    description: 'Service radius in kilometers',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'serviceRadiusKm must be greater than or equal to 0' })
  serviceRadiusKm?: number;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Owner name',
  })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiPropertyOptional({
    example: 'vendor@example.com',
    description: 'Email address',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    example: 'CATERING',
    description: 'Business type',
  })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Base price',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({
    example: 'PER_EVENT',
    description: 'Pricing model',
  })
  @IsOptional()
  @IsString()
  pricingModel?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Years of experience',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experience?: number;

  @ApiPropertyOptional({
    example: 'AADHAAR',
    description: 'KYC document type',
  })
  @IsOptional()
  @IsString()
  kycDocType?: string;

  @ApiPropertyOptional({
    example: '123456789012',
    description: 'KYC document number',
  })
  @IsOptional()
  @IsString()
  kycDocNumber?: string;
}
