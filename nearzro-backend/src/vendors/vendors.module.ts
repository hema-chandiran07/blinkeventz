import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { DatabaseStorageService } from '../storage/database-storage.service';
import { VendorServicesModule } from './vendor-services/vendor-services.module';
import { VendorAnalyticsController } from './vendor-analytics/vendor-analytics.controller';
import { VendorReviewsController } from './vendor-reviews/vendor-reviews.controller';

@Module({
  controllers: [VendorsController, VendorAnalyticsController, VendorReviewsController],
  providers: [VendorsService, DatabaseStorageService],
  imports: [VendorServicesModule],
  exports: [VendorsService],
})
export class VendorsModule {}
