// src/audit/audit.outbox.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditOutboxService } from './audit.outbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxStatus, Prisma } from '@prisma/client';

describe('AuditOutboxService', () => {
  let service: AuditOutboxService;
  let mockPrisma: {
    auditOutbox: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    auditLog: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockOutboxItem = {
    id: BigInt(1),
    payload: {
      entityType: 'User',
      entityId: '123',
      action: 'CREATE',
    },
    status: AuditOutboxStatus.PENDING,
    attempts: 0,
    lastError: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      auditOutbox: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditOutboxService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuditOutboxService>(AuditOutboxService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processBatch', () => {
    it('should process pending items in a transaction', async () => {
      mockPrisma.auditOutbox.findMany.mockResolvedValue([mockOutboxItem]);

      await service.processBatch(100);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: mockOutboxItem.payload,
      });
      expect(mockPrisma.auditOutbox.update).toHaveBeenCalledWith({
        where: { id: mockOutboxItem.id },
        data: {
          status: AuditOutboxStatus.PROCESSED,
          processedAt: expect.any(Date),
        },
      });
    });

    it('should use custom batch size', async () => {
      mockPrisma.auditOutbox.findMany.mockResolvedValue([]);

      await service.processBatch(50);

      expect(mockPrisma.auditOutbox.findMany).toHaveBeenCalledWith({
        where: { status: AuditOutboxStatus.PENDING },
        take: 50,
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return early when no pending items', async () => {
      mockPrisma.auditOutbox.findMany.mockResolvedValue([]);

      await service.processBatch();

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should handle transaction failures gracefully', async () => {
      mockPrisma.auditOutbox.findMany.mockResolvedValue([mockOutboxItem]);
      
      const failingTx = jest.fn().mockRejectedValue(new Error('Transaction error'));
      mockPrisma.$transaction = failingTx;

      await service.processBatch();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process audit outbox item'),
        expect.any(Error),
      );
      expect(mockPrisma.auditOutbox.update).toHaveBeenCalledWith({
        where: { id: mockOutboxItem.id },
        data: {
          status: AuditOutboxStatus.FAILED,
          attempts: { increment: 1 },
          lastError: expect.any(String),
        },
      });
    });

    it('should process multiple items', async () => {
      const items = [
        mockOutboxItem,
        { ...mockOutboxItem, id: BigInt(2) },
        { ...mockOutboxItem, id: BigInt(3) },
      ];
      mockPrisma.auditOutbox.findMany.mockResolvedValue(items);

      await service.processBatch();

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(3);
      expect(mockPrisma.auditOutbox.update).toHaveBeenCalledTimes(3);
    });

    it('should log error message on failure', async () => {
      mockPrisma.auditOutbox.findMany.mockResolvedValue([mockOutboxItem]);
      
      const failingTx = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      mockPrisma.$transaction = failingTx;

      await service.processBatch();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process audit outbox item 1'),
        expect.any(Error),
      );
    });
  });
});
