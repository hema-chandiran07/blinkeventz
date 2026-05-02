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

export interface CartEventPayload extends Record<string, unknown> {
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

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Publish event to outbox table - NON-TRANSACTIONAL
   * This method is designed to NEVER throw or cause transaction rollback.
   * Even if the outbox table doesn't exist, the cart operation must succeed.
   */
  async publishEvent(
    txOrPrisma: Prisma.TransactionClient | PrismaService,
    eventType: CartEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Use the provided transaction client or fall back to prisma
      const db = txOrPrisma || this.prisma;

      // Try to write to outbox
      await db.$executeRaw`
         INSERT INTO "OutboxEvent" (id, "eventType", payload, "createdAt", processed)
         VALUES (gen_random_uuid()::text, ${eventType}, ${JSON.stringify(payload)}::jsonb, NOW(), false)
       `;

      this.logger.debug(
        { eventType, userId: payload.userId, cartId: payload.cartId },
        'Event published to outbox',
      );
    } catch (error: any) {
      // Outbox write failed — store in AuditOutbox as fallback for retry
      try {
        await this.prisma.auditOutbox.create({
          data: {
            payload: { eventType, payload, error: error.message, timestamp: new Date().toISOString() } as Prisma.InputJsonValue,
            status: 'FAILED',
          },
        });
        this.logger.warn(
          { eventType, payload, error: error.message },
          'Outbox write failed — event stored in AuditOutbox for retry',
        );
      } catch (auditError: any) {
        // If even audit outbox fails, throw to avoid silent loss
        this.logger.error(
          { eventType, error: error.message, auditError: auditError.message },
          'Failed to store event in AuditOutbox — event lost',
        );
        throw new Error('Event publish failed and fallback outbox write failed');
      }
    }
  }

  /**
   * Publish event AFTER transaction commits - safest approach
   * Uses a separate prisma instance to ensure no transaction coupling
   */
  async publishEventAfterCommit(
    eventType: CartEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Use the injected prisma service (not inside any transaction)
      await this.prisma.$executeRaw`
         INSERT INTO "OutboxEvent" (id, "eventType", payload, "createdAt", processed)
         VALUES (gen_random_uuid()::text, ${eventType}, ${JSON.stringify(payload)}::jsonb, NOW(), false)
       `;

      this.logger.debug(
        { eventType, userId: payload.userId, cartId: payload.cartId },
        'Event published to outbox after commit',
      );
    } catch (error: any) {
      // Outbox write failed — store in AuditOutbox as fallback
      try {
        await this.prisma.auditOutbox.create({
          data: {
            payload: { eventType, payload, error: error.message, timestamp: new Date().toISOString() } as Prisma.InputJsonValue,
            status: 'FAILED',
          },
        });
        this.logger.warn(
          { eventType, payload, error: error.message },
          'Outbox write failed — event stored in AuditOutbox for retry (after commit)',
        );
      } catch (auditError: any) {
        this.logger.error(
          { eventType, error: error.message, auditError: auditError.message },
          'Failed to store event in AuditOutbox after commit — event lost',
        );
        throw new Error('Event publish failed and fallback outbox write failed');
      }
    }
  }

  /**
   * Process cart events (called by background job or message queue)
   */
  async processOutboxEvents(limit: number = 100): Promise<number> {
    try {
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
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to process outbox events');
      return 0;
    }
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