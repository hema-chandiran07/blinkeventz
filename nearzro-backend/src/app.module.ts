import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import Redis from 'ioredis';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { BullModule } from '@nestjs/bull';
import { join } from 'path';
import Joi from 'joi';
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
import { NotificationsModule } from './notifications/notifications.module';
import { KycModule } from './kyc/kyc.module';
import { AuditModule } from './audit';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PayoutsModule } from './payouts/payouts.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AIChatModule } from './ai-chatbot/ai-chat.module';
import { SettingsModule } from './settings/settings.module';
import { ReportsModule } from './reports/reports.module';
import { BusinessRulesModule } from './business-rules/business-rules.module';
import { ContactModule } from './contact/contact.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    // =====================================================
    // 1️⃣ ENV CONFIG (GLOBAL) - With Validation
    // =====================================================
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        // Database - Required
        DATABASE_URL: Joi.string().required(),

        // Redis - Required
        REDIS_HOST: Joi.string().default('redis'),
        REDIS_PORT: Joi.number().default(6379),

        // OpenAI - Optional (will disable AI features if missing)
        OPENAI_API_KEY: Joi.string().optional(),
        OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),

        // JWT - Required
        JWT_SECRET: Joi.string().required(),

        // App Settings
        APP_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

        // Feature Flags
        USE_REDIS: Joi.boolean().default(true),

        // Email - Gmail SMTP (Optional)
        GMAIL_USER: Joi.string().optional(),
        GMAIL_APP_PASSWORD: Joi.string().optional(),
        EMAIL_FROM: Joi.string().optional(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // =====================================================
    // 📁 STATIC FILES (UPLOADS)
    // =====================================================
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      renderPath: '/uploads', // Restrict rendering to avoid hijacking other routes
      serveStaticOptions: {
        index: false, // CRITICAL: Disable index.html fallback for missing files
      },
    }),

    // =====================================================
    // 2️⃣ RATE LIMITING (SECURITY)
    // =====================================================
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 30,
      },
    ]),


    // =====================================================
    // 3️⃣ REDIS CACHE (GLOBAL)
    // =====================================================
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        // Use memory cache if Redis is unavailable
        const useRedis = process.env.USE_REDIS !== 'false';

        if (useRedis) {
          const redis = new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: Number(process.env.REDIS_PORT) || 6379,
            lazyConnect: true,
            retryStrategy: (times) => Math.min(times * 50, 2000),
          });

          redis.on('error', (err) => {
            console.log('⚠️  Redis connection error - falling back to memory cache');
          });

          return {
            store: {
              get: async (key: string) => {
                const value = await redis.get(key);
                return value ? JSON.parse(value) : null;
              },
              set: async (key: string, value: any, ttl = 300) => {
                await redis.set(key, JSON.stringify(value), 'EX', ttl);
              },
              del: async (key: string) => {
                await redis.del(key);
              },
            },
          };
        }

        // Fallback to memory-only cache
        const memoryStore = new Map<string, { value: any; expiry: number }>();
        return {
          store: {
            get: async (key: string) => {
              const item = memoryStore.get(key);
              if (!item || item.expiry < Date.now()) {
                memoryStore.delete(key);
                return null;
              }
              return item.value;
            },
            set: async (key: string, value: any, ttl = 300) => {
              memoryStore.set(key, { value, expiry: Date.now() + ttl * 1000 });
            },
            del: async (key: string) => {
              memoryStore.delete(key);
            },
          },
        };
      },
    }),
    // 🐂 BULLMQ (GLOBAL REDIS CONNECTION)
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
      // Queue-level config controls retries - not global
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
    AIChatModule,
    BookingModule,
    VendorsModule,
    CartModule,
    PaymentsModule,
    ExpressModule,
    EventsModule,
    NotificationsModule,
    KycModule,
    AuditModule,
    HealthModule,
    DashboardModule,
    PayoutsModule,
    PromotionsModule,
    ReviewsModule,
    AnalyticsModule,
    ApprovalsModule,
    SettingsModule,
    ReportsModule,
    BusinessRulesModule,
    ContactModule,
    SearchModule,
  ],
  // 🔐 GLOBAL SECURITY LAYER
  providers: [
    // MaintenanceGuard temporarily disabled for debugging
    // {
    //   provide: APP_GUARD,
    //   useClass: MaintenanceGuard,
    // },
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
export class AppModule { }
