// src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RazorpayProvider } from './razorpay.provider';
import { RazorpayWebhookController } from './webhooks/razorpay-webhook.controller';
import { PaymentReconciliationJob } from './jobs/payment-reconciliation.job';
import { PrismaModule } from '../prisma/prisma.module';
<<<<<<< Updated upstream
import { CartModule } from '../cart/cart.module';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
=======
import { BusinessRulesModule } from '../business-rules/business-rules.module';
import { EventsModule } from '../events/events.module';
>>>>>>> Stashed changes

@Module({
  imports: [
    PrismaModule,
    BusinessRulesModule,
    ScheduleModule.forRoot(),
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
