import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <--- 1. Import this
import { ScheduleModule } from '@nestjs/schedule';

// Modules
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

@Module({
  imports: [
    // 2. Add ConfigModule and make it global so AuthModule can use it
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule, // <--- AuthModule handles the strategies and controllers now
    UsersModule,
    VenuesModule,
    AvailabilityModule,
    BookingModule,
    VendorsModule,
    CartModule,
    PaymentsModule,
    ExpressModule,
    TempEventModule,
  ],
  // 3. REMOVED AuthService, GoogleStrategy, and AuthController from here.
  // They belong inside 'AuthModule', not here.
  providers: [], 
  controllers: [],
})
export class AppModule {}