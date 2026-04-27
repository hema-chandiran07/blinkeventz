// src/payments/payments.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RazorpayProvider } from './razorpay.provider';
import { RazorpayWebhookController } from './webhooks/razorpay-webhook.controller';
import { PaymentReconciliationJob } from './jobs/payment-reconciliation.job';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CartModule),
    forwardRef(() => SettingsModule),
    forwardRef(() => NotificationsModule),
    ScheduleModule.forRoot(),
    EventsModule,
  ],
  controllers: [
    PaymentsController, 
    RazorpayWebhookController
  ],
  providers: [
    PaymentsService, 
    RazorpayProvider,
    PaymentReconciliationJob,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
