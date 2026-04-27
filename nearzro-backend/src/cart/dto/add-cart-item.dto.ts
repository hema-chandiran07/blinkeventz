import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemType } from '@prisma/client';

export class AddCartItemDto {
  @ApiProperty({ enum: ['VENUE', 'VENDOR_SERVICE', 'ADDON'], enumName: 'ItemType' })
  @IsNotEmpty()
  @IsString()
  itemType: string;

  @ApiProperty({ description: 'Venue ID - required if itemType is VENUE' })
  @ValidateIf((o) => o.itemType === 'VENUE')
  @IsInt()
  @Min(1)
  venueId?: number;

  @ApiProperty({ description: 'Vendor Service ID - required if itemType is VENDOR_SERVICE' })
  @ValidateIf((o) => o.itemType === 'VENDOR_SERVICE')
  @IsInt()
  @Min(1)
  vendorServiceId?: number;

  @ApiProperty({ description: 'Addon ID - required if itemType is ADDON' })
  @ValidateIf((o) => o.itemType === 'ADDON')
  @IsInt()
  @Min(1)
  addonId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ enum: ['MORNING', 'EVENING', 'FULL_DAY'], required: false })
  @IsOptional()
  @IsString()
  timeSlot?: 'MORNING' | 'EVENING' | 'FULL_DAY';

  @ApiProperty({ required: false, default: 1, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number = 1;

  @ApiPropertyOptional({ description: 'Additional metadata for PER_PERSON pricing' })
  @IsOptional()
  meta?: {
    guestCount?: number;
    area?: string;
    city?: string;
    serviceType?: string;
    startTime?: string;
    endTime?: string;
    isExpress?: boolean;
  };
}
