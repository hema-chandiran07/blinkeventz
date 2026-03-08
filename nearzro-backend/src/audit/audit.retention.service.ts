import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditSeverity, AuditSource } from '@prisma/client';

@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async purgeExpired(): Promise<void> {
    const now = new Date();

    try {
      const result = await this.prisma.auditLog.deleteMany({
        where: {
          retentionUntil: { lt: now },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Retention Policy: Purged ${result.count} expired logs.`);

        // Log the purge action itself
        await this.prisma.auditLog.create({
          data: {
            action: 'AUDIT_RETENTION_PURGE',
            entityType: 'AuditLog',
            severity: AuditSeverity.INFO,
            source: AuditSource.SERVICE, // Exists in your schema
            description: `System auto-purged ${result.count} logs older than ${now.toISOString()}`,
          },
        });
      }
    } catch (error) {
      this.logger.error('Retention purge failed:', error);
    }
  }
}