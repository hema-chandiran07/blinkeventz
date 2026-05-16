import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsNotEmpty, Min, MaxLength, IsArray, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';
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
  @Matches(/^[0-9]{6,10}$/, { message: 'pincode must be 6-10 digits' })
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
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value;
  })
  @IsString()
  @MaxLength(1000)
  amenities?: string = '';

  @ApiPropertyOptional({
    example: ['uploads/venue-image-123.jpg', 'uploads/venue-image-456.jpg'],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  venueImages?: string[] = [];

  @ApiPropertyOptional({
    example: ['uploads/kyc-doc.pdf'],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kycDocFiles?: string[] = [];

  @ApiPropertyOptional({
    example: ['uploads/govt-cert.pdf'],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  venueGovtCertificateFiles?: string[] = [];

  @ApiPropertyOptional({
    example: 'No smoking allowed',
    default: '',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  policies?: string = '';
}
