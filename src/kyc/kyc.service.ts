import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { KycStatus, BankAccount } from '@prisma/client';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import * as crypto from 'crypto';

@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) {}

  // ----------------------
  // KYC Methods
  // ----------------------

  async submitKycWithFile(
    userId: number,
    dto: SubmitKycDto,
    file: Express.Multer.File,
  ) {
    // ✅ Check if KYC already exists (PENDING or APPROVED)
 const active = await this.prisma.kycDocument.findFirst({
  where: {
    userId,
    status: {
      in: [KycStatus.PENDING, KycStatus.VERIFIED],
    },
  },
});

if (active) {
  throw new BadRequestException('KYC already submitted');
}

    const fileUrl = `https://cdn.yourapp.com/kyc/${file.originalname}`;

    return this.prisma.kycDocument.create({
      data: {
        userId,
        docType: dto.docType,
        docNumber: dto.docNumber,
        docFileUrl: fileUrl,
        status: KycStatus.PENDING,
      },
    });
  }

  async getMyKyc(userId: number) {
    const kycDocs = await this.prisma.kycDocument.findMany({
      where: { userId },
    });

    if (!kycDocs.length) {
      throw new NotFoundException('No KYC documents found for this user');
    }

    return kycDocs;
  }

  // ----------------------
  // Bank Account Methods
  // ----------------------

  async addBankAccount(
    userId: number,
    dto: AddBankAccountDto,
  ): Promise<BankAccount> {
    return this.prisma.bankAccount.create({
      data: {
        referenceId: crypto.randomUUID(),
        accountHolder: dto.accountHolder,
        accountNumber: dto.accountNumber,
        ifsc: dto.ifsc,
        bankName: dto.bankName,
        branchName: dto.branchName,
        userId,
      },
    });
  }

  async getBankAccounts(userId: number): Promise<BankAccount[]> {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { userId },
    });

    if (!accounts.length) {
      throw new NotFoundException('No bank accounts found for this user');
    }

    return accounts;
  }

  // ----------------------
  // Admin / Update Methods
  // ----------------------

  async updateKycStatus(
    kycId: number,
    status: KycStatus,
  ) {
    const kyc = await this.prisma.kycDocument.findUnique({
      where: { id: kycId },
    });

    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }

    return this.prisma.kycDocument.update({
      where: { id: kycId },
      data: { status },
    });
  }
}
