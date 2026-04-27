import { ApiProperty } from '@nestjs/swagger';

export class VendorSummaryDto {
  @ApiProperty({ description: 'Vendor ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Business name', example: 'John Photography' })
  name: string;

  @ApiProperty({ description: 'Average rating from reviews (0-5)', example: 4.5 })
  rating: number;

  @ApiProperty({ description: 'Thumbnail image URL', example: 'https://example.com/image.jpg' })
  thumbnailUrl: string;

  @ApiProperty({ description: 'Starting price (in paise)', example: 50000, nullable: true })
  priceFrom: number | null;
}
