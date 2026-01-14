import { IsEnum, IsInt } from 'class-validator';
import { ExpressPlanType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateExpressDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  EventId: number;
  @ApiProperty({ enum: ExpressPlanType, example: ExpressPlanType.FIXED })
  @IsEnum(ExpressPlanType)
  planType: ExpressPlanType;
}
