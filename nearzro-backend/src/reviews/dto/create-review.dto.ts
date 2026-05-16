import { IsInt, IsOptional, IsString, Min, Max, IsNotEmpty, MaxLength } from 'class-validator';
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
  @MaxLength(255, { message: 'title must not exceed 255 characters' })
  title?: string;

  @ApiProperty({ example: 'The venue was amazing and staff was very helpful...', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: 'comment must not exceed 2000 characters' })
  comment?: string;
}
