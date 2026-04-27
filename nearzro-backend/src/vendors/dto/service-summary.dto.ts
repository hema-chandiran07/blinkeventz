import { ApiProperty } from '@nestjs/swagger';

export class ServiceSummaryDto {
  @ApiProperty({ description: 'Service ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Service name', example: 'Wedding Photography' })
  name: string;

  @ApiProperty({ description: 'Average rating from reviews (0-5)', example: 4.8 })
  rating: number;

  @ApiProperty({ description: 'Thumbnail image URL', example: 'https://example.com/service.jpg' })
  thumbnailUrl: string;

  @ApiProperty({ description: 'Base rate (in paise)', example: 50000 })
  priceFrom: number;
}
