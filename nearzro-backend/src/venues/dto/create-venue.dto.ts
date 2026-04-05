import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsNumber, IsInt, Min, MaxLength, IsNotEmpty } from 'class-validator';
import { VenueType } from '@prisma/client';

export class CreateVenueDto {
  @ApiProperty({ example: 'Royal Palace', default: 'My Venue' })
  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: VenueType, example: VenueType.BANQUET })
  @IsEnum(VenueType)
  type!: VenueType;

  @ApiProperty({ example: 'Luxury wedding venue', default: '' })
  @IsString()
  @MaxLength(2000)
  description: string = '';

  @ApiProperty({ example: 'MG Road', default: '' })
  @IsString()
  @MaxLength(500)
  address: string = '';

  @ApiProperty({ example: 'Bangalore', default: 'Unknown City' })
  @IsString()
  @MaxLength(100)
  city: string = 'Unknown City';

  @ApiProperty({ example: 'Indiranagar', default: '' })
  @IsString()
  @MaxLength(100)
  area: string = '';

  @ApiProperty({ example: '560038', default: '000000' })
  @IsString()
  @MaxLength(10)
  pincode: string = '000000';

  @ApiProperty({ example: 100, required: false })
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityMin?: number;

  @ApiProperty({ example: 500, required: false })
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityMax?: number;

  @ApiProperty({ example: 50000, required: false })
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePriceMorning?: number;

  @ApiProperty({ example: 80000, required: false })
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePriceEvening?: number;

  @ApiProperty({ example: 120000, required: false })
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePriceFullDay?: number;

  @ApiPropertyOptional({
    example: 'Parking, AC, Power backup',
    default: '',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  amenities?: string = '';

  @ApiPropertyOptional({
    example: 'No smoking allowed',
    default: '',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  policies?: string = '';

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: 'AADHAAR',
    description: 'KYC document type',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  kycDocType?: string;

  @ApiPropertyOptional({
    example: '123456789012',
    description: 'KYC document number (validated by regex)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  kycDocNumber?: string;

  // Files - handled by interceptor
  // venueImages, kycDocFiles, venueGovtCertificateFiles are handled via @UploadedFiles()
}