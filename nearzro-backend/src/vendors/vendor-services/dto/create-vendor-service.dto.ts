import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsBoolean, Min, MaxLength, ValidateIf, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
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
  @Transform(({ value }) => value === '' ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsInt()
  @Min(0, { message: 'baseRate must be greater than or equal to 0' })
  baseRate: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Transform(({ value }) => value === '' || value === undefined ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
  @IsInt()
  @Min(0, { message: 'minGuests must be greater than or equal to 0' })
  minGuests?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Transform(({ value }) => value === '' || value === undefined ? undefined : (isNaN(Number(value)) ? undefined : Number(value)))
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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  // Custom validator for minGuests <= maxGuests
  // This needs to be validated at the service level since class-validator
  // doesn't have a built-in comparison validator for different fields
}
