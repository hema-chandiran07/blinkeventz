import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { VendorsModule } from './vendors/vendors.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TempEventModule } from './temp-event/temp-event.module';
import { EventsModule } from './events/events.module';
import { VenuesModule } from './venues/venues.module';
import { AvailabilityModule } from './venues/availability/availability.module';
import { BookingModule } from './venues/booking/booking.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpressModule } from './express/express.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AIPlannerModule } from './ai-planner/ai-planner.module'

@Module({
  imports: [
    PrismaModule,
     AuthModule,
    UsersModule,
    VenuesModule,
    AvailabilityModule,
    BookingModule,
    VendorsModule,
    CartModule,
    PaymentsModule,
    ExpressModule,
    TempEventModule,
    ScheduleModule.forRoot(),
    AIPlannerModule,
  ],
})
export class AppModule {}
