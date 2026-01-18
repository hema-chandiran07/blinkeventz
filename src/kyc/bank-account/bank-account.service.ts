import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddBankAccountDto } from '../dto/add-bank-account.dto';
import { BankAccount } from '@prisma/client';

@Injectable()
export class BankAccountService {
  constructor(private prisma: PrismaService) {}

  async addBankAccount(
  userId: number,
  dto: AddBankAccountDto,
) {
  return this.prisma.bankAccount.create({
    data: {
      accountHolder: dto.accountHolder, // ✅ REQUIRED

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
    return this.prisma.bankAccount.findMany({ where: { userId } });
  }
}
