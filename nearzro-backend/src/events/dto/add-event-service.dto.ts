import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEnum, 
  IsInt, 
  IsOptional, 
  IsString, 
  Min,
  Max,
} from 'class-validator';
import { ItemTypeForEvent, ServiceType } from '@prisma/client';

export class AddEventServiceDto {
  @ApiProperty({ enum: ItemTypeForEvent, example: 'VENDOR_SERVICE' })
  @IsEnum(ItemTypeForEvent, { message: 'itemType must be a valid ItemTypeForEvent' })
  itemType: ItemTypeForEvent;

  @ApiProperty({ required: false, example: 12 })
  @IsOptional()
  @IsInt({ message: 'venueId must be an integer' })
  @Min(1, { message: 'venueId must be a positive number' })
  venueId?: number;

  @ApiProperty({ required: false, example: 5 })
  @IsOptional()
  @IsInt({ message: 'vendorServiceId must be an integer' })
  @Min(1, { message: 'vendorServiceId must be a positive number' })
  vendorServiceId?: number;

  @ApiProperty({ enum: ServiceType, required: false, example: 'CATERING' })
  @IsOptional()
  @IsEnum(ServiceType, { message: 'serviceType must be a valid ServiceType' })
  serviceType?: ServiceType;

  @ApiProperty({ example: 50000 })
  @IsInt({ message: 'finalPrice must be an integer' })
  @Min(0, { message: 'finalPrice must be at least 0' })
  @Max(10000000, { message: 'finalPrice must not exceed 10000000' })
  finalPrice: number;

  @ApiProperty({ required: false, example: 'Special dietary requirements' })
  @IsOptional()
  @IsString()
  @Max(1000, { message: 'notes must not exceed 1000 characters' })
  notes?: string;
}
