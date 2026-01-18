import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { BankAccountController } from './bank-account.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BankAccountService } from './bank-account/bank-account.service';
import {AdminKycController,} from './admin-kyc.controller'
@Module({
  imports: [PrismaModule],
  controllers: [
    KycController,
     AdminKycController,
    BankAccountController, // ✅ REQUIRED
  ],
  providers: [KycService, BankAccountService],
})
export class KycModule {}
