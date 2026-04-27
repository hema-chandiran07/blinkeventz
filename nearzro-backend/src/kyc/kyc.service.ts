import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseStorageService } from '../storage/database-storage.service';
import { S3Service } from '../storage/s3.service';
import { AuditService } from '../audit/audit.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { CreateKycDto } from './dto/create-kyc.dto';
import { KycStatus, KycDocType, AuditSeverity, AuditSource, KycDocument, BankAccount } from '@prisma/client';
import { encrypt, hash } from '../common/utils/crypto.util';

// ─────────────────────────────────────────────────────────────
// KYC Service — Production-Grade
// Handles document submission, retrieval, and admin approval
// Supports re-submission after rejection
// ─────────────────────────────────────────────────────────────

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: DatabaseStorageService,
    private readonly s3Service: S3Service,
    private readonly auditService: AuditService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // SUBMIT KYC WITH FILE
  // ──────────────────────────────────────────────────────────

  /**
   * Submit KYC with file upload to database
   * Uses database transaction for data integrity
   * Allows re-submission if previous KYC was REJECTED
   */
  async submitKycWithFile(
    userId: number,
    dto: SubmitKycDto,
    file: Express.Multer.File,
  ): Promise<{
    id: number;
    docType: KycDocType;
    status: KycStatus;
    createdAt: Date;
    message: string;
  }> {
    return this.createKyc(userId, dto, file);
  }

  /**
   * Create KYC record with database file storage
   * All operations are atomic
   * Allows re-submission if previous KYC was REJECTED
   */
  async createKyc(
    userId: number,
    dto: SubmitKycDto,
    file: Express.Multer.File,
  ): Promise<{
    id: number;
    docType: KycDocType;
    status: KycStatus;
    createdAt: Date;
    message: string;
  }> {
    // 1️⃣ Validate file upload to database
    let docFileUrl: string;
    try {
      docFileUrl = await this.storageService.uploadKycDocument(file);
    } catch (error) {
      this.logger.error(`File upload failed for user ${userId}: ${error.message}`);
      throw new ServiceUnavailableException(
        'Failed to upload document. Please try again later.',
      );
    }

    // 2️⃣ Check for existing KYC records
    const existingKyc = await this.prisma.kycDocument.findFirst({
      where: {
        userId,
        status: { in: [KycStatus.PENDING, KycStatus.VERIFIED] },
      },
    });

    if (existingKyc) {
      throw new ConflictException(
        `KYC already ${existingKyc.status === KycStatus.PENDING ? 'submitted and pending review' : 'verified'}`,
      );
    }

    // 3️⃣ If user has a REJECTED KYC, allow them to resubmit by updating the existing record
    const rejectedKyc = await this.prisma.kycDocument.findFirst({
      where: {
        userId,
        status: KycStatus.REJECTED,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4️⃣ Hash the doc number for duplicate detection across all users
    const docNumberHash = hash(dto.docNumber);

    // Check for duplicate doc number (excluding rejected KYC which can be resubmitted)
    const duplicateDoc = await this.prisma.kycDocument.findFirst({
      where: {
        docType: dto.docType,
        docNumberHash,
        status: { in: [KycStatus.PENDING, KycStatus.VERIFIED] }, // Only check active KYC
        userId: { not: userId }, // Allow user to resubmit their own rejected KYC
      },
    });

    if (duplicateDoc) {
      throw new ConflictException(
        'This document number is already registered with another account',
      );
    }

    // 5️⃣ Encrypt the document number
    const encryptedDocNumber = encrypt(dto.docNumber);

    // 6️⃣ Create or update KYC record using transaction
    let kyc: KycDocument;
    
    if (rejectedKyc) {
      // 1. Delete old file (Physical purge)
      if (rejectedKyc.docFileUrl) {
        await this.storageService.deleteFile(rejectedKyc.docFileUrl);
      }

      // Update the rejected KYC record with new details
      kyc = await this.prisma.$transaction(async (tx) => {
        return tx.kycDocument.update({
          where: { id: rejectedKyc.id },
          data: {
            docType: dto.docType,
            docNumber: encryptedDocNumber,
            docNumberHash,
            docFileUrl,
            status: KycStatus.PENDING,
            rejectionReason: null, // Clear rejection reason
            verifiedAt: null,
          },
        });
      });
      
      this.logger.log(`KYC resubmitted after rejection: userId=${userId}, kycId=${kyc.id}`);
    } else {
      // Create new KYC record
      kyc = await this.prisma.$transaction(async (tx) => {
        return tx.kycDocument.create({
          data: {
            userId,
            docType: dto.docType,
            docNumber: encryptedDocNumber,
            docNumberHash,
            docFileUrl,
            status: KycStatus.PENDING,
          },
        });
      });
      
      this.logger.log(`KYC submitted: userId=${userId}, kycId=${kyc.id}`);
    }

    // 7️⃣ Return safe response (no encrypted data)
    return {
      id: kyc.id,
      docType: kyc.docType,
      status: kyc.status,
      createdAt: kyc.createdAt,
      message: rejectedKyc 
        ? 'KYC resubmitted successfully. Pending verification.'
        : 'KYC document submitted successfully. Pending verification.',
    };
  }

  // ──────────────────────────────────────────────────────────
  // GET MY KYC (User-facing — safe fields only)
  // ──────────────────────────────────────────────────────────

  async getMyKyc(userId: number): Promise<{
    id: number;
    docType: KycDocType;
    status: KycStatus;
    rejectionReason?: string;
    createdAt: Date;
    verifiedAt?: Date;
  }[]> {
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

    // Convert null to undefined for optional fields
    return kycDocs.map((doc) => ({
      id: doc.id,
      docType: doc.docType,
      status: doc.status,
      rejectionReason: doc.rejectionReason ?? undefined,
      createdAt: doc.createdAt,
      verifiedAt: doc.verifiedAt ?? undefined,
    }));
  }

  // ──────────────────────────────────────────────────────────
  // UPDATE KYC STATUS (Admin only)
  // ──────────────────────────────────────────────────────────

  async updateKycStatus(
    kycId: number,
    status: KycStatus,
    adminId: number,
    reason?: string,
  ): Promise<{
    id: number;
    status: KycStatus;
    verifiedAt?: Date;
    rejectionReason?: string;
    message: string;
  }> {
    // 1️⃣ Fetch existing KYC
    const kyc = await this.prisma.kycDocument.findUnique({
      where: { id: kycId },
    });

    if (!kyc) {
      throw new NotFoundException('KYC record not found');
    }

    // 2️⃣ Prevent double approval
    if (kyc.status === KycStatus.VERIFIED) {
      throw new ConflictException('KYC is already verified');
    }

    // Note: REJECTED KYC can be re-reviewed - this is now allowed
    // Users can submit new KYC after rejection, and admins can review those

    // 3️⃣ Require reason for rejection
    if (status === KycStatus.REJECTED && !reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    // 4️⃣ Update KYC status using transaction
    const updatedKyc = await this.prisma.$transaction(async (tx) => {
      return tx.kycDocument.update({
        where: { id: kycId },
        data: {
          status,
          rejectionReason: status === KycStatus.REJECTED ? reason : null,
          verifiedAt: status === KycStatus.VERIFIED ? new Date() : null,
        },
      });
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

    const message =
      status === KycStatus.VERIFIED
        ? 'KYC verified successfully'
        : `KYC rejected: ${reason}`;

    this.logger.log(`KYC #${kycId} ${status} by admin #${adminId}`);

    return {
      id: updatedKyc.id,
      status: updatedKyc.status,
      verifiedAt: updatedKyc.verifiedAt ?? undefined,
      rejectionReason: updatedKyc.rejectionReason ?? undefined,
      message,
    };
  }

  // ──────────────────────────────────────────────────────────
  // GET ALL KYC (Admin — paginated list)
  // ──────────────────────────────────────────────────────────

  async getAllKyc(
    statusFilter?: KycStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    kycDocuments: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const where = statusFilter ? { status: statusFilter } : {};
    const skip = (page - 1) * limit;

    const [kycDocs, total] = await Promise.all([
      this.prisma.kycDocument.findMany({
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
        skip,
        take: limit,
      }),
      this.prisma.kycDocument.count({ where }),
    ]);

    // Convert to presigned URLs for admin access
    const kycDocuments = await Promise.all(
      kycDocs.map(async (doc) => ({
        ...doc,
        docFileUrl: await this.s3Service.getKycDocumentUrl(doc.docFileUrl),
      }))
    );

    return {
      kycDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1,
      },
    };
  }

  // ──────────────────────────────────────────────────────────
  // CUSTOMER KYC
  // ──────────────────────────────────────────────────────────

  async createCustomerKyc(
    userId: number,
    dto: CreateKycDto,
    file: Express.Multer.File,
  ) {
    const submitDto: SubmitKycDto = {
      docType: dto.docType,
      docNumber: dto.docNumber,
    };
    return this.createKyc(userId, submitDto, file);
  }

  async getCustomerKyc(userId: number): Promise<{
    id: number;
    docType: KycDocType;
    status: KycStatus;
    rejectionReason?: string;
    createdAt: Date;
    verifiedAt?: Date;
  }> {
    const kyc = await this.prisma.kycDocument.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!kyc) {
      throw new NotFoundException('No KYC document found');
    }

    return {
      id: kyc.id,
      docType: kyc.docType,
      status: kyc.status,
      rejectionReason: kyc.rejectionReason ?? undefined,
      createdAt: kyc.createdAt,
      verifiedAt: kyc.verifiedAt ?? undefined,
    };
  }

  // ──────────────────────────────────────────────────────────
  // VENDOR KYC
  // ──────────────────────────────────────────────────────────

  async createVendorKyc(
    userId: number,
    dto: CreateKycDto,
    file: Express.Multer.File,
  ) {
    const submitDto: SubmitKycDto = {
      docType: dto.docType,
      docNumber: dto.docNumber,
    };
    return this.createKyc(userId, submitDto, file);
  }

  async getVendorKyc(userId: number): Promise<{
    id: number;
    docType: KycDocType;
    docNumber: string;
    docFileUrl: string;
    status: KycStatus;
    rejectionReason?: string;
    createdAt: Date;
    verifiedAt?: Date;
  }> {
    const kyc = await this.prisma.kycDocument.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!kyc) {
      throw new NotFoundException('No KYC document found');
    }

    // Generate presigned URL for KYC document access
    const presignedUrl = await this.s3Service.getKycDocumentUrl(kyc.docFileUrl);

    return {
      id: kyc.id,
      docType: kyc.docType,
      docNumber: kyc.docNumber,
      docFileUrl: presignedUrl,
      status: kyc.status,
      rejectionReason: kyc.rejectionReason ?? undefined,
      createdAt: kyc.createdAt,
      verifiedAt: kyc.verifiedAt ?? undefined,
    };
  }

  // ──────────────────────────────────────────────────────────
  // VENUE OWNER KYC (with optional bank account)
  // ──────────────────────────────────────────────────────────

  async createVenueOwnerKyc(
    userId: number,
    dto: CreateKycDto,
    file: Express.Multer.File,
  ): Promise<{
    id: number;
    docType: KycDocType;
    status: KycStatus;
    createdAt: Date;
    message: string;
    bankAccountId?: number;
  }> {
    const submitDto: SubmitKycDto = {
      docType: dto.docType,
      docNumber: dto.docNumber,
    };

    // Check for rejected KYC before transaction to use in response message
    const rejectedKycCheck = await this.prisma.kycDocument.findFirst({
      where: {
        userId,
        status: KycStatus.REJECTED,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create KYC record and optionally bank account in a single transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Upload file to database storage
      let docFileUrl: string;
      try {
        docFileUrl = await this.storageService.uploadKycDocument(file);
      } catch (error) {
        throw new ServiceUnavailableException(
          'Failed to upload document. Please try again later.',
        );
      }

      // Check for existing PENDING or VERIFIED KYC
      const activeKyc = await tx.kycDocument.findFirst({
        where: {
          userId,
          status: { in: [KycStatus.PENDING, KycStatus.VERIFIED] },
        },
      });

      if (activeKyc) {
        throw new ConflictException(
          `KYC already ${activeKyc.status === KycStatus.PENDING ? 'pending' : 'verified'}`,
        );
      }

      // Check for rejected KYC to allow resubmission
      const rejectedKyc = await tx.kycDocument.findFirst({
        where: {
          userId,
          status: KycStatus.REJECTED,
        },
        orderBy: { createdAt: 'desc' },
      });

      const docNumberHash = hash(dto.docNumber);
      const encryptedDocNumber = encrypt(dto.docNumber);

      let kyc: KycDocument;

      if (rejectedKyc) {
        // 1. Delete old file (Physical purge)
        if (rejectedKyc.docFileUrl) {
          await this.storageService.deleteFile(rejectedKyc.docFileUrl);
        }

        // Update rejected KYC record
        kyc = await tx.kycDocument.update({
          where: { id: rejectedKyc.id },
          data: {
            docType: dto.docType,
            docNumber: encryptedDocNumber,
            docNumberHash,
            docFileUrl,
            status: KycStatus.PENDING,
            rejectionReason: null,
            verifiedAt: null,
          },
        });
      } else {
        // Create new KYC record
        kyc = await tx.kycDocument.create({
          data: {
            userId,
            docType: dto.docType,
            docNumber: encryptedDocNumber,
            docNumberHash,
            docFileUrl,
            status: KycStatus.PENDING,
          },
        });
      }

      let bankAccountId: number | undefined = undefined;

      // 2️⃣ If bank details are provided, create or update bank account
      if (
        dto.accountHolder &&
        dto.bankAccountNumber &&
        dto.ifscCode &&
        dto.bankName
      ) {
        // Check if bank account already exists for this user
        const existingAccount = await tx.bankAccount.findFirst({
          where: { userId },
        });

        if (existingAccount) {
          // Update existing bank account
          const accountNumberHash = hash(dto.bankAccountNumber);
          const encryptedAccountNumber = encrypt(dto.bankAccountNumber);

          await tx.bankAccount.update({
            where: { id: existingAccount.id },
            data: {
              accountHolder: dto.accountHolder,
              accountNumber: encryptedAccountNumber,
              accountNumberHash,
              ifsc: dto.ifscCode,
              bankName: dto.bankName,
              branchName: dto.branchName || null,
              isVerified: false, // Reset verification when details change
            },
          });

          bankAccountId = existingAccount.id;
          this.logger.log(`Bank account updated for venue owner: userId=${userId}`);
        } else {
          // Create new bank account
          const accountNumberHash = hash(dto.bankAccountNumber);
          const encryptedAccountNumber = encrypt(dto.bankAccountNumber);

          const { randomUUID } = await import('crypto');

          const bankAccount = await tx.bankAccount.create({
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

          bankAccountId = bankAccount.id;
          this.logger.log(`Bank account created for venue owner: userId=${userId}`);
        }
      }

      return { kyc, bankAccountId };
    });

    return {
      id: result.kyc.id,
      docType: result.kyc.docType,
      status: result.kyc.status,
      createdAt: result.kyc.createdAt,
      message: rejectedKycCheck
        ? 'KYC resubmitted successfully. Pending verification.'
        : 'KYC submitted successfully. Pending verification.',
      bankAccountId: result.bankAccountId,
    };
  }

  async getVenueOwnerKyc(userId: number): Promise<{
    id: number;
    docType: KycDocType;
    docNumber: string;
    docFileUrl: string;
    status: KycStatus;
    rejectionReason?: string;
    createdAt: Date;
    verifiedAt?: Date;
  }> {
    const kyc = await this.prisma.kycDocument.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!kyc) {
      throw new NotFoundException('No KYC document found');
    }

    // Generate presigned URL for KYC document access
    const presignedUrl = await this.s3Service.getKycDocumentUrl(kyc.docFileUrl);

    return {
      id: kyc.id,
      docType: kyc.docType,
      docNumber: kyc.docNumber,
      docFileUrl: presignedUrl,
      status: kyc.status,
      rejectionReason: kyc.rejectionReason ?? undefined,
      createdAt: kyc.createdAt,
      verifiedAt: kyc.verifiedAt ?? undefined,
    };
  }

  async getAllKycSubmissions(statusFilter?: KycStatus) {
    return this.getAllKyc(statusFilter);
  }

  async getKycById(id: number) {
    const kyc = await this.prisma.kycDocument.findUnique({
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

    if (!kyc) {
      throw new NotFoundException('KYC document not found');
    }

    // Generate presigned URL for admin access
    const presignedUrl = await this.s3Service.getKycDocumentUrl(kyc.docFileUrl);

    return {
      ...kyc,
      docFileUrl: presignedUrl,
    };
  }

  // Get Pending KYC submissions (Admin)
  async getPendingKyc(page: number = 1, limit: number = 20) {
    return this.getAllKyc(KycStatus.PENDING, page, limit);
  }
}
