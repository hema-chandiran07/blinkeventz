// src/audit/audit.retention.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditRetentionService } from './audit.retention.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditSeverity, AuditSource } from '@prisma/client';

describe('AuditRetentionService', () => {
  let service: AuditRetentionService;
  let mockPrisma: {
    auditLog: {
      deleteMany: jest.Mock;
      create: jest.Mock;
    };
  };

  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    mockPrisma = {
      auditLog: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditRetentionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuditRetentionService>(AuditRetentionService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('purgeExpired', () => {
    it('should delete expired audit logs', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.auditLog.create.mockResolvedValue({ id: BigInt(1) });

      await service.purgeExpired();

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          retentionUntil: { lt: expect.any(Date) },
        },
      });
    });

    it('should log purge action when logs are deleted', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 10 });
      mockPrisma.auditLog.create.mockResolvedValue({ id: BigInt(1) });

      await service.purgeExpired();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Retention Policy: Purged 10 expired logs.',
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'AUDIT_RETENTION_PURGE',
          entityType: 'AuditLog',
          severity: AuditSeverity.INFO,
          source: AuditSource.SERVICE,
          description: expect.stringContaining('System auto-purged 10 logs'),
        },
      });
    });

    it('should not log purge action when no logs are deleted', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });

      await service.purgeExpired();

      expect(mockLogger.log).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.auditLog.deleteMany.mockRejectedValue(new Error('Database error'));

      await service.purgeExpired();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Retention purge failed:',
        expect.any(Error),
      );
    });

    it('should delete logs with retention date in the past', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 3 });

      await service.purgeExpired();

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalled();
    });
  });
});
