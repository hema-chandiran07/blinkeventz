import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateVendorDto {
  @IsInt()
  userId: number;

  @IsString()
  businessName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  city: string;

  @IsString()
  area: string;

  @IsOptional()
  @IsInt()
  serviceRadiusKm?: number;
}
