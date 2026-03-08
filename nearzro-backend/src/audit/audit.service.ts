// src/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, AuditSeverity, AuditSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogEntry } from './types/audit.types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditLogEntry): Promise<void> {
    try {
      const payload: Prisma.AuditLogCreateInput = {
        entityType: entry.entityType,
        entityId: entry.entityId ?? undefined,
        action: entry.action,

        severity: entry.severity ?? AuditSeverity.INFO,
        source: entry.source ?? AuditSource.SYSTEM,

        actorId: entry.actorId ?? undefined,
        actorEmail: entry.actorEmail ?? undefined,
        actorRole: entry.actorRole as any,

        description: entry.description ?? undefined,

        oldValue: this.toPrismaJson(entry.oldValue),
        newValue: this.toPrismaJson(entry.newValue),
        diff: this.toPrismaJson(entry.diff),
        metadata: this.toPrismaJson(entry.metadata),

        retentionUntil: entry.retentionUntil ?? undefined,
        occurredAt: new Date(),
      };

      await this.prisma.auditOutbox.create({
        data: {
          payload: payload as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // 🔥 NEVER break business flow
      this.logger.error('Failed to write audit outbox', error);
    }
  }

  private toPrismaJson(
    value?: Record<string, unknown> | null,
  ): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.DbNull;
    return value as Prisma.InputJsonValue;
  }
}