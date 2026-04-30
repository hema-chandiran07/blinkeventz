import { Module } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { PricingService } from './pricing.service';
import { CancellationPolicyService } from './cancellation-policy.service';
import { FraudDetectionService } from './fraud-detection.service';
import { PaymentSplitService } from './payment-split.service';
import { CartCalculationService } from './cart-calculation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [
    CommissionService,
    PricingService,
    CancellationPolicyService,
    FraudDetectionService,
    PaymentSplitService,
    CartCalculationService,
  ],
  exports: [
    CommissionService,
    PricingService,
    CancellationPolicyService,
    FraudDetectionService,
    PaymentSplitService,
    CartCalculationService,
  ],
})
export class BusinessRulesModule {}
