import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { VendorsModule } from './vendors/vendors.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [PrismaModule, VendorsModule, CartModule, PaymentsModule],
})
export class AppModule {}
