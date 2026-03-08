// src/audit/audit.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, AuditOutboxStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditProcessor {
  private readonly logger = new Logger(AuditProcessor.name);
  private readonly BATCH_SIZE = 100;

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/10 * * * * *') // every 10 seconds
  async process(): Promise<void> {
    const items = await this.prisma.auditOutbox.findMany({
      where: { status: AuditOutboxStatus.PENDING },
      take: this.BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    });

    for (const item of items) {
      try {
        await this.prisma.auditLog.create({
          data: item.payload as Prisma.AuditLogCreateInput,
        });

        await this.prisma.auditOutbox.update({
          where: { id: item.id },
          data: {
            status: AuditOutboxStatus.PROCESSED,
            processedAt: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(`Audit failed id=${item.id}`, error);

        await this.prisma.auditOutbox.update({
          where: { id: item.id },
          data: {
            attempts: { increment: 1 },
            status:
              item.attempts + 1 >= 5
                ? AuditOutboxStatus.DEAD_LETTER
                : AuditOutboxStatus.FAILED,
            lastError: String(error),
          },
        });
      }
    }
  }
}