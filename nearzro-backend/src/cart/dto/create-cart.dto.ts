import { IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateCartDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;
}
