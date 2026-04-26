import { Module } from '@nestjs/common';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { VenueAnalyticsController } from './venue-analytics/venue-analytics.controller';
import { VenuePayoutsController } from './venue-payouts/venue-payouts.controller';
import { VenueReviewsController } from './venue-reviews/venue-reviews.controller';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [VenuesController, VenueAnalyticsController, VenuePayoutsController, VenueReviewsController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
