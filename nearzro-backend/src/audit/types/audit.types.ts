import { AuditSeverity, AuditSource, Role } from '@prisma/client';

export interface AuditLogEntry {
  entityType: string;
  entityId?: string;
  action: string;

  severity?: AuditSeverity;
  source?: AuditSource;

  actorId?: number;
  actorEmail?: string;
  actorRole?: Role | null;

  description?: string;

  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  diff?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;

  retentionUntil?: Date;

  // Correlation IDs for tracing
  requestId?: string;
  sessionId?: string;
  traceId?: string;
}
