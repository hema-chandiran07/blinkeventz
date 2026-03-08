import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { AdminKycController } from './admin-kyc.controller';
import { BankAccountController } from './bank-account.controller';
import { BankAccountService } from './bank-account/bank-account.service';
import { BankWebhookController } from './bank-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuditModule,
  ],
  controllers: [
    KycController,
    AdminKycController,
    BankAccountController,
    BankWebhookController,
  ],
  providers: [
    KycService,
    BankAccountService,
  ],
  exports: [
    KycService,
    BankAccountService,
  ],
})
export class KycModule {}
