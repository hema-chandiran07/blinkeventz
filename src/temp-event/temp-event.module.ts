import { Module } from '@nestjs/common';
import { TempEventService } from './temp-event.service';
import { TempEventController } from './temp-event.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TempEventService],
  controllers: [TempEventController],
  exports: [TempEventService],
})
export class TempEventModule {}
