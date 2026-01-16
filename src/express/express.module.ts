import { Module } from '@nestjs/common';
import { ExpressService } from './express.service';
import { ExpressController } from './express.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { ExpressCron } from './express.cron';

@Module({
  imports: [
    PrismaModule,
    EventsModule, // ✅ REAL events, not temp
  ],
  controllers: [ExpressController],
  providers: [ExpressService, ExpressCron],
})
export class ExpressModule {}
