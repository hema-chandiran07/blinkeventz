import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type CartEventType = 
  | 'CART_ITEM_ADDED'
  | 'CART_ITEM_REMOVED'
  | 'CART_ITEM_UPDATED'
  | 'CART_CLEARED'
  | 'CART_CHECKED_OUT'
  | 'CART_EXPIRED';

export interface CartEventPayload {
  userId: number;
  cartId: number;
  itemId?: number;
  itemCount?: number;
  totalAmount?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CartEventService {
  private readonly logger = new Logger(CartEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Publish event to outbox table (transactional)
   */
  async publishEvent(
    tx: Prisma.TransactionClient,
    eventType: CartEventType,
    payload: CartEventPayload,
  ): Promise<void> {
    try {
      await tx.$executeRaw`
        INSERT INTO "OutboxEvent" (id, "eventType", payload, "createdAt", processed)
        VALUES (gen_random_uuid()::text, ${eventType}, ${JSON.stringify(payload)}::jsonb, NOW(), false)
      `;
      
      this.logger.debug(
        { eventType, userId: payload.userId, cartId: payload.cartId },
        'Event published to outbox',
      );
    } catch (error) {
      this.logger.error(
        { eventType, payload, error: String(error) },
        'Failed to publish event to outbox',
      );
      // Don't throw - outbox failure shouldn't block the main operation
    }
  }

  /**
   * Process cart events (called by background job or message queue)
   */
  async processOutboxEvents(limit: number = 100): Promise<number> {
    const events = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "OutboxEvent"
      WHERE processed = false
      ORDER BY "createdAt" ASC
      LIMIT ${limit}
    `;

    if (events.length === 0) {
      return 0;
    }

    const eventIds = events.map((e) => e.id);
    
    // Mark as processed (in bulk)
    await this.prisma.$executeRaw`
      UPDATE "OutboxEvent"
      SET processed = true
      WHERE id IN (${Prisma.join(eventIds)})
    `;

    this.logger.log({ processedCount: eventIds.length }, 'Processed cart outbox events');
    return eventIds.length;
  }

  /**
   * Create cart event (convenience method)
   */
  async emitCartEvent(
    eventType: CartEventType,
    payload: CartEventPayload,
  ): Promise<void> {
    await this.publishEvent(this.prisma, eventType, payload);
  }
}
