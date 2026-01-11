import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateAIPlanDto {
  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsInt()
  tempEventId?: number;

  @ApiProperty({ example: 500000 })
  @IsInt()
  @Min(1)
  budget: number;

  @ApiProperty({ example: 'Chennai' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Velachery' })
  @IsString()
  area: string;

  @ApiProperty({ example: 300 })
  @IsInt()
  @Min(1)
  guestCount: number;
}
