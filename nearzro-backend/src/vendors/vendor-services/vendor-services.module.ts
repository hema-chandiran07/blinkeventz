import { Module } from '@nestjs/common';
import { VendorServicesController } from './vendor-services.controller';
import { VendorServicesService } from './vendor-services.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [VendorServicesController],
  providers: [VendorServicesService, PrismaService],
})
export class VendorServicesModule {}
