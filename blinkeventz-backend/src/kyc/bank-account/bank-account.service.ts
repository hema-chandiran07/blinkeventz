import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddBankAccountDto } from '../dto/add-bank-account.dto';
import { BankAccount } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class BankAccountService {
  constructor(private prisma: PrismaService) {}

  async addBankAccount(
    userId: number,
    dto: AddBankAccountDto,
  ): Promise<BankAccount> {

    // ✅ Check if a verified bank account already exists
    const existing = await this.prisma.bankAccount.findFirst({
      where: {
        userId,
        isVerified: true,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Verified bank account already exists',
      );
    }

    // ✅ Create new bank account
    return this.prisma.bankAccount.create({
      data: {
        accountHolder: dto.accountHolder,
        accountNumber: dto.accountNumber,
        ifsc: dto.ifsc,
        bankName: dto.bankName,
        branchName: dto.branchName,
        referenceId: crypto.randomUUID(),

        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async getBankAccounts(userId: number): Promise<BankAccount[]> {
    return this.prisma.bankAccount.findMany({
      where: { userId },
    });
  }
}
