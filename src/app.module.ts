import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
// Feature Modules (UNCHANGED)
import { PrismaModule } from './prisma/prisma.module';
import { VendorsModule } from './vendors/vendors.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { VenuesModule } from './venues/venues.module';
import { AvailabilityModule } from './venues/availability/availability.module';
import { BookingModule } from './venues/booking/booking.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpressModule } from './express/express.module';
import { AIPlannerModule } from './ai-planner/ai-planner.module';

@Module({
  imports: [
    // =====================================================
    // 1️⃣ ENV CONFIG (GLOBAL)
    // =====================================================
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // =====================================================
    // 2️⃣ RATE LIMITING (SECURITY)
    // =====================================================
   ThrottlerModule.forRoot({
  throttlers: [
    {
      ttl: 60,
      limit: 30,
    },
  ],
}),


    // =====================================================
    // 3️⃣ REDIS CACHE (GLOBAL)
    // =====================================================
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        const redis = new Redis({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number(process.env.REDIS_PORT) || 6379,
        });

        return {
          store: {
            get: async (key: string) => {
              const value = await redis.get(key);
              return value ? JSON.parse(value) : null;
            },
            set: async (key: string, value: any, ttl = 300) => {
              await redis.set(
                key,
                JSON.stringify(value),
                'EX',
                ttl,
              );
            },
            del: async (key: string) => {
              await redis.del(key);
            },
          },
        };
      },
    }),

    // =====================================================
    // 4️⃣ SCHEDULER
    // =====================================================
    ScheduleModule.forRoot(),

    // =====================================================
    // 5️⃣ FEATURE MODULES
    // =====================================================
    PrismaModule,
    AuthModule,
    UsersModule,
    VenuesModule,
    AvailabilityModule,
    AIPlannerModule,
    BookingModule,
    VendorsModule,
    CartModule,
    PaymentsModule,
    ExpressModule,
     EventsModule 
  ],
   // 🔐 GLOBAL SECURITY LAYER
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
