import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { VendorsModule } from './vendors/vendors.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [PrismaModule, VendorsModule, CartModule],
})
export class AppModule {}
