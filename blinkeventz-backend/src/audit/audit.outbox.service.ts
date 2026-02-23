import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AuditOutboxStatus } from '@prisma/client';

@Injectable()
export class AuditOutboxService {
  private readonly logger = new Logger(AuditOutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Processes a batch of pending audit logs from the outbox
   */
  async processBatch(batchSize: number = 100): Promise<void> {
    const items = await this.prisma.auditOutbox.findMany({
      where: { status: AuditOutboxStatus.PENDING },
      take: batchSize,
      orderBy: { createdAt: 'asc' },
    });

    if (items.length === 0) return;

    for (const item of items) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Create the actual Audit Log
          await tx.auditLog.create({
            data: item.payload as unknown as Prisma.AuditLogCreateInput,
          });

          // 2. Mark outbox item as processed
          await tx.auditOutbox.update({
            where: { id: item.id },
            data: {
              status: AuditOutboxStatus.PROCESSED,
              processedAt: new Date(),
            },
          });
        });
      } catch (error) {
        this.logger.error(`Failed to process audit outbox item ${item.id}:`, error);

        await this.prisma.auditOutbox.update({
          where: { id: item.id },
          data: {
            status: AuditOutboxStatus.FAILED,
            attempts: { increment: 1 },
            lastError: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  }
}