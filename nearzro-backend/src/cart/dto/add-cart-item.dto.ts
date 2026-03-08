import { IsNotEmpty, IsString, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({ enum: ['VENUE', 'VENDOR_SERVICE', 'ADDON'] })
  @IsNotEmpty()
  @IsString()
  itemType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  venueId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  vendorServiceId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  addonId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ enum: ['MORNING', 'EVENING', 'FULL_DAY'], required: false })
  @IsOptional()
  @IsString()
  timeSlot?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  meta?: {
    guestCount?: number;
    area?: string;
    city?: string;
    serviceType?: string;
  };
}
