import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditProcessor } from './audit.processor';
import { AuditOutboxService } from './audit.outbox.service';
import { AuditRetentionService } from './audit.retention.service';
import { AuditController } from './audit.controller'

@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditInterceptor,
    AuditProcessor,
    AuditOutboxService,
    AuditRetentionService,
  ],
  exports: [AuditService],
})
export class AuditModule {}