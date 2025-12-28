import { IsEnum, IsInt } from 'class-validator';
import { ExpressPlanType } from '@prisma/client';

export class CreateExpressDto {
  @IsInt()
  tempEventId: number;

  @IsEnum(ExpressPlanType)
  planType: ExpressPlanType;
}
