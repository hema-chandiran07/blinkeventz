// src/payments/payments.controller.ts
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/auth-request.interface';

@ApiTags('Payments')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ✅ Create payment order for logged-in user
  @Post('create-order')
  createOrder(
    @Req() req: AuthRequest,
    @Body() body: { cartId: number },
  ) {
    return this.paymentsService.createOrder(
      req.user.userId,
      body.cartId,
    );
  }

  // ✅ Confirm payment
  @Post('confirm')
  confirm(
    @Req() req: AuthRequest,
    @Body()
    body: {
      cartId: number;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    return this.paymentsService.confirmPayment(
      req.user.userId,
      body,
    );
  }
}
