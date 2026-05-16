import { IsOptional, IsInt, Min, Max, IsObject, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
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
