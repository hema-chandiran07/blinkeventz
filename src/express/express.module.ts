import { Module } from '@nestjs/common';
import { ExpressService } from './express.service';
import { ExpressController } from './express.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TempEventModule } from '../temp-event/temp-event.module';
import { ExpressCron } from './express.cron';

@Module({
  imports: [PrismaModule, TempEventModule],
  controllers: [ExpressController],
  providers: [ExpressService, ExpressCron],
})
export class ExpressModule {}
