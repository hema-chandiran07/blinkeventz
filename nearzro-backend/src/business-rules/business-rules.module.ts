import { Module } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { PricingService } from './pricing.service';
import { CancellationPolicyService } from './cancellation-policy.service';
import { FraudDetectionService } from './fraud-detection.service';
import { PaymentSplitService } from './payment-split.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [
    CommissionService,
    PricingService,
    CancellationPolicyService,
    FraudDetectionService,
    PaymentSplitService,
  ],
  exports: [
    CommissionService,
    PricingService,
    CancellationPolicyService,
    FraudDetectionService,
    PaymentSplitService,
  ],
})
export class BusinessRulesModule {}
