import { Injectable, BadRequestException } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProvider, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay;

  constructor(private readonly prisma: PrismaService) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  // STEP 1: Create Razorpay Order
  async createOrder(userId: number, cartId: number, amount: number) {
    // amount must be in paise
    const order = await this.razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `cart_${cartId}`,
    });

    await this.prisma.payment.create({
      data: {
        userId,
        cartId,
        provider: PaymentProvider.RAZORPAY,
        providerOrderId: order.id,
        amount,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
    };
  }

  // STEP 2: Confirm Payment
  async confirmPayment(dto: {
    cartId: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const body = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.prisma.payment.update({
      where: {
        providerOrderId: dto.razorpayOrderId,
      },
      data: {
        providerPaymentId: dto.razorpayPaymentId,
        signature: dto.razorpaySignature,
        status: PaymentStatus.SUCCESS,
      },
    });

    // IMPORTANT: cart completion will be done by Dev A (Events module)
    return {
      success: true,
      paymentId: payment.id,
    };
  }
}
