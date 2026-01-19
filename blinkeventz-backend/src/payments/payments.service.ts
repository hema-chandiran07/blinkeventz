// src/payments/payments.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProvider, PaymentStatus, CartStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay;

  constructor(private readonly prisma: PrismaService) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  // =============================
  // STEP 1: CREATE ORDER
  // =============================
  async createOrder(userId: number, cartId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart || cart.userId !== userId) {
      throw new BadRequestException('Invalid cart');
    }

    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException('Cart is not active');
    }

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 💰 Calculate amount securely from DB
    const amount = cart.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );

    // 🔒 Lock cart before payment
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { status: CartStatus.LOCKED },
    });

    const order = await this.razorpay.orders.create({
      amount, // paise
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

  // =============================
  // STEP 2: CONFIRM PAYMENT
  // =============================
  async confirmPayment(
    userId: number,
    dto: {
      cartId: number;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerOrderId: dto.razorpayOrderId },
      include: { cart: true },
    });

    if (!payment || payment.userId !== userId) {
      throw new BadRequestException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Payment already completed');
    }

    // 🔐 Verify signature
    const body = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    // ✅ Update payment
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: dto.razorpayPaymentId,
        signature: dto.razorpaySignature,
        status: PaymentStatus.SUCCESS,
      },
    });

    // ✅ Complete cart
    await this.prisma.cart.update({
      where: { id: payment.cartId },
      data: { status: CartStatus.COMPLETED },
    });

    return {
      success: true,
      paymentId: payment.id,
    };
  }
}
