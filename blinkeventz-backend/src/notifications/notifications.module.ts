import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationQueue } from './queue/notification.queue';
import { NotificationProcessor } from './queue/notification.processor';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsappProvider } from './providers/whatsapp.provider';
import { InAppProvider } from './providers/inapp.provider';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,

    // ✅ Redis connection
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'redis',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),

    // ✅ QUEUE REGISTRATION (THIS FIXES YOUR ERROR)
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationQueue,
    NotificationProcessor,
    EmailProvider,
    SmsProvider,
    WhatsappProvider,
    InAppProvider,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
