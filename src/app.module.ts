import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { VendorsModule } from './vendors/vendors.module';

@Module({
  imports: [PrismaModule, VendorsModule],
})
export class AppModule {}
