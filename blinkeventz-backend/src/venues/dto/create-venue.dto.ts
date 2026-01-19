import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { VenueType } from '@prisma/client';

export class CreateVenueDto {
  @ApiProperty({ example: 'Royal Palace', default: 'My Venue' })
  @IsString()
  name: string = 'My Venue';

  @ApiProperty({ enum: VenueType, example: VenueType.BANQUET })
  @IsEnum(VenueType)
  type: VenueType;

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

  @ApiProperty({ example: 100, default: 50 })
  @IsNumber()
  capacityMin: number = 50;

  @ApiProperty({ example: 500, default: 200 })
  @IsNumber()
  capacityMax: number = 200;

  @ApiProperty({ example: 50000, default: 0 })
  @IsNumber()
  basePriceMorning: number = 0;

  @ApiProperty({ example: 80000, default: 0 })
  @IsNumber()
  basePriceEvening: number = 0;

  @ApiProperty({ example: 120000, default: 0 })
  @IsNumber()
  basePriceFullDay: number = 0;

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
}
