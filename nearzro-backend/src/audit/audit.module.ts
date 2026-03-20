import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditProcessor } from './audit.processor';
import { AuditOutboxService } from './audit.outbox.service';
import { AuditRetentionService } from './audit.retention.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditInterceptor,
    AuditProcessor,
    AuditOutboxService,
    AuditRetentionService,
    // Provide the interceptor globally for use with @UseInterceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
