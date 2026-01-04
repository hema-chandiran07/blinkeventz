import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ServiceType, VendorPricingModel } from '@prisma/client';

export class CreateVendorServiceDto {
  @IsInt()
  vendorId: number;

  @IsString()
  name: string;

  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsEnum(VendorPricingModel)
  pricingModel: VendorPricingModel;

  @IsInt()
  baseRate: number;

  @IsOptional()
  @IsInt()
  minGuests?: number;

  @IsOptional()
  @IsInt()
  maxGuests?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  inclusions?: string;

  @IsOptional()
  @IsString()
  exclusions?: string;
}
