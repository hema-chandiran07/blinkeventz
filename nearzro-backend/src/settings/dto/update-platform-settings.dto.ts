import { IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatformSettingsDto {
  @ApiPropertyOptional({ example: 5, description: 'Platform fee percentage (e.g., 5 for 5%)' })
  @IsOptional()
  @IsNumber()
  platformFeePercent?: number;

  @ApiPropertyOptional({ example: 18, description: 'GST percentage (e.g., 18 for 18%)' })
  @IsOptional()
  @IsNumber()
  gstPercent?: number;

  @ApiPropertyOptional({ example: 99, description: 'Express fee fixed amount in rupees' })
  @IsOptional()
  @IsNumber()
  expressFeeFixed?: number;

  @ApiPropertyOptional({ example: 10, description: 'Commission percentage (e.g., 10 for 10%)' })
  @IsOptional()
  @IsNumber()
  commissionPercent?: number;

  @ApiPropertyOptional({ example: 1, description: 'TDS percentage (e.g., 1 for 1%)' })
  @IsOptional()
  @IsNumber()
  tdsPercent?: number;
}
