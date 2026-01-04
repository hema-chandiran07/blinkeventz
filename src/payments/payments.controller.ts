import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments') // 👈 this is important
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  async createOrder(@Body() body: {
    userId: number;
    cartId: number;
    amount: number;
  }) {
    return this.paymentsService.createOrder(
      body.userId,
      body.cartId,
      body.amount,
    );
  }

  @Post('confirm')
  async confirm(@Body() body: {
    cartId: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    return this.paymentsService.confirmPayment(body);
  }
}
