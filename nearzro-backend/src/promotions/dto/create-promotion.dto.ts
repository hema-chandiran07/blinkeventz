import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Welcome discount for new users', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FLAT'] })
  @IsString()
  @IsEnum(['PERCENTAGE', 'FLAT'])
  @IsNotEmpty()
  discountType: string;

  @ApiProperty({ example: 10, description: '10 for 10% or 100 for ₹100' })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  discountValue: number;

  @ApiProperty({ example: 1000, description: 'Minimum cart value in INR', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  minCartValue?: number;

  @ApiProperty({ example: 500, description: 'Maximum discount cap in INR', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxDiscount?: number;

  @ApiProperty({ example: '2026-01-01' })
  @IsString()
  @IsNotEmpty()
  validFrom: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsString()
  @IsNotEmpty()
  validUntil: string;

  @ApiProperty({ example: 1000, description: 'Total usage limit', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  usageLimit?: number;

  @ApiProperty({ default: true })
  @IsOptional()
  isActive?: boolean = true;
}
