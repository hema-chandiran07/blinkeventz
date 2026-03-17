// src/payments/payments.service.ts
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProvider, PaymentStatus, CartStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private razorpay: any;
  private isMock: boolean;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('RAZORPAY_CLIENT') razorpayClient: any,
  ) {
    this.razorpay = razorpayClient;
    this.isMock = !process.env.RAZORPAY_KEY_ID ||
                  process.env.RAZORPAY_KEY_ID.includes('xxxxx') ||
                  !process.env.RAZORPAY_KEY_SECRET ||
                  process.env.RAZORPAY_KEY_SECRET.includes('xxxx');
  }

  // =============================
  // STEP 1: CREATE ORDER (with cart)
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

    // 💰 Calculate amount securely from DB using Decimal
    const zero = new Decimal(0);
    const amount = cart.items.reduce(
      (sum, item) => sum.add(new Decimal(item.totalPrice.toString())),
      zero,
    ).toNumber();

    // 🔒 Lock cart before payment
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { status: CartStatus.LOCKED },
    });

    // Create Razorpay order (or mock)
    let order;
    if (!this.isMock && this.razorpay) {
      order = await this.razorpay.orders.create({
        amount, // paise
        currency: 'INR',
        receipt: `cart_${cartId}`,
      });
    } else {
      // Mock order for development
      order = {
        id: 'order_mock_' + Date.now(),
        amount: amount,
        currency: 'INR',
      };
    }

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
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_1234567890',
      isMock: this.isMock,
    };
  }

  // =============================
  // STEP 1: CREATE ORDER (simplified - without cart)
  // =============================
  async createOrderSimple(amount: number, currency: string = 'INR', items?: any[]) {
    // Convert to paise
    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order (or mock)
    let order;
    if (!this.isMock && this.razorpay) {
      order = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: currency,
        receipt: `checkout_${Date.now()}`,
        notes: {
          items: JSON.stringify(items),
        },
      });
    } else {
      // Mock order for development
      order = {
        id: 'order_mock_' + Date.now(),
        amount: amountInPaise,
        currency: currency,
      };
    }

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_1234567890',
      isMock: this.isMock,
    };
  }

  // =============================
  // STEP 2: CONFIRM PAYMENT
  // =============================
  async confirmPayment(
    userId: number,
    dto: {
      cartId?: number;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      items?: any[];
      customerDetails?: any;
    },
  ) {
    // If cartId is provided, use existing flow
    if (dto.cartId) {
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

      // 🔐 Verify signature (skip for mock)
      if (!this.isMock) {
        const body = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
          .update(body)
          .digest('hex');

        if (expectedSignature !== dto.razorpaySignature) {
          throw new BadRequestException('Invalid payment signature');
        }
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
        isMock: this.isMock,
      };
    }

    // If no cartId, this is a simplified checkout (booking from localStorage)
    // Just verify signature and return success
    if (!this.isMock) {
      const body = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest('hex');

      if (expectedSignature !== dto.razorpaySignature) {
        throw new BadRequestException('Invalid payment signature');
      }
    }

    // Create a payment record for simplified checkout (without cart)
    // Note: We don't create a payment record here since cartId is required
    // Instead, we just return success and let the frontend handle the booking

    return {
      success: true,
      paymentId: 'simplified_checkout_' + dto.razorpayPaymentId,
      isMock: this.isMock,
    };
  }
}
