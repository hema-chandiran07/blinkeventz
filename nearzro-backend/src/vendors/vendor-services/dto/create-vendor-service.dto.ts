import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, MaxLength, ValidateIf } from 'class-validator';
import { ServiceType, VendorPricingModel } from '@prisma/client';

export class CreateVendorServiceDto {
  @ApiProperty({ example: 'Wedding Photography' })
  @IsString()
  @MaxLength(255, { message: 'name must not exceed 255 characters' })
  name: string;

  @ApiProperty({ enum: ServiceType, example: ServiceType.PHOTOGRAPHY })
  @IsEnum(ServiceType, { message: 'Invalid service type' })
  serviceType: ServiceType;

  @ApiProperty({ enum: VendorPricingModel, example: VendorPricingModel.PER_EVENT })
  @IsEnum(VendorPricingModel, { message: 'Invalid pricing model' })
  pricingModel: VendorPricingModel;

  @ApiProperty({ example: 50000 })
  @IsInt()
  @Min(0, { message: 'baseRate must be greater than or equal to 0' })
  baseRate: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'minGuests must be greater than or equal to 0' })
  minGuests?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'maxGuests must be greater than or equal to 0' })
  maxGuests?: number;

  @ApiPropertyOptional({ example: 'Full day coverage' })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'description must not exceed 2000 characters' })
  description?: string;

  @ApiPropertyOptional({ example: 'Album, drone shots' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'inclusions must not exceed 1000 characters' })
  inclusions?: string;

  @ApiPropertyOptional({ example: 'Travel charges excluded' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'exclusions must not exceed 1000 characters' })
  exclusions?: string;

  // Custom validator for minGuests <= maxGuests
  // This needs to be validated at the service level since class-validator
  // doesn't have a built-in comparison validator for different fields
}
