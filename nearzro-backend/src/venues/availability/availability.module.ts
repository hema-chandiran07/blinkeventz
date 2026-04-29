import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { VenuesModule } from '../venues.module';
import { VendorsModule } from '../../vendors/vendors.module';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  imports: [VenuesModule, VendorsModule],
})
export class AvailabilityModule {}
