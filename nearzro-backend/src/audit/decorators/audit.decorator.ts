import { SetMetadata } from '@nestjs/common';
import { AuditSeverity, AuditSource } from '@prisma/client';

export const AUDIT_META_KEY = 'AUDIT_META';

export interface AuditMeta {
  action: string;
  entityType: string;
  severity?: AuditSeverity;
  source?: AuditSource;
}

export const Audit = (meta: AuditMeta) =>
  SetMetadata(AUDIT_META_KEY, meta);