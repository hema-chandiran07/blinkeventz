import { IsInt, IsOptional, IsString, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  venueId?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  vendorId?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  eventId?: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @ApiProperty({ example: 'Great experience!', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'The venue was amazing and staff was very helpful...', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
