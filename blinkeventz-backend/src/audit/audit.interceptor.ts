import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditSeverity, AuditSource } from '@prisma/client';
import { AuditLogEntry } from './types/audit.types';
import { mapJwtRoleToPrismaRole } from './utils/role-mapper.utils';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const auditMeta = this.reflector.get('audit', context.getHandler());
    if (!auditMeta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    return next.handle().pipe(
      tap((response) => {
        const event: AuditLogEntry = {
          action: auditMeta.action,
          entityType: auditMeta.entityType,

          actorId: user?.userId,
          actorEmail: user?.email,
          actorRole: mapJwtRoleToPrismaRole(user?.role), // ✅ FIXED

          severity: AuditSeverity.INFO,
          source: AuditSource.USER,

          newValue: response,
          metadata: {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        };

        // 🔥 Fire-and-forget
        this.auditService.record(event).catch((err) => {
          this.logger.error('Audit write failed', err);
        });
      }),
    );
  }
}