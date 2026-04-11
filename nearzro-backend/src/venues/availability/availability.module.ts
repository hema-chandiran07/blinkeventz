import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VenuesModule } from '../venues.module';
import { VendorsModule } from '../../vendors/vendors.module';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, PrismaService],
  imports: [VenuesModule, VendorsModule],
})
export class AvailabilityModule {}
