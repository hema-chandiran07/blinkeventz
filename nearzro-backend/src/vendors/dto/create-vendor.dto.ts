import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({
    example: 'Royal Catering Services',
    description: 'Vendor business name',
  })
  @IsNotEmpty({ message: 'businessName is required' })
  @IsString()
  @MaxLength(255, { message: 'businessName must not exceed 255 characters' })
  businessName: string;

  @ApiPropertyOptional({
    example: 'We provide premium wedding catering services',
    description: 'Optional vendor description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'description must not exceed 2000 characters' })
  description?: string;

  @ApiProperty({
    example: 'Chennai',
    description: 'City where vendor operates',
  })
  @IsNotEmpty({ message: 'city is required' })
  @IsString()
  @MaxLength(100, { message: 'city must not exceed 100 characters' })
  city: string;

  @ApiProperty({
    example: 'Velachery',
    description: 'Service area',
  })
  @IsNotEmpty({ message: 'area is required' })
  @IsString()
  @MaxLength(100, { message: 'area must not exceed 100 characters' })
  area: string;

  @ApiPropertyOptional({
    example: 25,
    description: 'Service radius in kilometers',
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'serviceRadiusKm must be greater than or equal to 0' })
  serviceRadiusKm?: number;
}
