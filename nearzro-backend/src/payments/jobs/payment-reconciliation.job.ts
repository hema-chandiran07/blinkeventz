// src/payments/jobs/payment-reconciliation.job.ts
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, CartStatus } from '@prisma/client';
import { PaymentsService } from '../payments.service';

/**
 * Payment Reconciliation Job
 * 
 * Runs periodically to:
 * 1. Find pending payments that have exceeded timeout
 * 2. Verify payment status with Razorpay
 * 3. Auto-heal any state inconsistencies
 * 4. Release stale cart locks
 * 
 * This is a critical reliability mechanism for handling:
 * - Missed webhooks
 * - Network failures
 * - Client-side crashes during payment
 * - Race conditions
 */
@Injectable()
export class PaymentReconciliationJob {
  private readonly logger = new Logger(PaymentReconciliationJob.name);
  private readonly paymentTimeoutMinutes = 30;
  private readonly maxReconciliationRetries = 3;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Run reconciliation every 10 minutes
   */
  @Cron('*/10 * * * *')
  async reconcile(): Promise<void> {
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

    } catch (error) {
      this.logger.error({
        event: 'RECONCILIATION_FAILED',
        error: error.message,
        stack: error.stack,
      });
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
    // Find payments that should be checked
    const stuckPayments = await this.prisma.payment.findMany({
      where: {
        status: {
          in: [PaymentStatus.CREATED, PaymentStatus.PENDING],
        },
        // Only check payments that have been pending for a reasonable time
        createdAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000), // At least 5 minutes old
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
        // In a real implementation, this would query Razorpay API
        // For now, we'll log the reconciliation attempt
        this.logger.log({
          event: 'RECONCILE_ATTEMPT',
          paymentId: payment.id,
          providerOrderId: payment.providerOrderId,
          currentStatus: payment.status,
        });

        // TODO: Query Razorpay API for actual status
        // const razorpayOrder = await razorpay.orders.fetch(payment.providerOrderId);
        // if (razorpayOrder.status === 'paid') {
        //   // Payment was successful but webhook was missed
        //   await this.paymentsService.handleWebhook({...});
        // }

      } catch (error) {
        this.logger.error({
          event: 'RECONCILE_FAILED',
          paymentId: payment.id,
          error: error.message,
        });
      }
    }

    return reconciled;
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

    // TODO: Query Razorpay for actual status
    // For now, just return current status
    return {
      success: true,
      message: 'Reconciliation requires Razorpay API integration',
      currentStatus: payment.status,
    };
  }
}
