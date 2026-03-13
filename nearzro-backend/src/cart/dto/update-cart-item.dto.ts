import { IsOptional, IsInt, Min, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  meta?: {
    guestCount?: number;
    area?: string;
    city?: string;
    serviceType?: string;
  };
}
