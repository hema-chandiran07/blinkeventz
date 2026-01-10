import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ServiceType, VendorPricingModel } from '@prisma/client';

export class CreateVendorServiceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  vendorId: number;
  @ApiProperty({ example: 'Wedding Photography' })
  @IsString()
  name: string;
  @ApiProperty({ enum: ServiceType, example: ServiceType.PHOTOGRAPHY })
  @IsEnum(ServiceType)
  serviceType: ServiceType;
  @ApiProperty({ enum: VendorPricingModel, example: VendorPricingModel.PER_EVENT })
  @IsEnum(VendorPricingModel)
  pricingModel: VendorPricingModel;
  @ApiProperty({ example: 50000 })
  @IsInt()
  baseRate: number;
  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  minGuests?: number;
  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  maxGuests?: number;
  @ApiPropertyOptional({ example: 'Full day coverage' })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ example: 'Album, drone shots' })
  @IsOptional()
  @IsString()
  inclusions?: string;
  @ApiPropertyOptional({ example: 'Travel charges excluded' })
  @IsOptional()
  @IsString()
  exclusions?: string;
}
