import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseStorageService } from '../storage/database-storage.service';
import { VendorServicesModule } from './vendor-services/vendor-services.module';
import { VendorAnalyticsController } from './vendor-analytics/vendor-analytics.controller';
import { VendorReviewsController } from './vendor-reviews/vendor-reviews.controller';
import { VendorPayoutsController } from './vendor-payouts/vendor-payouts.controller';

@Module({
  controllers: [VendorsController, VendorAnalyticsController, VendorReviewsController, VendorPayoutsController],
  providers: [VendorsService, PrismaService, DatabaseStorageService],
  imports: [VendorServicesModule],
  exports: [VendorsService],
})
export class VendorsModule {}
