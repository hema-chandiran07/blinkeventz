import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsInt, Min } from 'class-validator';
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

  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 800, required: false })
  @IsOptional()
  @IsString()
  capacity?: string;

  @ApiProperty({ example: 'AADHAAR', enum: ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE'] })
  @IsNotEmpty()
  @IsString()
  kycDocType: string;

  @ApiProperty({ example: '1234-5678-9012' })
  @IsNotEmpty()
  @IsString()
  kycDocNumber: string;
}
