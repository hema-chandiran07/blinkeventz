import { 
  IsNumber, 
  IsOptional, 
  IsString, 
  Min, 
  MaxLength,
  IsObject
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

/**
 * DTO for confirming a payment (client-side confirmation)
 * Note: This is a fallback - webhook is the primary source of truth
 */
export class ConfirmPaymentDto {
  @ApiPropertyOptional({ 
    type: Number, 
    description: 'Cart ID (required for cart-based payments)',
    minimum: 1
  })
  @IsOptional()
  @IsNumber({}, { message: 'Cart ID must be a number' })
  @Min(1, { message: 'Cart ID must be at least 1' })
  @Type(() => Number)
  cartId?: number;

  @ApiProperty({ 
    type: String, 
    description: 'Razorpay order ID',
    example: 'order_xxxxxxxxxxxxx'
  })
  @IsString({ message: 'Razorpay order ID must be a string' })
  @MaxLength(100, { message: 'Razorpay order ID must not exceed 100 characters' })
  razorpayOrderId: string;

  @ApiProperty({ 
    type: String, 
    description: 'Razorpay payment ID',
    example: 'pay_xxxxxxxxxxxxx'
  })
  @IsString({ message: 'Razorpay payment ID must be a string' })
  @MaxLength(100, { message: 'Razorpay payment ID must not exceed 100 characters' })
  razorpayPaymentId: string;

  @ApiProperty({ 
    type: String, 
    description: 'Razorpay signature for verification',
    example: 'a9f28d8b9c4...'
  })
  @IsString({ message: 'Razorpay signature must be a string' })
  @MaxLength(500, { message: 'Razorpay signature must not exceed 500 characters' })
  razorpaySignature: string;

  @ApiPropertyOptional({ 
    type: [Object], 
    description: 'Items (for simplified checkout)',
  })
  @IsOptional()
  @IsObject({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  items?: any[];

  @ApiPropertyOptional({ 
    type: Object, 
    description: 'Customer details',
  })
  @IsOptional()
  @IsObject()
  customerDetails?: {
    name?: string;
    email?: string;
    phone?: string;
  };

  @ApiPropertyOptional({ 
    type: String, 
    description: 'Client request ID for tracing',
    maxLength: 64 
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  requestId?: string;
}
