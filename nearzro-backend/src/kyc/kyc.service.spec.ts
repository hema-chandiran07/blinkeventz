import { Test, TestingModule } from '@nestjs/testing';
import { KycService } from './kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { AuditService } from '../audit/audit.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { KycStatus, KycDocType } from '@prisma/client';

describe('KycService', () => {
  let service: KycService;
  let prisma: any;
  let s3Service: any;
  let auditService: any;

  // Mock data
  const mockUserId = 1;
  const mockAdminId = 100;
  const mockKycId = 1;

  const mockFile = {
    originalname: 'document.pdf',
    mimetype: 'application/pdf',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  const mockDto = {
    docType: 'AADHAAR' as KycDocType,
    docNumber: '123456789012',
  };

  // Mock Prisma
  const mockPrisma = {
    kycDocument: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    bankAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => callback(mockPrisma)),
  };

  // Mock S3 Service
  const mockS3Service = {
    uploadKycDocument: jest.fn().mockResolvedValue('https://s3-bucket/kyc/document.pdf'),
  };

  // Mock Audit Service
  const mockAuditService = {
    record: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: S3Service, useValue: mockS3Service },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    prisma = module.get(PrismaService);
    s3Service = module.get(S3Service);
    auditService = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe('createKyc', () => {
    // =====================================================
    // POSITIVE TESTS
    // =====================================================

    it('should create KYC with valid inputs', async () => {
      // Arrange
      mockPrisma.kycDocument.findFirst
        .mockResolvedValueOnce(null) // No active KYC
        .mockResolvedValueOnce(null); // No duplicate doc
      
      // Mock the transaction to return the created KYC
      const mockKycResult = {
        id: mockKycId,
        userId: mockUserId,
        docType: mockDto.docType,
        status: KycStatus.PENDING,
        createdAt: new Date(),
      };
      
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        // Inside transaction, mock the create to return our result
        mockPrisma.kycDocument.create.mockResolvedValue(mockKycResult);
        return callback(mockPrisma);
      });

      // Act
      const result = await service.createKyc(mockUserId, mockDto, mockFile);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockKycId);
      expect(result.status).toBe(KycStatus.PENDING);
      expect(result.docType).toBe(mockDto.docType);
      expect(s3Service.uploadKycDocument).toHaveBeenCalledWith(mockFile);
    });

    // =====================================================
    // NEGATIVE TESTS
    // =====================================================

    it('should throw ConflictException if user already has PENDING KYC', async () => {
      // Arrange
      mockPrisma.kycDocument.findFirst.mockResolvedValue({
        id: 1,
        status: KycStatus.PENDING,
      });

      // Act & Assert
      await expect(service.createKyc(mockUserId, mockDto, mockFile)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if user already has VERIFIED KYC', async () => {
      // Arrange
      mockPrisma.kycDocument.findFirst.mockResolvedValue({
        id: 1,
        status: KycStatus.VERIFIED,
      });

      // Act & Assert
      await expect(service.createKyc(mockUserId, mockDto, mockFile)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if document number is already registered', async () => {
      // Arrange
      mockPrisma.kycDocument.findFirst
        .mockResolvedValueOnce(null) // No active KYC
        .mockResolvedValueOnce({
          // Duplicate doc found
          id: 2,
          userId: 999,
          docType: mockDto.docType,
        });

      // Act & Assert
      await expect(service.createKyc(mockUserId, mockDto, mockFile)).rejects.toThrow(
        'This document number is already registered with another account',
      );
    });

    it('should throw ServiceUnavailableException if S3 upload fails', async () => {
      // Arrange
      mockPrisma.kycDocument.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockS3Service.uploadKycDocument.mockRejectedValue(
        new Error('S3 error'),
      );

      // Act & Assert
      await expect(service.createKyc(mockUserId, mockDto, mockFile)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('updateKycStatus', () => {
    // =====================================================
    // POSITIVE TESTS
    // =====================================================

    it('should approve KYC with VERIFIED status', async () => {
      // Arrange
      const existingKyc = {
        id: mockKycId,
        userId: mockUserId,
        status: KycStatus.PENDING,
        docType: mockDto.docType,
      };
      const updatedKyc = {
        ...existingKyc,
        status: KycStatus.VERIFIED,
        verifiedAt: new Date(),
        rejectionReason: null,
      };

      mockPrisma.kycDocument.findUnique.mockResolvedValue(existingKyc);
      
      // Mock the transaction to return the updated KYC
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockPrisma.kycDocument.update.mockResolvedValue(updatedKyc);
        return callback(mockPrisma);
      });

      // Act
      const result = await service.updateKycStatus(
        mockKycId,
        KycStatus.VERIFIED,
        mockAdminId,
      );

      // Assert
      expect(result.status).toBe(KycStatus.VERIFIED);
      expect(result.message).toBe('KYC verified successfully');
      expect(auditService.record).toHaveBeenCalled();
    });

    it('should reject KYC with REJECTED status and reason', async () => {
      // Arrange
      const existingKyc = {
        id: mockKycId,
        userId: mockUserId,
        status: KycStatus.PENDING,
        docType: mockDto.docType,
      };
      const rejectionReason = 'Document is blurry';
      const updatedKyc = {
        ...existingKyc,
        status: KycStatus.REJECTED,
        verifiedAt: null,
        rejectionReason,
      };

      mockPrisma.kycDocument.findUnique.mockResolvedValue(existingKyc);
      
      // Mock the transaction to return the updated KYC
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockPrisma.kycDocument.update.mockResolvedValue(updatedKyc);
        return callback(mockPrisma);
      });

      // Act
      const result = await service.updateKycStatus(
        mockKycId,
        KycStatus.REJECTED,
        mockAdminId,
        rejectionReason,
      );

      // Assert
      expect(result.status).toBe(KycStatus.REJECTED);
      expect(result.rejectionReason).toBe(rejectionReason);
      expect(result.message).toContain(rejectionReason);
    });

    // =====================================================
    // NEGATIVE TESTS
    // =====================================================

    it('should throw NotFoundException for non-existent KYC', async () => {
      // Arrange
      mockPrisma.kycDocument.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateKycStatus(999, KycStatus.VERIFIED, mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if KYC is already verified', async () => {
      // Arrange
      mockPrisma.kycDocument.findUnique.mockResolvedValue({
        id: mockKycId,
        status: KycStatus.VERIFIED,
      });

      // Act & Assert
      await expect(
        service.updateKycStatus(mockKycId, KycStatus.VERIFIED, mockAdminId),
      ).rejects.toThrow('KYC is already verified');
    });

    it('should throw ConflictException if KYC is already rejected', async () => {
      // Arrange
      mockPrisma.kycDocument.findUnique.mockResolvedValue({
        id: mockKycId,
        status: KycStatus.REJECTED,
      });

      // Act & Assert
      await expect(
        service.updateKycStatus(mockKycId, KycStatus.REJECTED, mockAdminId),
      ).rejects.toThrow('KYC is already rejected');
    });

    it('should throw BadRequestException if rejection without reason', async () => {
      // Arrange
      mockPrisma.kycDocument.findUnique.mockResolvedValue({
        id: mockKycId,
        status: KycStatus.PENDING,
      });

      // Act & Assert
      await expect(
        service.updateKycStatus(mockKycId, KycStatus.REJECTED, mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyKyc', () => {
    // =====================================================
    // POSITIVE TESTS
    // =====================================================

    it('should return KYC documents for user', async () => {
      // Arrange
      const kycDocs = [
        {
          id: 1,
          docType: KycDocType.AADHAAR,
          status: KycStatus.PENDING,
          rejectionReason: null,
          createdAt: new Date(),
          verifiedAt: null,
        },
      ];
      mockPrisma.kycDocument.findMany.mockResolvedValue(kycDocs);

      // Act
      const result = await service.getMyKyc(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });

    // =====================================================
    // NEGATIVE TESTS
    // =====================================================

    it('should throw NotFoundException if no documents', async () => {
      // Arrange
      mockPrisma.kycDocument.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getMyKyc(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllKyc', () => {
    it('should return paginated KYC list', async () => {
      // Arrange
      const kycDocs = [
        {
          id: 1,
          userId: 1,
          docType: KycDocType.AADHAAR,
          status: KycStatus.PENDING,
          createdAt: new Date(),
        },
      ];
      mockPrisma.kycDocument.findMany.mockResolvedValue(kycDocs);
      mockPrisma.kycDocument.count.mockResolvedValue(1);

      // Act
      const result = await service.getAllKyc(KycStatus.PENDING, 1, 20);

      // Assert
      expect(result).toBeDefined();
      expect(result.kycDocuments).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('getKycById', () => {
    it('should return KYC by ID', async () => {
      // Arrange
      const kyc = {
        id: mockKycId,
        userId: mockUserId,
        docType: KycDocType.AADHAAR,
        status: KycStatus.PENDING,
        user: { id: 1, name: 'Test', email: 'test@test.com' },
      };
      mockPrisma.kycDocument.findUnique.mockResolvedValue(kyc);

      // Act
      const result = await service.getKycById(mockKycId);

      // Assert
      expect(result.id).toBe(mockKycId);
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      mockPrisma.kycDocument.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getKycById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCustomerKyc', () => {
    it('should return customer KYC', async () => {
      // Arrange
      const kyc = {
        id: 1,
        docType: KycDocType.AADHAAR,
        status: KycStatus.PENDING,
        rejectionReason: null,
        createdAt: new Date(),
        verifiedAt: null,
      };
      mockPrisma.kycDocument.findFirst.mockResolvedValue(kyc);

      // Act
      const result = await service.getCustomerKyc(mockUserId);

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      mockPrisma.kycDocument.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getCustomerKyc(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getVendorKyc', () => {
    it('should return vendor KYC', async () => {
      // Arrange
      const kyc = {
        id: 1,
        docType: KycDocType.PAN,
        status: KycStatus.VERIFIED,
        rejectionReason: null,
        createdAt: new Date(),
        verifiedAt: new Date(),
      };
      mockPrisma.kycDocument.findFirst.mockResolvedValue(kyc);

      // Act
      const result = await service.getVendorKyc(mockUserId);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('getVenueOwnerKyc', () => {
    it('should return venue owner KYC', async () => {
      // Arrange
      const kyc = {
        id: 1,
        docType: KycDocType.PASSPORT,
        status: KycStatus.PENDING,
        rejectionReason: null,
        createdAt: new Date(),
        verifiedAt: null,
      };
      mockPrisma.kycDocument.findFirst.mockResolvedValue(kyc);

      // Act
      const result = await service.getVenueOwnerKyc(mockUserId);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
