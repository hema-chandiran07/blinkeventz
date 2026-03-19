import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartCacheService } from './cart.cache.service';
import { CartEventService } from './cart-event.service';
import { CartExpirationWorker } from './cart.expiration.worker';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [CartController],
  providers: [
    CartService,
    CartCacheService,
    CartEventService,
    CartExpirationWorker,
  ],
  exports: [CartService],
})
export class CartModule {}
