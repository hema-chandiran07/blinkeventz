import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

export class CreateAIPlanDto {
  @ApiProperty({ example: 1 })
  @Min(1)
  userId: number;

  @ApiProperty({ example: 10, required: false })
  tempEventId?: number;

  @ApiProperty({ example: 500000 })
  budget: number;

  @ApiProperty({ example: 'Chennai' })
  city: string;

  @ApiProperty({ example: 'Velachery' })
  area: string;

  @ApiProperty({ example: 300 })
  guestCount: number;
}
