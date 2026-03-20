// src/audit/audit.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuditService } from './audit.service';
import { AuditSeverity, AuditSource } from '@prisma/client';
import { AuditLogEntry } from './types/audit.types';
import { mapJwtRoleToPrismaRole } from './utils/role-mapper.utils';
import { maskSensitiveData } from './utils/mask.util';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const auditMeta = this.reflector.get('audit', context.getHandler());
    if (!auditMeta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const user = req.user;

    // Safely extract headers with fallbacks
    const headers = req.headers || {};
    const ip = req.ip || undefined;
    const userAgent = headers['user-agent'] || undefined;

    // Generate correlation ID for tracing
    const traceId = headers['x-trace-id'] || this.generateTraceId();
    const sessionId = req.sessionID || this.generateSessionId();

    // Subscribe to the Observable to get the response synchronously
    const response = await next.handle().toPromise();

    // Mask sensitive data before logging
    const maskedResponse = maskSensitiveData(response);
    const maskedMetadata = maskSensitiveData({
      ip,
      userAgent,
      traceId,
      sessionId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
    });

    const event: AuditLogEntry = {
      action: auditMeta.action,
      entityType: auditMeta.entityType,

      actorId: user?.userId,
      actorEmail: user?.email,
      actorRole: mapJwtRoleToPrismaRole(user?.role),

      severity: auditMeta.severity || AuditSeverity.INFO,
      source: AuditSource.USER,

      newValue: maskedResponse,
      metadata: maskedMetadata,

      // Correlation IDs for tracing
      requestId: traceId,
      sessionId: sessionId,
    };

    // Fire-and-forget - don't block the response
    this.auditService.record(event).catch((err) => {
      this.logger.error(
        `Audit write failed [traceId=${traceId}]`,
        err.stack || err.message,
      );
    });

    return response;
  }

  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
