import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ItemTypeForEvent, ServiceType } from '@prisma/client';

export class AddEventServiceDto {
  @ApiProperty({ enum: ItemTypeForEvent })
  @IsEnum(ItemTypeForEvent)
  itemType: ItemTypeForEvent;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  venueId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  vendorServiceId?: number;

  @ApiProperty({ enum: ServiceType, required: false })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiProperty({ example: 50000 })
  @IsInt()
  finalPrice: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
