import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CartEventService, CartEventType } from './cart-event.service';

@Injectable()
export class CartExpirationWorker {
  private readonly logger = new Logger(CartExpirationWorker.name);
  private readonly expirationDays = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: CartEventService,
  ) {}

  /**
   * Run every hour to clean up expired carts
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredCarts(): Promise<void> {
    this.logger.log('Starting cart expiration cleanup');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.expirationDays);

    // Find expired carts
    const expiredCarts = await this.prisma.cart.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: { lt: cutoffDate },
      },
      select: { id: true, userId: true },
    });

    if (expiredCarts.length === 0) {
      this.logger.debug('No expired carts found');
      return;
    }

    this.logger.log({ expiredCount: expiredCarts.length }, 'Found expired carts');

    // Process each expired cart
    for (const cart of expiredCarts) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Delete cart items
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id },
          });

          // Update cart status to EXPIRED
          await tx.cart.update({
            where: { id: cart.id },
            data: { status: 'EXPIRED' },
          });

          // Publish event
          await this.eventService.publishEvent(tx, 'CART_EXPIRED', {
            userId: cart.userId,
            cartId: cart.id,
          });
        });

        this.logger.debug({ cartId: cart.id, userId: cart.userId }, 'Cart expired');
      } catch (error) {
        this.logger.error(
          { cartId: cart.id, error: String(error) },
          'Failed to expire cart',
        );
      }
    }

    this.logger.log({ processed: expiredCarts.length }, 'Cart expiration cleanup completed');
  }

  /**
   * Manual cleanup method (for admin use)
   */
  async cleanupExpiredCarts(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.cart.updateMany({
      where: {
        status: 'ACTIVE',
        createdAt: { lt: cutoffDate },
      },
      data: { status: 'EXPIRED' },
    });

    return result.count;
  }
}
