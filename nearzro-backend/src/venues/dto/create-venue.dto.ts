import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsNumber, IsNumberString } from 'class-validator';
import { VenueType } from '@prisma/client';

export class CreateVenueDto {
  @ApiProperty({ example: 'Royal Palace', default: 'My Venue' })
  @IsString()
  name: string = 'My Venue';

  @ApiProperty({ enum: VenueType, example: VenueType.BANQUET })
  @IsEnum(VenueType)
  type!: VenueType;

  @ApiProperty({ example: 'Luxury wedding venue', default: '' })
  @IsString()
  description: string = '';

  @ApiProperty({ example: 'MG Road', default: '' })
  @IsString()
  address: string = '';

  @ApiProperty({ example: 'Bangalore', default: 'Unknown City' })
  @IsString()
  city: string = 'Unknown City';

  @ApiProperty({ example: 'Indiranagar', default: '' })
  @IsString()
  area: string = '';

  @ApiProperty({ example: '560038', default: '000000' })
  @IsString()
  pincode: string = '000000';

  @ApiProperty({ example: 100, required: false })
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  capacityMin?: number;

  @ApiProperty({ example: 500, required: false })
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  capacityMax?: number;

  @ApiProperty({ example: 50000, required: false })
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  basePriceMorning?: number;

  @ApiProperty({ example: 80000, required: false })
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  basePriceEvening?: number;

  @ApiProperty({ example: 120000, required: false })
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  basePriceFullDay?: number;

  @ApiProperty({
    example: 'Parking, AC, Power backup',
    default: '',
    required: false,
  })
  @IsOptional()
  @IsString()
  amenities?: string = '';

  @ApiProperty({
    example: 'No smoking allowed',
    default: '',
    required: false,
  })
  @IsOptional()
  @IsString()
  policies?: string = '';

  @ApiPropertyOptional({
    example: 'ABCD1234E',
    description: 'KYC document number',
  })
  @IsOptional()
  @IsString()
  kycDocNumber?: string;

  @ApiPropertyOptional({
    enum: ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE'],
    example: 'AADHAAR',
    description: 'KYC document type',
  })
  @IsOptional()
  @IsString()
  kycDocType?: string;
}
