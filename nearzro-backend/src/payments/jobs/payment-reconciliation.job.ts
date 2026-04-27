// src/payments/jobs/payment-reconciliation.job.ts
import { Injectable, Logger, Inject, forwardRef, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, CartStatus } from '@prisma/client';
import { PaymentsService } from '../payments.service';
import Redlock from 'redlock';

@Injectable()
export class PaymentReconciliationJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentReconciliationJob.name);
  private readonly paymentTimeoutMinutes = 30;
  private readonly maxReconciliationRetries = 3;
  private readonly reconciliationAgeMinutes = 15;
  private redlock: Redlock | null = null;
  private readonly lockTTL = 9 * 60 * 1000; // 9 minutes (slightly shorter than 10-minute cron interval)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    @Inject('RAZORPAY_CLIENT') private readonly razorpay: any,
  ) {}

  async onModuleInit() {
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = Number(process.env.REDIS_PORT) || 6379;
    const redisUrl = `redis://${redisHost}:${redisPort}`;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    const client = new Redis(redisUrl);

    this.redlock = new Redlock(
      [client],
      {
        driftFactor: 0.01,
        retryCount: 0, // No retries for cron
        retryDelay: 200,
        retryJitter: 200,
      },
    );
  }

  async onModuleDestroy() {
    if (this.redlock) {
      await this.redlock.destroy();
    }
  }

  /**
   * Run reconciliation every 10 minutes
   */
  @Cron('*/10 * * * *')
  async reconcile(): Promise<void> {
    let lock: Redlock.Lock | null = null;
    const resource = 'cron:payment-reconciliation';

    try {
      // Acquire distributed lock
      lock = await this.redlock!.acquire([resource], this.lockTTL);
      this.logger.debug('Acquired lock for payment reconciliation cron');

      this.logger.log({
        event: 'RECONCILIATION_START',
        timestamp: new Date().toISOString(),
      });

      try {
        // 1. Process expired payments
        const expiredCount = await this.processExpiredPayments();

        // 2. Reconcile stuck payments
        const stuckCount = await this.reconcileStuckPayments();

        // 3. Release orphaned cart locks
        const releasedCount = await this.releaseOrphanedCartLocks();

        this.logger.log({
          event: 'RECONCILIATION_COMPLETE',
          expiredProcessed: expiredCount,
          stuckReconciled: stuckCount,
          locksReleased: releasedCount,
          timestamp: new Date().toISOString(),
        });
      } catch (innerError) {
        this.logger.error({
          event: 'RECONCILIATION_FAILED',
          error: innerError.message,
          stack: innerError.stack,
        });
      }
    } catch (lockError: any) {
      if (lockError instanceof Error && lockError.message.includes('lock')) {
        this.logger.debug('Could not acquire lock for payment reconciliation - another instance running');
      } else {
        this.logger.error({
          event: 'RECONCILIATION_LOCK_ERROR',
          error: lockError.message,
          stack: lockError.stack,
        });
      }
    } finally {
      // Release lock if acquired
      if (lock) {
        try {
          await this.redlock!.release(lock);
        } catch (releaseError) {
          // Ignore release errors
        }
      }
    }
  }

  /**
   * Process payments that have exceeded timeout
   * These payments are marked as EXPIRED and their carts are unlocked
   */
  private async processExpiredPayments(): Promise<number> {
    const cutoffTime = new Date(Date.now() - this.paymentTimeoutMinutes * 60 * 1000);

    // Find expired payments
    const expiredPayments = await this.prisma.payment.findMany({
      where: {
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.CREATED],
        },
        createdAt: {
          lt: cutoffTime,
        },
      },
      select: {
        id: true,
        cartId: true,
        providerOrderId: true,
      },
    });

    if (expiredPayments.length === 0) {
      return 0;
    }

    this.logger.log({
      event: 'PROCESSING_EXPIRED_PAYMENTS',
      count: expiredPayments.length,
    });

    // Process each expired payment
    for (const payment of expiredPayments) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Mark payment as expired
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.EXPIRED },
          });

          // Release cart lock
          if (payment.cartId && payment.cartId > 0) {
            await tx.cart.update({
              where: { id: payment.cartId },
              data: { status: CartStatus.ACTIVE },
            });
          }

          // Create audit event
          await tx.paymentEvent.create({
            data: {
              paymentId: payment.id,
              eventType: 'payment.expired.reconciliation',
              status: PaymentStatus.EXPIRED,
              response: {
                reason: 'payment_timeout',
                cutoffTime: cutoffTime.toISOString(),
              },
            },
          });
        });

        this.logger.log({
          event: 'PAYMENT_EXPIRED',
          paymentId: payment.id,
          cartId: payment.cartId,
        });

      } catch (error) {
        this.logger.error({
          event: 'EXPIRED_PAYMENT_FAILED',
          paymentId: payment.id,
          error: error.message,
        });
      }
    }

    return expiredPayments.length;
  }

  /**
   * Reconcile payments that are in inconsistent state
   * by querying Razorpay for actual status
   */
  private async reconcileStuckPayments(): Promise<number> {
    // Find payments that should be checked (older than reconciliationAgeMinutes)
    const cutoffTime = new Date(Date.now() - this.reconciliationAgeMinutes * 60 * 1000);
    const stuckPayments = await this.prisma.payment.findMany({
      where: {
        status: {
          in: [PaymentStatus.CREATED, PaymentStatus.PENDING],
        },
        createdAt: {
          lt: cutoffTime,
        },
      },
      take: 100, // Limit batch size
    });

    if (stuckPayments.length === 0) {
      return 0;
    }

    this.logger.log({
      event: 'RECONCILING_STUCK_PAYMENTS',
      count: stuckPayments.length,
    });

    let reconciled = 0;

    for (const payment of stuckPayments) {
      try {
        // Query Razorpay API for actual order status
        if (!payment.providerOrderId) {
          this.logger.warn({
            event: 'SKIP_RECONCILE_NO_ORDER_ID',
            paymentId: payment.id,
          });
          continue;
        }

        let razorpayOrder;
        try {
          razorpayOrder = await this.razorpay.orders.fetch(payment.providerOrderId);
        } catch (rzpError: any) {
          // If order not found on Razorpay, mark as failed
          if (rzpError?.statusCode === 404 || rzpError?.message?.includes('not found')) {
            this.logger.warn({
              event: 'RAZORPAY_ORDER_NOT_FOUND',
              paymentId: payment.id,
              providerOrderId: payment.providerOrderId,
            });
            await this.markPaymentFailed(payment.id, 'order_not_found_on_razorpay');
            reconciled++;
            continue;
          }
          throw rzpError;
        }

        const razorpayStatus = razorpayOrder?.status;

        this.logger.log({
          event: 'RECONCILE_ATTEMPT',
          paymentId: payment.id,
          providerOrderId: payment.providerOrderId,
          currentStatus: payment.status,
          razorpayStatus,
        });

        if (razorpayStatus === 'paid') {
          // Payment was successful but webhook was missed - trigger post-payment flow
          this.logger.log({
            event: 'RECONCILE_PAID_FOUND',
            paymentId: payment.id,
            providerOrderId: payment.providerOrderId,
          });

          // Simulate webhook payload to reuse existing flow
          const webhookPayload = {
            event: 'order.paid',
            payload: {
              order: {
                entity: {
                  id: payment.providerOrderId,
                  status: 'paid',
                },
              },
            },
          };

          await this.paymentsService.handleWebhook(webhookPayload, `reconcile_${payment.id}`);
          reconciled++;

        } else if (razorpayStatus === 'expired' || razorpayStatus === 'cancelled') {
          // Mark payment as failed locally
          this.logger.log({
            event: 'RECONCILE_FAILED_FROM_RAZORPAY',
            paymentId: payment.id,
            razorpayStatus,
          });
          await this.markPaymentFailed(payment.id, `razorpay_status_${razorpayStatus}`);
          reconciled++;

        } else {
          // Other statuses (created, authorized, etc) - leave as is, will be retried later
          this.logger.debug({
            event: 'RECONCILE_NO_ACTION',
            paymentId: payment.id,
            razorpayStatus,
          });
        }

      } catch (error) {
        this.logger.error({
          event: 'RECONCILE_FAILED',
          paymentId: payment.id,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    return reconciled;
  }

  /**
   * Mark payment as failed and release cart lock
   */
  private async markPaymentFailed(paymentId: number, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Get payment to check cartId
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { cartId: true },
      });

      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED },
      });

      // Release cart lock if exists
      if (payment?.cartId && payment.cartId > 0) {
        await tx.cart.update({
          where: { id: payment.cartId },
          data: { status: CartStatus.ACTIVE },
        });
      }

      // Create audit event
      await tx.paymentEvent.create({
        data: {
          paymentId,
          eventType: 'payment.failed.reconciliation',
          status: PaymentStatus.FAILED,
          response: {
            reason,
            timestamp: new Date().toISOString(),
          },
        },
      });
    });
  }

  /**
   * Release cart locks for carts that are LOCKED
   * but have no associated pending payment
   */
  private async releaseOrphanedCartLocks(): Promise<number> {
    // Find locked carts with no active payment
    const lockedCarts = await this.prisma.cart.findMany({
      where: {
        status: CartStatus.LOCKED,
      },
    });

    // Filter to only carts with no active payment
    const orphanedCartIds = lockedCarts.map(cart => cart.id);

    if (orphanedCartIds.length === 0) {
      return 0;
    }

    // Find payments for these carts
    const activePayments = await this.prisma.payment.findMany({
      where: {
        cartId: { in: orphanedCartIds },
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.CREATED, PaymentStatus.AUTHORIZED],
        },
      },
      select: { cartId: true },
    });

    const cartsWithActivePayments = new Set(activePayments.map(p => p.cartId));
    const orphanedCarts = lockedCarts.filter(cart => !cartsWithActivePayments.has(cart.id));

    if (orphanedCarts.length === 0) {
      return 0;
    }

    this.logger.log({
      event: 'RELEASING_ORPHANED_CART_LOCKS',
      count: orphanedCarts.length,
    });

    for (const cart of orphanedCarts) {
      try {
        await this.prisma.cart.update({
          where: { id: cart.id },
          data: { status: CartStatus.ACTIVE },
        });

        this.logger.log({
          event: 'ORPHANED_CART_LOCK_RELEASED',
          cartId: cart.id,
        });

      } catch (error) {
        this.logger.error({
          event: 'ORPHANED_CART_RELEASE_FAILED',
          cartId: cart.id,
          error: error.message,
        });
      }
    }

    return orphanedCarts.length;
  }

  /**
   * Manual reconciliation trigger (for admin use)
   */
  async manualReconcile(paymentId: number): Promise<{
    success: boolean;
    message: string;
    currentStatus?: string;
    newStatus?: string;
  }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { success: false, message: 'Payment not found' };
    }

    // Query Razorpay for actual status
    if (!payment.providerOrderId) {
      return {
        success: false,
        message: 'Cannot reconcile: missing provider order ID',
        currentStatus: payment.status,
      };
    }

    try {
      const razorpayOrder = await this.razorpay.orders.fetch(payment.providerOrderId);
      const razorpayStatus = razorpayOrder?.status;

      this.logger.log({
        event: 'MANUAL_RECONCILE',
        paymentId,
        providerOrderId: payment.providerOrderId,
        razorpayStatus,
      });

      if (razorpayStatus === 'paid') {
        const webhookPayload = {
          event: 'order.paid',
          payload: {
            order: {
              entity: {
                id: payment.providerOrderId,
                status: 'paid',
              },
            },
          },
        };
        await this.paymentsService.handleWebhook(webhookPayload, `manual_${payment.id}`);
        return {
          success: true,
          message: 'Payment reconciled and processed as paid',
          currentStatus: payment.status,
          newStatus: 'CAPTURED',
        };
      } else if (razorpayStatus === 'expired' || razorpayStatus === 'cancelled') {
        await this.markPaymentFailed(paymentId, `manual_reconcile_${razorpayStatus}`);
        return {
          success: true,
          message: `Payment marked as failed (Razorpay: ${razorpayStatus})`,
          currentStatus: payment.status,
          newStatus: 'FAILED',
        };
      } else {
        return {
          success: true,
          message: `No action taken - Razorpay status: ${razorpayStatus}`,
          currentStatus: payment.status,
        };
      }
    } catch (error: any) {
      this.logger.error({
        event: 'MANUAL_RECONCILE_FAILED',
        paymentId,
        error: error.message,
      });
      return {
        success: false,
        message: `Reconciliation failed: ${error.message}`,
        currentStatus: payment.status,
      };
    }
  }
}
