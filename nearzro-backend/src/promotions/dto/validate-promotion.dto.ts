import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidatePromotionDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 5000, description: 'Current cart value in INR', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  cartValue?: number;
}
