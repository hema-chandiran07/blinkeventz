import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { VendorsModule } from './vendors/vendors.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpressModule } from './express/express.module';
import { TempEventModule } from './temp-event/temp-event.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    VendorsModule,
    CartModule,
    PaymentsModule,
    ExpressModule,
    TempEventModule,
    ScheduleModule.forRoot(), 
  ],
})
export class AppModule {}
