import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ItemType } from '@prisma/client';

export class AddCartItemDto {
  @ApiProperty({ enum: ItemType, example: ItemType.VENDOR_SERVICE }) 
  @IsEnum(ItemType)
  itemType: ItemType;
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  vendorServiceId?: number;
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  venueId?: number;
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  addonId?: number;
  @ApiProperty({ example: 2 })
  @IsInt()
  quantity: number;
  @ApiProperty({ example: 15000 })
  @IsInt()
  unitPrice: number;
 @ApiPropertyOptional({
    example: { eventDate: '2026-02-10', notes: 'Evening slot' },
  })
  @IsOptional()
  meta?: Record<string, any>;
}
