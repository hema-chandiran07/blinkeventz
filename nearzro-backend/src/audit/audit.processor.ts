// src/audit/audit.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from './audit.outbox.service';

@Injectable()
export class AuditProcessor {
  private readonly logger = new Logger(AuditProcessor.name);
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: AuditOutboxService,
  ) {}

  @Cron('*/10 * * * * *') // every 10 seconds
  async process(): Promise<void> {
    try {
      await this.outboxService.processBatch(this.BATCH_SIZE);
    } catch (error) {
      this.logger.error('Audit processing failed:', error);
    }
  }

  /**
   * Manual trigger for processing (useful for testing or admin actions)
   */
  async processNow(batchSize?: number): Promise<void> {
    await this.outboxService.processBatch(batchSize || this.BATCH_SIZE);
  }
}
