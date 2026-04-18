import { 
  IsNumber, 
  IsOptional, 
  IsString, 
  Min, 
  MaxLength,
  IsEnum,
  IsObject
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

/**
 * DTO for creating a payment order (with cart)
 */
export class CreatePaymentDto {
  @ApiProperty({ 
    type: Number, 
    description: 'Cart ID to pay for',
    minimum: 1 
  })
  @IsNumber({}, { message: 'Cart ID must be a number' })
  @Min(1, { message: 'Cart ID must be at least 1' })
  @Type(() => Number)
  cartId!: number;

  @ApiPropertyOptional({ 
    type: String, 
    description: 'Unique idempotency key to prevent duplicate payments',
    maxLength: 128 
  })
  @IsOptional()
  @IsString({ message: 'Idempotency key must be a string' })
  @MaxLength(128, { message: 'Idempotency key must not exceed 128 characters' })
  idempotencyKey?: string;

  @ApiPropertyOptional({ 
    type: String, 
    description: 'Client request ID for tracing',
    maxLength: 64 
  })
  @IsOptional()
  @IsString({ message: 'Request ID must be a string' })
  @MaxLength(64, { message: 'Request ID must not exceed 64 characters' })
  requestId?: string;
}

/**
 * DTO for simplified checkout (without cart - for booking flow)
 */
export class CreateSimplePaymentDto {
  @ApiProperty({ 
    type: Number, 
    description: 'Amount in rupees (not paise)',
    minimum: 1,
    example: 599.00
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(1, { message: 'Amount must be at least 1 rupee' })
  @Type(() => Number)
  amount!: number;

@ApiPropertyOptional({ 
  type: String, 
  description: 'Currency code',
  default: 'INR',
  enum: ['INR', 'USD']
})
@IsOptional()
@IsEnum(['INR', 'USD'], { message: 'Currency must be INR or USD' })
currency?: string = 'INR';

@ApiPropertyOptional({ 
  type: Number, 
  description: 'Cart ID to verify against (optional - for security verification)',
})
@IsOptional()
@IsNumber({}, { message: 'Cart ID must be a number' })
@Type(() => Number)
cartId?: number;

@ApiPropertyOptional({
    type: [Object], 
    description: 'Items being purchased' 
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
    type: String, 
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
    description: 'Unique idempotency key',
    maxLength: 128 
  })
  @IsOptional()
  @IsString({ message: 'Idempotency key must be a string' })
  @MaxLength(128)
  idempotencyKey?: string;

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
