// src/payments/payments.service.ts
import { 
  Injectable, 
  BadRequestException, 
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
<<<<<<< Updated upstream
import { CartService } from '../cart/cart.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
=======
import { EventsService } from '../events/events.service';
import { CartCalculationService } from '../business-rules/cart-calculation.service';
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
=======
    private readonly cartCalculationService: CartCalculationService,
    private readonly eventsService: EventsService,
    private readonly eventEmitter: EventEmitter2,
>>>>>>> Stashed changes
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
    *
    * RELIABILITY FIX: Razorpay API call moved OUTSIDE database transaction
    * to prevent DB connection pool exhaustion from slow external API responses.
    * Transaction now only wraps the actual DB writes (payment record + audit event).
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
       cartId: dto.cartId && dto.cartId > 0 ? dto.cartId : null,
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

       // === VALIDATE CART (before external call) ===
       const cart = await this.prisma.cart.findUnique({
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

       // === CALCULATE AMOUNT ===
       const amount = this.calculateAmountFromItems(cart.items);
       
       if (amount <= 0) {
         throw new BadRequestException('Invalid cart amount');
       }

       // 🔴 CRITICAL FIX: Call Razorpay API OUTSIDE transaction to avoid holding DB connections
       const order = await this.createRazorpayOrder(amount, `cart_${dto.cartId}`);

       // === ATOMIC TRANSACTION (DB only - no external API calls inside) ===
       const result = await this.prisma.$transaction(async (tx) => {
         // 1. Lock cart
         await tx.cart.update({
           where: { id: dto.cartId },
           data: { status: CartStatus.LOCKED },
         });

         // 2. Create payment record with the orderId obtained from Razorpay
         const expiresAt = new Date(Date.now() + this.paymentExpiryMinutes * 60 * 1000);
         
         const payment = await tx.payment.create({
           data: {
             userId,
             cartId: dto.cartId && dto.cartId > 0 ? dto.cartId : undefined,
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

         // 3. Create audit event
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

    } catch (error: any) {
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

      // 🔴 CRITICAL FIX: Call Razorpay API OUTSIDE any DB transaction
      const order = await this.createRazorpayOrder(
        amountInPaise, 
        `simple_${Date.now()}`,
        dto.currency || 'INR',
      );

      // === DB TRANSACTION: Persist payment record atomically ===
      const expiresAt = new Date(Date.now() + this.paymentExpiryMinutes * 60 * 1000);
      
      // Wrap in transaction for consistency (even single write)
      const payment = await this.prisma.$transaction(async (tx) => {
        return await tx.payment.create({
          data: {
            userId: authenticatedUserId,
            cartId: dto.cartId && dto.cartId > 0 ? dto.cartId : null,
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
      });

      this.logger.log({
        event: 'PAYMENT_SIMPLE_CREATED',
        traceId,
        paymentId: payment.id,
        providerOrderId: order.id,
        amount: amountInPaise,
      });

      return this.buildOrderResponse(payment, traceId);

    } catch (error: any) {
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
       const PLATFORM_FEE_RATE = this.cartCalculationService.getPlatformFeeRate();
       const TAX_RATE = this.cartCalculationService.getTaxRate();

       const payment = await this.prisma.payment.findUnique({
        where: { providerOrderId: dto.razorpayOrderId },
        include: { cart: { include: { items: true } } },
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

      // 3. Check if already completed (idempotency) - REPLACED with atomic update
      // 4. Verify signature (skip in mock mode)
      if (!this.isMock) {
        await this.verifyPaymentSignature(
          dto.razorpayOrderId,
          dto.razorpayPaymentId,
          dto.razorpaySignature,
        );
      }

<<<<<<< Updated upstream
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

        // Complete cart if exists and create Events
        if (payment.cartId && payment.cartId > 0) {
          const cart = await tx.cart.findUnique({
            where: { id: payment.cartId },
            include: { items: true }
=======
      // 5. Atomically capture payment if not already captured
      let createdEventIds: number[] = [];
      let alreadyCaptured = false;

      await this.prisma.$transaction(
        async (tx) => {
          // Atomic conditional update: only captures if currently not CAPTURED
          const updateResult = await tx.payment.updateMany({
            where: {
              id: payment.id,
              status: { not: PaymentStatus.CAPTURED },
            },
            data: {
              status: PaymentStatus.CAPTURED,
              completedAt: new Date(),
              providerPaymentId: dto.razorpayPaymentId,
              signature: dto.razorpaySignature,
            },
>>>>>>> Stashed changes
          });

          if (updateResult.count === 0) {
            alreadyCaptured = true;
            return; // Skip rest; payment already captured
          }

          // Complete cart if exists and create Events (initally QUOTED)
          if (payment.cartId && payment.cartId > 0) {
            const cart = await tx.cart.findUnique({
              where: { id: payment.cartId },
              include: { items: true },
            });

<<<<<<< Updated upstream
          // Create Event records from cart items
          await this.createEventsFromCart(tx, payment, cart, traceId);
        }
=======
            if (!cart) {
              throw new Error(`Cart with ID ${payment.cartId} not found during payment confirmation.`);
            }
>>>>>>> Stashed changes

            await tx.cart.update({
              where: { id: payment.cartId },
              data: { status: CartStatus.COMPLETED },
            });

            // Create Event records from cart items (status = QUOTED)
            createdEventIds = await this.createEventsFromCart(tx, payment, cart, traceId);
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
        },
        { isolationLevel: 'Serializable' },
      );

      if (alreadyCaptured) {
        return {
          success: true,
          paymentId: String(payment.id),
          status: PaymentStatus.CAPTURED,
          razorpayPaymentId: dto.razorpayPaymentId,
          message: 'Payment already confirmed',
          isMock: this.isMock,
        };
      }

<<<<<<< Updated upstream
=======
      // Transition events from QUOTED to CONFIRMED after commit
      if (createdEventIds.length > 0) {
        for (const eventId of createdEventIds) {
          try {
            await this.eventsService.updateEventStatus(eventId, 'CONFIRMED', 0);
          } catch (err: any) {
            this.logger.error({
              event: 'EVENT_TRANSITION_FAILED',
              eventId,
              error: err.message,
            });
            // Continue processing; do not throw to avoid failing response
          }
        }
      }

>>>>>>> Stashed changes
      await this.sendBookingNotifications(payment, payment.cart?.items || [], traceId);

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

    } catch (error: any) {
      this.logger.error({
        event: 'PAYMENT_CONFIRM_FAILED',
        traceId,
        error: error.message,
      });
      throw error;
    }
  }

  private async createEventsFromCart(
    tx: any,
    payment: any,
    cart: any,
    traceId: string,
<<<<<<< Updated upstream
  ): Promise<void> {
    const feeSettings = await this.settingsService.getPublicFees();
    const PLATFORM_FEE_RATE = feeSettings.platformFee;
    const TAX_RATE = feeSettings.taxRate;
=======
  ): Promise<number[]> {
    const PLATFORM_FEE_RATE = this.cartCalculationService.getPlatformFeeRate();
    const TAX_RATE = this.cartCalculationService.getTaxRate();
    const createdEventIds: number[] = [];

>>>>>>> Stashed changes
    for (const item of cart.items) {
      const metaData = item.meta !== null && typeof item.meta === 'object'
        ? (item.meta as Record<string, unknown>) : {};
      const startTime = (metaData as any)?.startTime || null;
      const endTime = (metaData as any)?.endTime || null;
<<<<<<< Updated upstream
      const itemTotal = Number(item.totalPrice || 0);
      const itemExpressFee = cart.isExpress && cart.expressFee
        ? Math.round(cart.expressFee / cart.items.length) : 0;
      const itemSubtotal = itemTotal - itemExpressFee;
      const itemPlatformFee = Math.round((itemSubtotal + itemExpressFee) * PLATFORM_FEE_RATE);
      const itemTax = Math.round((itemSubtotal + itemPlatformFee) * TAX_RATE);
      const itemTotalAmount = itemSubtotal + itemExpressFee + itemPlatformFee + itemTax;
=======

      // FIX 1: Row-level lock and availability check to prevent double booking
      if (item.venueId) {
        // Lock the venue row to serialize concurrent bookings
        await tx.$queryRaw`SELECT * FROM "Venue" WHERE id = ${item.venueId} FOR UPDATE`;
        // Check for existing conflicting event
        const existingEvent = await tx.event.findFirst({
          where: {
            venueId: item.venueId,
            date: item.date,
            timeSlot: item.timeSlot,
          },
        });
        if (existingEvent) {
          throw new BadRequestException(`Venue already booked for date ${item.date} slot ${item.timeSlot}`);
        }
      } else if (item.vendorServiceId) {
        // Lock the vendor service row
        await tx.$queryRaw`SELECT * FROM "VendorService" WHERE id = ${item.vendorServiceId} FOR UPDATE`;
        const existingEvent = await tx.event.findFirst({
          where: {
            vendorServiceId: item.vendorServiceId,
            date: item.date,
            timeSlot: item.timeSlot,
          },
        });
        if (existingEvent) {
          throw new BadRequestException(`Vendor service already booked for date ${item.date} slot ${item.timeSlot}`);
        }
      }

      // FIX 2: Use Decimal for all financial calculations to avoid floating point errors
      const itemTotal = new Decimal(item.totalPrice?.toString() || '0');
      const itemExpressFee = cart.isExpress && cart.expressFee && cart.items.length > 0
        ? new Decimal(Math.round(cart.expressFee / cart.items.length))
        : new Decimal(0);
      const itemSubtotal = itemTotal.minus(itemExpressFee);
      const itemPlatformFee = itemSubtotal.plus(itemExpressFee).mul(PLATFORM_FEE_RATE).toDecimalPlaces(0);
      const itemTax = itemSubtotal.plus(itemPlatformFee).mul(TAX_RATE).toDecimalPlaces(0);
      const itemTotalAmount = itemSubtotal.plus(itemExpressFee).plus(itemPlatformFee).plus(itemTax);

>>>>>>> Stashed changes
      const eventBase = {
        userId: payment.userId,
        customerId: payment.userId,
        date: item.date || new Date(),
        timeSlot: item.timeSlot || 'FULL_DAY',
        status: 'CONFIRMED' as any,
        isExpress: cart.isExpress || false,
        expressFee: cart.expressFee || 0,
        subtotal: itemSubtotal,
        platformFee: itemPlatformFee,
        tax: itemTax,
        totalAmount: itemTotalAmount,
        meta: {
          ...metaData,
          startTime,
          endTime,
          quantity: item.quantity || 1,
          unitPrice: String(item.unitPrice || 0),
          totalPrice: String(item.totalPrice || 0),
          traceId,
        },
      };
      if (item.venueId) {
        await tx.event.create({ data: { ...eventBase, venueId: item.venueId } });
      } else if (item.vendorServiceId) {
        await tx.event.create({ data: { ...eventBase, vendorServiceId: item.vendorServiceId } });
      }
    }
  }

  private async sendBookingNotifications(
    payment: any,
    cartItems: any[],
    traceId: string,
  ): Promise<void> {
    // Emit event for decoupled notification handling
    this.eventEmitter.emit('payment.confirmed', {
      payment,
      cartItems,
      traceId,
    });
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

        if (newStatus === PaymentStatus.CAPTURED && payment.cartId && payment.cartId > 0) {
          const existingCount = await tx.event.count({
            where: {
              userId: payment.userId,
              createdAt: { gte: new Date(Date.now() - 300000) },
            },
          });
          if (existingCount === 0) {
            const cartWithItems = await tx.cart.findUnique({
              where: { id: payment.cartId },
              include: { items: true },
            });
            if (cartWithItems) {
              await this.createEventsFromCart(tx, payment, cartWithItems, requestId || 'webhook');
            }
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

<<<<<<< Updated upstream
      if (newStatus === PaymentStatus.CAPTURED) {
        const cartItems = payment.cartId
          ? (await this.prisma.cart.findUnique({
              where: { id: payment.cartId },
              include: { items: true },
            }))?.items || []
          : [];
        await this.sendBookingNotifications(payment, cartItems, requestId || 'webhook');
      }
=======
        // Transition events to CONFIRMED after creation (Fix 6)
        if (createdEventIds.length > 0) {
          for (const eventId of createdEventIds) {
            try {
              await this.eventsService.updateEventStatus(eventId, 'CONFIRMED', 0);
            } catch (err: any) {
              this.logger.error({
                event: 'EVENT_TRANSITION_FAILED',
                eventId,
                error: err.message,
              });
            }
          }
        }

       if (newStatus === PaymentStatus.CAPTURED) {
         const cartItems = payment.cartId
           ? (await this.prisma.cart.findUnique({
               where: { id: payment.cartId },
               include: { items: true },
             }))?.items || []
           : [];
         await this.sendBookingNotifications(payment, cartItems, requestId || 'webhook');
       }
>>>>>>> Stashed changes

      this.logger.log({
        event: 'WEBHOOK_PROCESSED',
        requestId,
        paymentId: payment.id,
        eventType,
        newStatus,
      });

      return { processed: true, message: 'Event processed successfully' };

    } catch (error: any) {
      this.logger.error({
        event: 'WEBHOOK_PROCESSING_FAILED',
        requestId,
        error: error.message,
        stack: error.stack,
      });
      
      // 🔴 CRITICAL FIX: Throw exception to return non-200 status so Razorpay retries webhook
      throw new InternalServerErrorException('Processing failed');
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
      // === STEP 1: Validate refund amount ===
      if (refundAmount <= 0) {
        throw new BadRequestException('Refund amount must be greater than 0');
      }

      // === STEP 2: Quick read of payment data (no transaction, no lock) ===
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        select: { 
          id: true, 
          status: true, 
          amount: true, 
          providerPaymentId: true, 
          userId: true 
        },
      });

      if (!payment) {
        throw new NotFoundException(`Payment ${paymentId} not found`);
      }

      if (payment.status !== 'CAPTURED') {
        throw new BadRequestException(
          `Payment cannot be refunded. Current status: ${payment.status}`
        );
      }

      if (!this.isMock && (!payment.providerPaymentId || !payment.providerPaymentId.startsWith('pay_'))) {
        throw new BadRequestException('Cannot refund: Invalid or missing payment gateway ID');
      }

      // === STEP 3: Calculate already refunded amount (no lock) ===
      const existingRefunds = await this.prisma.paymentEvent.findMany({
        where: {
          paymentId,
          eventType: 'REFUND_INITIATED',
        },
      });

      const totalRefunded = existingRefunds.reduce((sum, event: any) => {
        const eventData = event.payload || {};
        return sum + (eventData.amount || 0);
      }, 0);

      const originalAmount = typeof payment.amount === 'number' ? payment.amount : Number(payment.amount);
      if (refundAmount + totalRefunded > originalAmount) {
        throw new BadRequestException(
          `Refund amount (${refundAmount}) plus already refunded amount (${totalRefunded}) exceeds original payment (${originalAmount})`
        );
      }

      // === 🔴 CRITICAL FIX: Call Razorpay API OUTSIDE any DB transaction ===
      if (!this.isMock && payment.providerPaymentId) {
        try {
          await this.razorpay.refunds.create({
            payment_id: payment.providerPaymentId,
            amount: Math.round(refundAmount * 100),
            notes: { 
              reason: reason || 'Admin initiated refund',
              adminId: String(adminUserId)
            }
          });
        } catch (rzpError: any) {
          this.logger.error(`Razorpay refund failed for payment ${paymentId}:`, rzpError);
          throw new InternalServerErrorException(
            `Payment gateway rejected refund: ${rzpError.error?.description || rzpError.message || 'Unknown error'}`
          );
        }
      }

      // === STEP 4: Final DB transaction with row-level lock to persist refund ===
      const { refundEvent, updatedPayment, isFullRefund, finalTotalRefunded } = await this.prisma.$transaction(async (tx) => {
        // 🔒 Lock payment row to prevent concurrent refunds
        const locked = await tx.$queryRaw<any[]>`
          SELECT * FROM "Payment" 
          WHERE id = ${paymentId} 
          FOR UPDATE
        `;

        if (!locked || locked.length === 0) {
          throw new NotFoundException(`Payment ${paymentId} not found`);
        }

        const currentPayment = locked[0];

        // Re-validate status (could have changed)
        if (currentPayment.status !== 'CAPTURED' && currentPayment.status !== 'PARTIALLY_REFUNDED') {
          throw new BadRequestException(
            `Payment cannot be refunded. Current status: ${currentPayment.status}`
          );
        }

        // Re-calculate total refunded to catch concurrent refunds
        const currentRefunds = await tx.paymentEvent.findMany({
          where: {
            paymentId,
            eventType: 'REFUND_INITIATED',
          },
        });

        const currentTotalRefunded = currentRefunds.reduce((sum, event: any) => {
          const eventData = event.payload || {};
          return sum + (eventData.amount || 0);
        }, 0);

        if (currentTotalRefunded + refundAmount > originalAmount) {
          throw new BadRequestException(
            `Total refund would exceed original payment due to concurrent refund`
          );
        }

        // Determine final status
        const isFull = currentTotalRefunded + refundAmount >= originalAmount;
        const newStatus = isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

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
              isFullRefund: isFull,
              totalRefunded: currentTotalRefunded + refundAmount,
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

        return { 
          refundEvent, 
          updatedPayment, 
          isFullRefund: isFull, 
          finalTotalRefunded: currentTotalRefunded + refundAmount 
        };
      });

      // === STEP 5: Log and return ===
      this.logger.log({
        event: 'REFUND_PROCESSED',
        paymentId,
        refundAmount,
        reason,
        adminUserId,
        isFullRefund,
        newStatus: updatedPayment.status,
      });

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
          totalRefunded: finalTotalRefunded,
          originalAmount,
        },
      };
    } catch (error: any) {
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

  async exportPaymentsToCsv(page: number = 1, limit: number = 1000, status?: string) {
    const validPage = Math.max(1, parseInt(page.toString()) || 1);
    const validLimit = Math.max(1, parseInt(limit.toString()) || 1000);
    const skip = (validPage - 1) * validLimit;
    const where: any = status ? { status } : {};

    const payments = await this.prisma.payment.findMany({
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
