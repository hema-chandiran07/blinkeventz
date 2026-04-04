import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class VenueOwnerRegisterDto extends RegisterDto {
  @ApiProperty({ example: 'Grand Ballroom ITC' })
  @IsNotEmpty()
  @IsString()
  venueName: string;

  @ApiProperty({ example: 'BANQUET_HALL' })
  @IsNotEmpty()
  @IsString()
  venueType: string;

  @ApiProperty({ example: 'Luxury banquet hall perfect for weddings and corporate events...' })
  @IsNotEmpty()
  @IsString()
  @MinLength(20)
  description: string;

  @ApiProperty({ example: 'Chennai' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'Guindy' })
  @IsNotEmpty()
  @IsString()
  area: string;

  @ApiProperty({ example: '123 Main Street, Guindy' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: '600001' })
  @IsNotEmpty()
  @IsString()
  pincode: string;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacityMin?: number;

  @ApiProperty({ example: 500, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacityMax?: number;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePriceMorning?: number;

  @ApiProperty({ example: 75000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePriceEvening?: number;

  @ApiProperty({ example: 120000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePriceFullDay?: number;

  @ApiProperty({ example: 'AADHAAR', enum: ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE'] })
  @IsNotEmpty()
  @IsString()
  kycDocType: string;

  @ApiProperty({ example: '1234-5678-9012' })
  @IsNotEmpty()
  @IsString()
  kycDocNumber: string;
}
