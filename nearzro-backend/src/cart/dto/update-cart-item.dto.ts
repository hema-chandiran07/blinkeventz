import { IsOptional, IsInt, Min, IsObject, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.meta !== undefined)
  @IsObject()
  meta?: {
    guestCount?: number;
    area?: string;
    city?: string;
    serviceType?: string;
  };
}
