import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { AuditService } from '../audit/audit.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { KycStatus, AuditSeverity, AuditSource } from '@prisma/client';
import { encrypt, hash } from '../common/utils/crypto.util';

// ─────────────────────────────────────────────────────────────
// KYC Service — Production-Grade
// Handles document submission, retrieval, and admin approval
// ─────────────────────────────────────────────────────────────

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly auditService: AuditService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // SUBMIT KYC WITH FILE
  // ──────────────────────────────────────────────────────────

  async submitKycWithFile(
    userId: number,
    dto: SubmitKycDto,
    file: Express.Multer.File,
  ) {
    return this.createKyc(userId, dto, file);
  }

  async createKyc(
    userId: number,
    dto: SubmitKycDto,
    file: Express.Multer.File,
  ) {
    // 1️⃣ Prevent duplicate PENDING or VERIFIED KYC
    const activeKyc = await this.prisma.kycDocument.findFirst({
      where: {
        userId,
        status: { in: [KycStatus.PENDING, KycStatus.VERIFIED] },
      },
    });

    if (activeKyc) {
      throw new ConflictException(
        `KYC already ${activeKyc.status === KycStatus.PENDING ? 'submitted and pending review' : 'verified'}`,
      );
    }

    // 2️⃣ Hash the doc number for duplicate detection across all users
    const docNumberHash = hash(dto.docNumber);

    const duplicateDoc = await this.prisma.kycDocument.findFirst({
      where: {
        docType: dto.docType,
        docNumberHash,
        status: { in: [KycStatus.PENDING, KycStatus.VERIFIED] },
      },
    });

    if (duplicateDoc) {
      throw new ConflictException(
        'This document number is already registered with another account',
      );
    }

    // 3️⃣ Save document locally (instead of S3 for now)
    const docFileUrl = `/uploads/kyc/${file.filename}`;

    // 4️⃣ Encrypt the document number
    const encryptedDocNumber = encrypt(dto.docNumber);

    // 5️⃣ Create KYC record
    const kyc = await this.prisma.kycDocument.create({
      data: {
        userId,
        docType: dto.docType,
        docNumber: encryptedDocNumber,
        docNumberHash,
        docFileUrl,
        status: KycStatus.PENDING,
      },
    });

    this.logger.log(`KYC submitted: userId=${userId}, kycId=${kyc.id}`);

    // 6️⃣ Return safe response (no encrypted data)
    return {
      id: kyc.id,
      docType: kyc.docType,
      status: kyc.status,
      createdAt: kyc.createdAt,
    };
  }

  // ──────────────────────────────────────────────────────────
  // GET MY KYC (User-facing — safe fields only)
  // ──────────────────────────────────────────────────────────

  async getMyKyc(userId: number) {
    const kycDocs = await this.prisma.kycDocument.findMany({
      where: { userId },
      select: {
        id: true,
        docType: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        verifiedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!kycDocs.length) {
      throw new NotFoundException('No KYC documents found');
    }

    return kycDocs;
  }

  // ──────────────────────────────────────────────────────────
  // UPDATE KYC STATUS (Admin only)
  // ──────────────────────────────────────────────────────────

  async updateKycStatus(
    kycId: number,
    status: KycStatus,
    adminId: number,
    reason?: string,
  ) {
    // 1️⃣ Fetch existing KYC
    const kyc = await this.prisma.kycDocument.findUnique({
      where: { id: kycId },
    });

    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }

    // 2️⃣ Prevent double approval / rejection
    if (kyc.status === KycStatus.VERIFIED) {
      throw new ConflictException('KYC is already verified');
    }

    if (kyc.status === KycStatus.REJECTED) {
      throw new ConflictException('KYC is already rejected');
    }

    // 3️⃣ Require reason for rejection
    if (status === KycStatus.REJECTED && !reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    // 4️⃣ Update KYC status
    const updatedKyc = await this.prisma.kycDocument.update({
      where: { id: kycId },
      data: {
        status,
        rejectionReason: status === KycStatus.REJECTED ? reason : null,
        verifiedAt: status === KycStatus.VERIFIED ? new Date() : null,
      },
    });

    // 5️⃣ Create audit log
    await this.auditService.record({
      entityType: 'KycDocument',
      entityId: String(kycId),
      action: status === KycStatus.VERIFIED ? 'KYC_APPROVED' : 'KYC_REJECTED',
      severity: AuditSeverity.HIGH,
      source: AuditSource.ADMIN,
      actorId: adminId,
      description:
        status === KycStatus.VERIFIED
          ? `KYC #${kycId} approved by admin #${adminId}`
          : `KYC #${kycId} rejected by admin #${adminId}: ${reason}`,
      metadata: {
        kycId,
        userId: kyc.userId,
        previousStatus: kyc.status,
        newStatus: status,
        ...(reason && { reason }),
      },
    });

    this.logger.log(
      `KYC #${kycId} ${status} by admin #${adminId}`,
    );

    return {
      id: updatedKyc.id,
      status: updatedKyc.status,
      verifiedAt: updatedKyc.verifiedAt,
      rejectionReason: updatedKyc.rejectionReason,
    };
  }

  // ──────────────────────────────────────────────────────────
  // GET ALL KYC (Admin — paginated list)
  // ──────────────────────────────────────────────────────────

  async getAllKyc(statusFilter?: KycStatus) {
    const where = statusFilter ? { status: statusFilter } : {};

    return this.prisma.kycDocument.findMany({
      where,
      select: {
        id: true,
        userId: true,
        docType: true,
        docFileUrl: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        verifiedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Customer KYC
  async createCustomerKyc(userId: number, dto: any, file: Express.Multer.File) {
    return this.createKyc(userId, dto, file);
  }

  async getCustomerKyc(userId: number) {
    return this.prisma.kycDocument.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Vendor KYC
  async createVendorKyc(userId: number, dto: any, file: Express.Multer.File) {
    return this.createKyc(userId, dto, file);
  }

  async getVendorKyc(userId: number) {
    return this.prisma.kycDocument.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Venue Owner KYC
  async createVenueOwnerKyc(userId: number, dto: any, file: Express.Multer.File) {
    // Create KYC record first
    const kycResult = await this.createKyc(userId, dto, file);

    // If bank details are provided, create bank account
    if (dto.accountHolder && dto.bankAccountNumber && dto.ifscCode && dto.bankName) {
      try {
        // Check if bank account already exists for this user
        const existingAccount = await this.prisma.bankAccount.findFirst({
          where: { userId },
        });

        if (!existingAccount) {
          const { randomUUID } = await import('crypto');
          const accountNumberHash = hash(dto.bankAccountNumber);
          const encryptedAccountNumber = encrypt(dto.bankAccountNumber);

          await this.prisma.bankAccount.create({
            data: {
              userId,
              accountHolder: dto.accountHolder,
              accountNumber: encryptedAccountNumber,
              accountNumberHash,
              ifsc: dto.ifscCode,
              bankName: dto.bankName,
              branchName: dto.branchName || null,
              referenceId: randomUUID(),
            },
          });

          this.logger.log(`Bank account created for venue owner: userId=${userId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create bank account: ${error.message}`);
        // Don't fail the KYC submission if bank account creation fails
      }
    }

    return kycResult;
  }

  async getVenueOwnerKyc(userId: number) {
    return this.prisma.kycDocument.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllKycSubmissions() {
    return this.getAllKyc();
  }

  async getKycById(id: number) {
    return this.prisma.kycDocument.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // Get Pending KYC submissions (Admin)
  async getPendingKyc(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where = { status: KycStatus.PENDING };

    const [kycDocs, total] = await Promise.all([
      this.prisma.kycDocument.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.kycDocument.count({ where }),
    ]);

    return {
      kycDocuments: kycDocs.map((kyc) => ({
        id: kyc.id,
        userId: kyc.userId,
        docType: kyc.docType,
        docFileUrl: kyc.docFileUrl,
        status: kyc.status,
        rejectionReason: kyc.rejectionReason,
        createdAt: kyc.createdAt,
        verifiedAt: kyc.verifiedAt,
        user: kyc.user,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
