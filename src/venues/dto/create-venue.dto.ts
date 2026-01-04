import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { VenueType } from '@prisma/client';

export class CreateVenueDto {
  @IsString()
  name: string;

  @IsEnum(VenueType)
  type: VenueType;

  @IsString()
  description: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  area: string;

  @IsString()
  pincode: string;

  @IsNumber()
  capacityMin: number;

  @IsNumber()
  capacityMax: number;

  @IsNumber()
  basePriceMorning: number;

  @IsNumber()
  basePriceEvening: number;

  @IsNumber()
  basePriceFullDay: number;

  @IsOptional()
  @IsString()
  amenities?: string;   // ✅ STRING

  @IsOptional()
  @IsString()
  policies?: string;
}
