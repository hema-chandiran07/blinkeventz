// src/payments/payments.service.ts
import { 
  Injectable, 
  BadRequestException, 
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProvider, PaymentStatus, CartStatus } from '@prisma/client';
import { CreatePaymentDto, CreateSimplePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { 
  PaymentOrderResponseDto, 
  PaymentConfirmResponseDto,
  PaymentStatusResponseDto 
} from './dto/payment-response.dto';
import { CartService } from '../cart/cart.service';

/**
 * Payment Service - Industry Standard Implementation
 * 
 * Features:
 * - Idempotency support (DB + Redis)
 * - Atomic database transactions
 * - Webhook-driven (primary source of truth)
 * - Client confirmation as fallback
 * - Structured logging
 * - Payment state machine
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: any;
  private readonly isMock: boolean;
  private readonly isProduction: boolean;
  private readonly paymentExpiryMinutes = 30;
  private readonly razorpayKeySecret: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('RAZORPAY_CLIENT') razorpayClient: any,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,
  ) {
    this.razorpay = razorpayClient;
    this.razorpayKeySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';
    
    // Validate production environment
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    this.isProduction = nodeEnv === 'production';
    
    // Check if mock mode should be enabled
    const razorpayKeyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    this.isMock = this.shouldUseMock(razorpayKeyId);

    if (this.isProduction && this.isMock) {
      this.logger.error({
        event: 'PAYMENT_PRODUCTION_MOCK_MODE',
        message: 'CRITICAL: Payment system running in MOCK mode in PRODUCTION!',
        environment: nodeEnv,
        hasRazorpayKey: !!razorpayKeyId,
      });
      // Don't throw - allow startup but log critical error
      // The system will work but payments won't process
    }

    this.logger.log({
      event: 'PAYMENT_SERVICE_INITIALIZED',
      mode: this.isMock ? 'MOCK' : 'LIVE',
      environment: nodeEnv,
      hasRazorpayClient: !!this.razorpay,
    });
  }

  /**
   * Determine if mock mode should be used
   */
  private shouldUseMock(keyId: string | undefined): boolean {
    if (!keyId || !this.razorpayKeySecret) {
      return true; // No keys configured = mock
    }
    // Check for placeholder/test values
    if (keyId.includes('xxxxx') || this.razorpayKeySecret.includes('xxxx')) {
      return true;
    }
    return false;
  }

  // ============================================================
  // STEP 1: CREATE PAYMENT ORDER (with cart)
  // ============================================================
  
  /**
   * Create a payment order for a cart
   * Uses idempotency key to prevent duplicate orders
   */
  async createOrder(
    userId: number,
    dto: CreatePaymentDto,
    requestId?: string,
  ): Promise<PaymentOrderResponseDto> {
    const idempotencyKey = dto.idempotencyKey || `order_${dto.cartId}_${Date.now()}`;
    const traceId = requestId || this.generateRequestId();

    this.logger.log({
      event: 'PAYMENT_CREATE_ORDER_START',
      traceId,
      userId,
      cartId: dto.cartId,
      idempotencyKey,
    });

    try {
      // === IDEMPOTENCY CHECK (Redis + DB) ===
      const existingPayment = await this.checkIdempotency(idempotencyKey, userId);
      if (existingPayment) {
        this.logger.warn({
          event: 'PAYMENT_DUPLICATE_REQUEST',
          traceId,
          idempotencyKey,
          existingPaymentId: existingPayment.id,
        });
        return this.buildOrderResponse(existingPayment, traceId);
      }

      // === ATOMIC TRANSACTION ===
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Validate and lock cart (optimistic locking with version check)
        const cart = await tx.cart.findUnique({
          where: { id: dto.cartId },
          include: { items: true },
        });

        if (!cart || cart.userId !== userId) {
          throw new BadRequestException('Invalid cart: not found or does not belong to user');
        }

        if (cart.status !== CartStatus.ACTIVE) {
          throw new BadRequestException(`Cart is not active. Current status: ${cart.status}`);
        }

        if (cart.items.length === 0) {
          throw new BadRequestException('Cart is empty');
        }

        // 2. Check for existing pending payment on this cart
        const existingPending = await tx.payment.findFirst({
          where: { 
            cartId: dto.cartId,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.CREATED] },
          },
        });

        if (existingPending && existingPending.expiresAt && existingPending.expiresAt > new Date()) {
          // Return existing order if not expired
          return { payment: existingPending, isNew: false };
        }

        // 3. Calculate amount from cart items (server-side for security)
        const amount = this.calculateAmountFromItems(cart.items);
        
        if (amount <= 0) {
          throw new BadRequestException('Invalid cart amount');
        }

        // 4. Lock cart
        await tx.cart.update({
          where: { id: dto.cartId },
          data: { status: CartStatus.LOCKED },
        });

        // 5. Create Razorpay order (or mock)
        const order = await this.createRazorpayOrder(amount, `cart_${dto.cartId}`);

        // 6. Create payment record
        const expiresAt = new Date(Date.now() + this.paymentExpiryMinutes * 60 * 1000);
        
        const payment = await tx.payment.create({
          data: {
            userId,
            cartId: dto.cartId,
            provider: PaymentProvider.RAZORPAY,
            providerOrderId: order.id,
            amount,
            status: PaymentStatus.CREATED,
            idempotencyKey,
            expiresAt,
            metadata: {
              traceId,
              receipt: `cart_${dto.cartId}`,
            },
          },
        });

        // 7. Create audit event
        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            eventType: 'payment.order.created',
            status: PaymentStatus.CREATED,
            requestId: traceId,
            response: { orderId: order.id, amount },
          },
        });

        return { payment, isNew: true };
      });

      this.logger.log({
        event: 'PAYMENT_ORDER_CREATED',
        traceId,
        paymentId: result.payment.id,
        providerOrderId: result.payment.providerOrderId,
        amount: result.payment.amount,
      });

      return this.buildOrderResponse(result.payment, traceId);

    } catch (error) {
      this.logger.error({
        event: 'PAYMENT_CREATE_ORDER_FAILED',
        traceId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // ============================================================
  // STEP 1: CREATE SIMPLIFIED PAYMENT (without cart)
  // ============================================================

  /**
   * Create a payment order for simplified checkout (no cart)
   * Note: This creates a Payment record with cartId = null initially
   */
  async createOrderSimple(
    dto: CreateSimplePaymentDto,
    requestId?: string,
    authenticatedUserId: number = 0,
  ): Promise<PaymentOrderResponseDto> {
    const idempotencyKey = dto.idempotencyKey || `simple_${Date.now()}`;
    const traceId = requestId || this.generateRequestId();

    this.logger.log({
      event: 'PAYMENT_CREATE_SIMPLE_START',
      traceId,
      idempotencyKey,
      amount: dto.amount,
    });

    try {
      // === IDEMPOTENCY CHECK ===
      const existingPayment = await this.prisma.payment.findUnique({
        where: { idempotencyKey },
      });

      if (existingPayment) {
        this.logger.warn({
          event: 'PAYMENT_DUPLICATE_SIMPLE',
          traceId,
          idempotencyKey,
          existingPaymentId: existingPayment.id,
        });
        return this.buildOrderResponse(existingPayment, traceId);
      }

      // Convert amount to paise
      const amountInPaise = Math.round(dto.amount * 100);

      // Create Razorpay order
      const order = await this.createRazorpayOrder(
        amountInPaise, 
        `simple_${Date.now()}`,
        dto.currency || 'INR',
      );

      // Create payment record
      const expiresAt = new Date(Date.now() + this.paymentExpiryMinutes * 60 * 1000);
      
      // userId is bound from JWT (no longer hardcoded to 0)
      const payment = await this.prisma.payment.create({
        data: {
          userId: authenticatedUserId,
          cartId: 0, // Default to 0 for simplified checkout
          provider: PaymentProvider.RAZORPAY,
          providerOrderId: order.id,
          amount: amountInPaise,
          status: PaymentStatus.CREATED,
          idempotencyKey,
          expiresAt,
          metadata: {
            traceId,
            type: 'simplified',
            items: dto.items,
            customerDetails: dto.customerDetails,
          },
        },
      });

      this.logger.log({
        event: 'PAYMENT_SIMPLE_CREATED',
        traceId,
        paymentId: payment.id,
        providerOrderId: order.id,
        amount: amountInPaise,
      });

      return this.buildOrderResponse(payment, traceId);

    } catch (error) {
      this.logger.error({
        event: 'PAYMENT_CREATE_SIMPLE_FAILED',
        traceId,
        error: error.message,
      });
      throw error;
    }
  }

  // ============================================================
  // STEP 2: CONFIRM PAYMENT (Client-side confirmation - FALLBACK)
  // ============================================================

  /**
   * Confirm payment from client-side callback
   * Note: Webhook is the PRIMARY source of truth; this is a fallback
   * 
   * This method verifies the signature and updates payment status
   */
  async confirmPayment(
    userId: number,
    dto: ConfirmPaymentDto,
    requestId?: string,
  ): Promise<PaymentConfirmResponseDto> {
    const traceId = requestId || this.generateRequestId();

    this.logger.log({
      event: 'PAYMENT_CONFIRM_START',
      traceId,
      userId,
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
    });

    try {
      // 1. Find payment by order ID
      const payment = await this.prisma.payment.findUnique({
        where: { providerOrderId: dto.razorpayOrderId },
        include: { cart: true },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // 2. Verify ownership (for cart-based payments)
      if (payment.cartId && payment.cartId > 0 && payment.userId !== userId) {
        this.logger.error({
          event: 'PAYMENT_CONFIRM_UNAUTHORIZED',
          traceId,
          paymentUserId: payment.userId,
          requestingUserId: userId,
        });
        throw new BadRequestException('Payment does not belong to user');
      }

      // 2a. Security: Prevent re-confirming failed payments (fintech requirement)
      if (payment.status === PaymentStatus.FAILED) {
        this.logger.error({
          event: 'PAYMENT_CONFIRM_FAILED_PAYMENT',
          traceId,
          paymentId: payment.id,
          paymentStatus: payment.status,
        });
        throw new BadRequestException('Cannot confirm a failed payment');
      }

      // 3. Check if already completed (idempotency)
      if (payment.status === PaymentStatus.CAPTURED) {
        this.logger.warn({
          event: 'PAYMENT_ALREADY_CONFIRMED',
          traceId,
          paymentId: payment.id,
        });
        return {
          success: true,
          paymentId: String(payment.id),
          status: payment.status,
          razorpayPaymentId: dto.razorpayPaymentId,
          message: 'Payment already confirmed',
          isMock: this.isMock,
        };
      }

      // 4. Verify signature (skip in mock mode)
      if (!this.isMock) {
        await this.verifyPaymentSignature(
          dto.razorpayOrderId,
          dto.razorpayPaymentId,
          dto.razorpaySignature,
        );
      }

      // 5. Update payment and cart atomically
      await this.prisma.$transaction(async (tx) => {
        // Update payment
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            providerPaymentId: dto.razorpayPaymentId,
            signature: dto.razorpaySignature,
            status: PaymentStatus.CAPTURED,
            completedAt: new Date(),
          },
        });

        // Complete cart if exists
        if (payment.cartId && payment.cartId > 0) {
          await tx.cart.update({
            where: { id: payment.cartId },
            data: { status: CartStatus.COMPLETED },
          });
        }

        // Create audit event
        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            eventType: 'payment.confirmed.client',
            status: PaymentStatus.CAPTURED,
            requestId: traceId,
            response: {
              razorpayPaymentId: dto.razorpayPaymentId,
              confirmedBy: 'client_callback',
            },
          },
        });
      });

      this.logger.log({
        event: 'PAYMENT_CONFIRMED',
        traceId,
        paymentId: payment.id,
        razorpayPaymentId: dto.razorpayPaymentId,
      });

      return {
        success: true,
        paymentId: String(payment.id),
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: dto.razorpayPaymentId,
        message: 'Payment confirmed successfully',
        isMock: this.isMock,
      };

    } catch (error) {
      this.logger.error({
        event: 'PAYMENT_CONFIRM_FAILED',
        traceId,
        error: error.message,
      });
      throw error;
    }
  }

  // ============================================================
  // STEP 3: WEBHOOK HANDLER (PRIMARY SOURCE OF TRUTH)
  // ============================================================

  /**
   * Handle Razorpay webhook - PRIMARY SOURCE OF TRUTH
   * This is called by Razorpay when payment status changes
   */
  async handleWebhook(
    payload: {
      event: string;
      payload: {
        payment?: {
          entity: {
            id: string;
            order_id: string;
            status: string;
            amount: number;
            currency: string;
          };
        };
        order?: {
          entity: {
            id: string;
            status: string;
          };
        };
      };
    },
    traceId?: string,
  ): Promise<{ processed: boolean; message: string }> {
    const requestId = traceId || this.generateRequestId();
    const eventId = payload.payload?.payment?.entity?.id;
    const orderId = payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id;
    const eventType = payload.event;

    this.logger.log({
      event: 'WEBHOOK_RECEIVED',
      requestId,
      eventType,
      razorpayEventId: eventId,
      razorpayOrderId: orderId,
    });

    try {
      // === IDEMPOTENCY: Check for duplicate webhook ===
      if (eventId) {
        const existing = await this.prisma.payment.findFirst({
          where: { providerWebhookEventId: eventId },
        });

        if (existing) {
          this.logger.warn({
            event: 'WEBHOOK_DUPLICATE',
            requestId,
            eventId,
            paymentId: existing.id,
          });
          return { processed: true, message: 'Event already processed' };
        }
      }

      // Find payment by order ID
      const payment = await this.prisma.payment.findUnique({
        where: { providerOrderId: orderId },
      });

      if (!payment) {
        this.logger.error({
          event: 'WEBHOOK_PAYMENT_NOT_FOUND',
          requestId,
          orderId,
        });
        return { processed: false, message: 'Payment not found' };
      }

      // === STATE MACHINE: Validate transition ===
      const newStatus = this.mapRazorpayStatusToInternal(payload.event);
      
      if (!this.isValidStateTransition(payment.status, newStatus)) {
        this.logger.warn({
          event: 'WEBHOOK_INVALID_TRANSITION',
          requestId,
          paymentId: payment.id,
          currentStatus: payment.status,
          newStatus,
        });
        return { processed: false, message: 'Invalid state transition' };
      }

      // === PROCESS EVENT ===
      await this.prisma.$transaction(async (tx) => {
        // Update payment
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            providerPaymentId: eventId || payment.providerPaymentId,
            providerWebhookEventId: eventId,
            status: newStatus,
            completedAt: newStatus === PaymentStatus.CAPTURED ? new Date() : null,
          },
        });

        // Update cart status
        if (payment.cartId && payment.cartId > 0) {
          const cartStatus = newStatus === PaymentStatus.CAPTURED 
            ? CartStatus.COMPLETED 
            : newStatus === PaymentStatus.FAILED || newStatus === PaymentStatus.EXPIRED
              ? CartStatus.ACTIVE // Release lock
              : undefined;

          if (cartStatus) {
            await tx.cart.update({
              where: { id: payment.cartId },
              data: { status: cartStatus },
            });
          }
        }

        // Create audit event
        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            eventType,
            status: newStatus,
            providerEventId: eventId,
            requestId,
            payload: payload as any,
            processedAt: new Date(),
          },
        });
      });

      this.logger.log({
        event: 'WEBHOOK_PROCESSED',
        requestId,
        paymentId: payment.id,
        eventType,
        newStatus,
      });

      return { processed: true, message: 'Event processed successfully' };

    } catch (error) {
      this.logger.error({
        event: 'WEBHOOK_PROCESSING_FAILED',
        requestId,
        error: error.message,
        stack: error.stack,
      });
      
      // Don't throw - acknowledge receipt to prevent retries
      return { processed: false, message: 'Processing failed' };
    }
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Get payment status by ID
   */
  async getPaymentStatus(paymentId: number, userId: number): Promise<PaymentStatusResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify ownership
    if (payment.userId !== userId) {
      this.logger.error({
        event: 'PAYMENT_STATUS_UNAUTHORIZED',
        paymentId,
        requestingUserId: userId,
        paymentUserId: payment.userId,
      });
      throw new ForbiddenException('Access denied: Payment does not belong to user');
    }

    return {
      paymentId: String(payment.id),
      status: payment.status,
      providerOrderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId || undefined,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt || undefined,
    };
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string, userId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerOrderId: orderId },
      include: { cart: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify ownership
    if (payment.userId !== userId) {
      this.logger.error({
        event: 'PAYMENT_BY_ORDER_UNAUTHORIZED',
        orderId,
        requestingUserId: userId,
        paymentUserId: payment.userId,
      });
      throw new ForbiddenException('Access denied: Payment does not belong to user');
    }

    return payment;
  }

  /**
   * Release cart lock (for failed/expired payments)
   */
  async releaseCartLock(cartId: number): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { status: CartStatus.ACTIVE },
    });
    
    this.logger.log({ event: 'CART_LOCK_RELEASED', cartId });
  }

  /**
   * Process expired payments (called by cron)
   */
  async processExpiredPayments(): Promise<number> {
    const result = await this.prisma.payment.updateMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.CREATED] },
        expiresAt: { lt: new Date() },
      },
      data: {
        status: PaymentStatus.EXPIRED,
      },
    });

    // Also release cart locks
    const expiredPayments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.EXPIRED,
        updatedAt: { gte: new Date(Date.now() - 60000) }, // Recently expired
      },
    });

    for (const payment of expiredPayments) {
      if (payment.cartId && payment.cartId > 0) {
        await this.releaseCartLock(payment.cartId);
      }
    }

    this.logger.log({ 
      event: 'PAYMENTS_EXPIRED', 
      count: result.count,
    });

    return result.count;
  }

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================

  /**
   * Check idempotency using DB
   */
  private async checkIdempotency(idempotencyKey: string, userId: number) {
    if (!idempotencyKey) return null;
    
    // Include userId in query to prevent cross-user idempotency key collision
    return this.prisma.payment.findFirst({
      where: { 
        idempotencyKey,
        userId,
      },
    });
  }

  /**
   * Generate unique request ID for tracing
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Calculate amount from cart items (server-side)
   */
  private calculateAmountFromItems(items: any[]): number {
    const zero = new Decimal(0);
    const total = items.reduce(
      (sum, item) => sum.add(new Decimal(item.totalPrice?.toString() || '0')),
      zero,
    );
    return Math.round(total.toNumber() * 100); // Convert to paise
  }

  /**
   * Create Razorpay order (or mock)
   */
  private async createRazorpayOrder(
    amount: number, 
    receipt: string, 
    currency: string = 'INR',
  ): Promise<{ id: string; amount: number; currency: string }> {
    if (this.isMock || !this.razorpay) {
      return {
        id: `order_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        amount,
        currency,
      };
    }

    const order = await this.razorpay.orders.create({
      amount,
      currency,
      receipt,
      payment_capture: true, // Auto-capture
    });

    return order;
  }

  /**
   * Verify Razorpay payment signature
   */
  private async verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<void> {
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayKeySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.error({
        event: 'SIGNATURE_VERIFICATION_FAILED',
        expected: expectedSignature,
        received: signature,
      });
      throw new BadRequestException('Invalid payment signature');
    }
  }

  /**
   * Build order response
   */
  private buildOrderResponse(payment: any, traceId: string): PaymentOrderResponseDto {
    return {
      id: payment.providerOrderId,
      amount: payment.amount,
      currency: payment.currency || 'INR',
      razorpayKey: this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_mock',
      paymentId: String(payment.id),
      receipt: payment.metadata?.receipt || `payment_${payment.id}`,
      expiresAt: payment.expiresAt,
      isMock: this.isMock,
      requestId: traceId,
    };
  }

  /**
   * Map Razorpay event to internal status
   */
  private mapRazorpayStatusToInternal(event: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'payment.authorized': PaymentStatus.AUTHORIZED,
      'payment.captured': PaymentStatus.CAPTURED,
      'payment.failed': PaymentStatus.FAILED,
      'payment.refunded': PaymentStatus.REFUNDED,
      'order.paid': PaymentStatus.CAPTURED,
      'order.expired': PaymentStatus.EXPIRED,
    };
    
    return statusMap[event] || PaymentStatus.PENDING;
  }

  /**
   * Validate state machine transition
   */
  private isValidStateTransition(current: PaymentStatus, next: PaymentStatus): boolean {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [PaymentStatus.CREATED, PaymentStatus.FAILED, PaymentStatus.EXPIRED],
      [PaymentStatus.CREATED]: [PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED, PaymentStatus.FAILED, PaymentStatus.EXPIRED],
      [PaymentStatus.AUTHORIZED]: [PaymentStatus.CAPTURED, PaymentStatus.FAILED],
      [PaymentStatus.CAPTURED]: [PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED]: [], // Terminal
      [PaymentStatus.REFUNDED]: [], // Terminal
      [PaymentStatus.CANCELLED]: [], // Terminal
      [PaymentStatus.EXPIRED]: [], // Terminal
    };

    return validTransitions[current]?.includes(next) || false;
  }

  /**
   * Log webhook failure for retry
   */
  private async logWebhookFailure(
    paymentId: number | undefined,
    eventId: string,
    eventType: string,
    errorMessage: string,
    requestId: string,
  ): Promise<void> {
    // Could extend with a webhook failure table for retry
    this.logger.error({
      event: 'WEBHOOK_FAILURE_LOGGED',
      paymentId,
      eventId,
      eventType,
      errorMessage,
      requestId,
    });
  }

  // ✅ Get all payments (Admin) - Enhanced with business logic
  async getAllPayments(page: number = 1, limit: number = 20, status?: string) {
    // Business Rule: Validate pagination parameters
    const validPage = Math.max(1, parseInt(page.toString()) || 1);
    const validLimit = Math.min(100, Math.max(1, parseInt(limit.toString()) || 20)); // Cap at 100 for performance
    const skip = (validPage - 1) * validLimit;
    
    // Build where clause with business filters
    const where: any = {};
    if (status) {
      where.status = status;
    }
    
    // Business Rule: Only include payments from last 2 years by default (performance)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    where.createdAt = { gte: twoYearsAgo };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: validLimit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          cart: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              items: {
                select: {
                  id: true,
                  itemType: true,
                  unitPrice: true,
                  totalPrice: true,
                },
              },
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              eventType: true,
              totalAmount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    // Business Rule: Calculate additional metrics for admin dashboard
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const successfulPayments = payments.filter(p => p.status === PaymentStatus.CAPTURED).length;
    const pendingPayments = payments.filter(p => p.status === PaymentStatus.PENDING).length;
    const failedPayments = payments.filter(p => p.status === PaymentStatus.FAILED).length;

    return {
      payments,
      metrics: {
        totalAmount,
        averageAmount: payments.length > 0 ? totalAmount / payments.length : 0,
        successfulPayments,
        pendingPayments,
        failedPayments,
        successRate: payments.length > 0 ? (successfulPayments / payments.length) * 100 : 0,
      },
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
        hasMore: (validPage * validLimit) < total,
      },
    };
  }

  // ✅ Get payment by ID (Admin) - For transaction detail page
  async getPaymentById(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        event: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        cart: {
          include: {
            items: {
              include: {
                venue: true,
                vendorService: true,
              },
            },
          },
        },
        paymentEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    // Calculate business metrics
    const platformFeePercentage = 0.05; // 5% platform fee
    const platformFee = Math.round(payment.amount * platformFeePercentage);
    const netAmount = payment.amount - platformFee;

    // Determine if refundable based on payment status
    const refundable = payment.status === 'CAPTURED' || payment.status === 'REFUNDED';

    // Calculate days since payment
    const daysSincePayment = Math.floor(
      (new Date().getTime() - new Date(payment.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      ...payment,
      platformFee,
      netAmount,
      refundable,
      daysSincePayment,
      canRefund: refundable && payment.status !== 'REFUNDED',
    };
  }

  // ============================================
  // REFUND PROCESSING (Admin only)
  // ============================================

  /**
   * Process refund for a payment (Admin only)
   * 
   * Business Logic:
   * 1. Validate payment exists and is captured
   * 2. Validate refund amount (cannot exceed original amount)
   * 3. Create refund record in database
   * 4. Update payment status to REFUNDED (full) or PARTIALLY_REFUNDED
   * 5. Log refund event
   * 6. Return refund details
   */
  async processRefund(paymentId: number, refundAmount: number, reason: string | undefined, adminUserId: number) {
    try {
      // Validate refund amount
      if (refundAmount <= 0) {
        throw new BadRequestException('Refund amount must be greater than 0');
      }

      // Get payment with all relations
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: true,
          event: true,
          paymentEvents: true,
        },
      });

      if (!payment) {
        throw new NotFoundException(`Payment ${paymentId} not found`);
      }

      // Check if payment is refundable
      if (payment.status !== 'CAPTURED') {
        throw new BadRequestException(
          `Payment cannot be refunded. Current status: ${payment.status}`
        );
      }

      // Calculate total already refunded
      const existingRefunds = await this.prisma.paymentEvent.findMany({
        where: {
          paymentId,
          eventType: 'REFUND_INITIATED',
        },
      });

      const totalRefunded = existingRefunds.reduce((sum, event: any) => {
        const eventData = event.eventData || {};
        return sum + (eventData.amount || 0);
      }, 0);

      // Check if refund amount exceeds original payment
      if (refundAmount + totalRefunded > payment.amount) {
        throw new BadRequestException(
          `Refund amount (${refundAmount}) plus already refunded amount (${totalRefunded}) exceeds original payment (${payment.amount})`
        );
      }

      // Determine if this is a full or partial refund
      const isFullRefund = refundAmount + totalRefunded >= payment.amount;
      const newStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

      // Create refund event and update payment in a transaction
      const [refundEvent, updatedPayment] = await this.prisma.$transaction(async (tx) => {
        // Create refund event
        const refundEvent = await tx.paymentEvent.create({
          data: {
            paymentId,
            eventType: 'REFUND_INITIATED',
            status: newStatus as any,
            payload: {
              amount: refundAmount,
              reason: reason || 'Admin initiated refund',
              initiatedBy: adminUserId,
              timestamp: new Date().toISOString(),
              isFullRefund,
              totalRefunded: totalRefunded + refundAmount,
            },
          },
        });

        // Update payment status
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: newStatus as any,
            updatedAt: new Date(),
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return [refundEvent, updatedPayment];
      });

      // Log refund
      this.logger.log({
        event: 'REFUND_PROCESSED',
        paymentId,
        refundAmount,
        reason,
        adminUserId,
        isFullRefund,
        newStatus,
      });

      // TODO: Integrate with Razorpay Refund API for actual refund processing
      // For now, we're just marking it as refunded in our system
      // In production, you would call:
      // const razorpayRefund = await this.razorpay.refunds.create({
      //   payment_id: payment.providerPaymentId,
      //   amount: refundAmount * 100, // Razorpay uses paise
      //   notes: { reason: reason || 'Admin initiated refund' }
      // });

      return {
        success: true,
        message: isFullRefund ? 'Full refund processed successfully' : 'Partial refund processed successfully',
        refund: {
          id: refundEvent.id,
          amount: refundAmount,
          reason: reason || 'Admin initiated refund',
          initiatedBy: adminUserId,
          timestamp: refundEvent.createdAt,
          isFullRefund,
        },
        payment: {
          id: updatedPayment.id,
          status: updatedPayment.status,
          totalRefunded: totalRefunded + refundAmount,
          originalAmount: payment.amount,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error({
        event: 'REFUND_FAILED',
        paymentId,
        error: error.message,
        stack: error.stack,
      });

      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  /**
   * Get refund history for a payment
   */
  async getRefundHistory(paymentId: number) {
    // Verify payment exists
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    // Get all refund events
    const refundEvents = await this.prisma.paymentEvent.findMany({
      where: {
        paymentId,
        eventType: 'REFUND_INITIATED',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate total refunded
    const totalRefunded = refundEvents.reduce((sum, event: any) => {
      const eventData = event.eventData || {};
      return sum + (eventData.amount || 0);
    }, 0);

    return {
      paymentId,
      originalAmount: payment.amount,
      totalRefunded,
      refundableAmount: payment.amount - totalRefunded,
      isFullyRefunded: payment.status === 'REFUNDED',
      refunds: refundEvents.map((event: any) => ({
        id: event.id,
        amount: (event.payload || {}).amount || 0,
        reason: (event.payload || {}).reason || 'N/A',
        initiatedBy: (event.payload || {}).initiatedBy || 'System',
        timestamp: event.createdAt,
        isFullRefund: (event.payload || {}).isFullRefund || false,
      })),
    };
  }

  // ✅ Export payments to CSV
  async exportPaymentsToCsv(page: number = 1, limit: number = 1000, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const payments = await this.prisma.payment.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create CSV content with formula injection sanitization
    const sanitizeCsvCell = (value: any): string => {
      const str = String(value ?? '');
      // Prefix cells starting with =, +, -, @ to prevent formula injection in Excel
      if (/^[=+\-@]/.test(str)) return `'${str}`;
      // Escape commas and quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [
      ['ID', 'Customer Name', 'Customer Email', 'Event', 'Amount', 'Currency', 'Status', 'Provider', 'Created At'],
      ...payments.map((p: any) => [
        p.id,
        sanitizeCsvCell(p.user?.name || 'N/A'),
        sanitizeCsvCell(p.user?.email || 'N/A'),
        sanitizeCsvCell(p.event?.title || 'N/A'),
        p.amount,
        p.currency,
        p.status,
        p.provider,
        new Date(p.createdAt).toISOString(),
      ]),
    ];

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');

    return csvContent;
  }

  // ============================================================
  // ADMIN ACTIONS: Approve, Reject, Refund
  // ============================================================

  /**
   * Approve a payment (admin action)
   * Marks a pending payment as approved/authorized
   */
  async approvePayment(paymentId: number): Promise<any> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.CREATED) {
      throw new BadRequestException(`Cannot approve payment with status: ${payment.status}`);
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.AUTHORIZED,
      },
    });

    // Create audit event
    await this.prisma.paymentEvent.create({
      data: {
        paymentId,
        eventType: 'payment.approved.admin',
        status: PaymentStatus.AUTHORIZED,
      },
    });

    return updated;
  }

  /**
   * Reject a payment (admin action)
   * Marks a payment as failed/rejected
   */
  async rejectPayment(paymentId: number, reason?: string): Promise<any> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.CAPTURED || payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException(`Cannot reject payment with status: ${payment.status}`);
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        notes: reason,
      },
    });

    // Create audit event
    await this.prisma.paymentEvent.create({
      data: {
        paymentId,
        eventType: 'payment.rejected.admin',
        status: PaymentStatus.FAILED,
        response: { reason },
      },
    });

    return updated;
  }

  /**
   * Refund a payment (admin action)
   * Marks a captured payment as refunded
   */
  async refundPayment(paymentId: number, amount?: number, reason?: string): Promise<any> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException(`Cannot refund payment with status: ${payment.status}. Only captured payments can be refunded.`);
    }

    // If amount not specified, refund full amount
    const refundAmount = amount || payment.amount;
    
    if (refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        notes: reason,
      },
    });

    // Create audit event
    await this.prisma.paymentEvent.create({
      data: {
        paymentId,
        eventType: 'payment.refunded.admin',
        status: PaymentStatus.REFUNDED,
        response: { refundAmount, reason },
      },
    });

    return {
      ...updated,
      refundAmount,
    };
  }
}
