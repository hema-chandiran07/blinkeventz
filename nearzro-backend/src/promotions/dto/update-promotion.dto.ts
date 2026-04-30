import { PartialType } from '@nestjs/swagger';
import { CreatePromotionDto } from './create-promotion.dto';
import { IsOptional, IsNumber } from 'class-validator';

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {
  @IsOptional()
  @IsNumber()
  vendorId?: number;
}
