import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { EventOwnerGuard } from './guards/event-owner.guard';
import { EventManagerGuard } from './guards/event-manager.guard';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [
    EventsService,
    EventOwnerGuard,
    EventManagerGuard,
  ],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
