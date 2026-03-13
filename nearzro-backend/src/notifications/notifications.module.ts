import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';

import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

import { NotificationQueue } from './queue/notification.queue';
import { NotificationProcessor } from './queue/notification.processor';

import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsappProvider } from './providers/whatsapp.provider';
import { PushProvider } from './providers/push.provider';
import { InAppProvider } from './providers/inapp.provider';

import { NotificationGateway } from './websocket/notification.gateway';

@Module({
  imports: [
    PrismaModule,

    // ✅ ONLY @nestjs/bull
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),

    // ✅ QUEUE NAME = notifications
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],

  controllers: [NotificationsController],

  providers: [
    NotificationsService,
    NotificationQueue,
    NotificationProcessor,
    NotificationGateway,

    EmailProvider,
    SmsProvider,
    WhatsappProvider,
    PushProvider,
    InAppProvider,
  ],
})
export class NotificationsModule {}
