import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../prisma/prisma.service';
import { VendorServicesModule } from './vendor-services/vendor-services.module';

@Module({
  controllers: [VendorsController],
  providers: [VendorsService, PrismaService],
  imports: [VendorServicesModule],
})
export class VendorsModule {}
