import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateVendorDto {
   @ApiProperty({
    example: 12,
    description: 'User ID of the vendor (must be an existing user)',
  })

 @ApiProperty({
    example: 'Royal Catering Services',
    description: 'Vendor business name',
  })
  @IsString()
  businessName: string;
 @ApiPropertyOptional({
    example: 'We provide premium wedding catering services',
    description: 'Optional vendor description',
  })
  @IsOptional()
  @IsString()
  description?: string;
@ApiProperty({
    example: 'Chennai',
    description: 'City where vendor operates',
  })
  @IsString()
  city: string;
 @ApiProperty({
    example: 'Velachery',
    description: 'Service area',
  })
  @IsString()
  area: string;
@ApiPropertyOptional({
    example: 25,
    description: 'Service radius in kilometers',
  })
  @IsOptional()
  @IsInt()
  serviceRadiusKm?: number;
}