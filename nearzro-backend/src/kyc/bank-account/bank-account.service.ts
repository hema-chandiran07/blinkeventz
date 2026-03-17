import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AddBankAccountDto } from '../dto/add-bank-account.dto';
import { AuditSeverity, AuditSource } from '@prisma/client';
import { encrypt, hash, mask, decrypt } from '../../common/utils/crypto.util';
import { randomUUID } from 'crypto';

// ─────────────────────────────────────────────────────────────
// Bank Account Service — Production-Grade
// Encrypts account numbers, uses SHA-256 hash for dedup
// ─────────────────────────────────────────────────────────────

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // ADD BANK ACCOUNT
  // ──────────────────────────────────────────────────────────

  async addBankAccount(userId: number, dto: AddBankAccountDto) {
    // 1️⃣ Hash account number for duplicate detection
    const accountNumberHash = hash(dto.accountNumber);

    // 2️⃣ Check for duplicate account number (across all users)
    const existingByHash = await this.prisma.bankAccount.findUnique({
      where: { accountNumberHash },
    });

    if (existingByHash) {
      throw new ConflictException(
        'This bank account number is already registered',
      );
    }

    // 3️⃣ Encrypt account number for storage
    const encryptedAccountNumber = encrypt(dto.accountNumber);

    // 4️⃣ Create bank account
    const account = await this.prisma.bankAccount.create({
      data: {
        userId,
        accountHolder: dto.accountHolder,
        accountNumber: encryptedAccountNumber,
        accountNumberHash,
        ifsc: dto.ifsc,
        bankName: dto.bankName,
        branchName: dto.branchName,
        referenceId: randomUUID(),
      },
    });

    this.logger.log(
      `Bank account added: userId=${userId}, accountId=${account.id}`,
    );

    // 5️⃣ Return masked response
    return this.toSafeResponse(account);
  }

  // ──────────────────────────────────────────────────────────
  // GET BANK ACCOUNTS (User-facing — masked)
  // ──────────────────────────────────────────────────────────

  async getBankAccounts(userId: number) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!accounts.length) {
      return [];
    }

    return accounts.map((acc) => this.toSafeResponse(acc));
  }

  // ──────────────────────────────────────────────────────────
  // VERIFY BANK ACCOUNT (Admin / Webhook)
  // ──────────────────────────────────────────────────────────

  async verifyBankAccount(accountId: number, adminId: number) {
    const account = await this.prisma.bankAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    if (account.isVerified) {
      throw new ConflictException('Bank account is already verified');
    }

    const updated = await this.prisma.bankAccount.update({
      where: { id: accountId },
      data: { isVerified: true },
    });

    // Audit log
    await this.auditService.record({
      entityType: 'BankAccount',
      entityId: String(accountId),
      action: 'BANK_ACCOUNT_VERIFIED',
      severity: AuditSeverity.HIGH,
      source: AuditSource.ADMIN,
      actorId: adminId,
      description: `Bank account #${accountId} verified by admin #${adminId}`,
      metadata: {
        accountId,
        userId: account.userId,
      },
    });

    this.logger.log(
      `Bank account #${accountId} verified by admin #${adminId}`,
    );

    return this.toSafeResponse(updated);
  }

  // ──────────────────────────────────────────────────────────
  // SAFE RESPONSE — Never expose raw account numbers
  // ──────────────────────────────────────────────────────────

  private toSafeResponse(account: {
    id: number;
    userId: number;
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    branchName: string | null;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    // Decrypt then mask the account number
    let maskedAccountNumber: string;
    try {
      const decrypted = decrypt(account.accountNumber);
      maskedAccountNumber = mask(decrypted);
    } catch {
      // If decryption fails (legacy data), mask the raw value
      maskedAccountNumber = mask(account.accountNumber);
    }

    return {
      id: account.id,
      accountHolder: account.accountHolder,
      accountNumber: maskedAccountNumber,
      ifsc: account.ifsc,
      bankName: account.bankName,
      branchName: account.branchName,
      isVerified: account.isVerified,
      createdAt: account.createdAt,
    };
  }
}
