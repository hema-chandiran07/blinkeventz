import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ItemType } from '@prisma/client';

export class AddCartItemDto {
  @IsEnum(ItemType)
  itemType: ItemType;

  @IsOptional()
  vendorServiceId?: number;

  @IsOptional()
  venueId?: number;

  @IsOptional()
  addonId?: number;

  @IsInt()
  quantity: number;

  @IsInt()
  unitPrice: number;

  @IsOptional()
  meta?: Record<string, any>;
}
