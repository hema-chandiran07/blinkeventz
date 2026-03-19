import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentProvider } from '@prisma/client';

/**
 * Response DTO for payment order creation
 */
export class PaymentOrderResponseDto {
  @ApiProperty({ 
    type: String, 
    description: 'Razorpay order ID',
    example: 'order_xxxxxxxxxxxxx'
  })
  id: string;

  @ApiProperty({ 
    type: Number, 
    description: 'Amount in paise',
    example: 59900
  })
  amount: number;

  @ApiProperty({ 
    type: String, 
    description: 'Currency code',
    example: 'INR'
  })
  currency: string;

  @ApiProperty({ 
    type: String, 
    description: 'Razorpay key ID for client-side integration',
    example: 'rzp_test_xxxxxxxxxxxxx'
  })
  razorpayKey: string;

  @ApiProperty({ 
    type: String, 
    description: 'Internal payment ID',
    example: '1'
  })
  paymentId: string;

  @ApiProperty({ 
    type: String, 
    description: 'Payment order receipt',
    example: 'cart_1'
  })
  receipt: string;

  @ApiPropertyOptional({ 
    type: Date, 
    description: 'Payment expiry timestamp'
  })
  expiresAt?: Date;

  @ApiProperty({ 
    type: Boolean, 
    description: 'Whether running in mock mode (development only)',
    example: false
  })
  isMock: boolean;

  @ApiPropertyOptional({ 
    type: String, 
    description: 'Request ID for tracing'
  })
  requestId?: string;
}

/**
 * Response DTO for payment confirmation
 */
export class PaymentConfirmResponseDto {
  @ApiProperty({ 
    type: Boolean, 
    description: 'Whether confirmation was successful',
    example: true
  })
  success: boolean;

  @ApiProperty({ 
    type: String, 
    description: 'Payment ID',
    example: '1'
  })
  paymentId: string;

  @ApiProperty({ 
    type: String, 
    description: 'Payment status',
    enum: PaymentStatus,
    example: 'CAPTURED'
  })
  status: PaymentStatus;

  @ApiProperty({ 
    type: String, 
    description: 'Razorpay payment ID',
    example: 'pay_xxxxxxxxxxxxx'
  })
  razorpayPaymentId?: string;

  @ApiPropertyOptional({ 
    type: String, 
    description: 'Message',
    example: 'Payment confirmed successfully'
  })
  message?: string;

  @ApiProperty({ 
    type: Boolean, 
    description: 'Whether running in mock mode',
    example: false
  })
  isMock: boolean;
}

/**
 * Response DTO for payment status check
 */
export class PaymentStatusResponseDto {
  @ApiProperty({ type: String })
  paymentId: string;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty({ type: String })
  providerOrderId: string;

  @ApiPropertyOptional({ type: String })
  providerPaymentId?: string;

  @ApiProperty({ type: Number })
  amount: number;

  @ApiProperty({ type: String })
  currency: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiPropertyOptional({ type: Date })
  completedAt?: Date;
}
