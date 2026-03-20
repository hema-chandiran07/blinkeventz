// src/audit/audit.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditSeverity, AuditSource } from '@prisma/client';

describe('AuditController', () => {
  let controller: AuditController;
  let mockPrisma: {
    auditLog: {
      findMany: jest.Mock;
    };
  };

  const mockAuditLogs = [
    {
      id: BigInt(1),
      entityType: 'User',
      entityId: '123',
      action: 'CREATE',
      severity: AuditSeverity.INFO,
      source: AuditSource.USER,
      actorId: 1,
      actorEmail: 'test@example.com',
      description: 'User created',
      occurredAt: new Date(),
      createdAt: new Date(),
    },
    {
      id: BigInt(2),
      entityType: 'KycDocument',
      entityId: '456',
      action: 'UPDATE',
      severity: AuditSeverity.WARNING,
      source: AuditSource.SYSTEM,
      actorId: 2,
      actorEmail: 'admin@example.com',
      description: 'KYC verified',
      occurredAt: new Date(),
      createdAt: new Date(),
    },
  ];

  beforeEach(async () => {
    mockPrisma = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue(mockAuditLogs),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated audit logs without filters', async () => {
      const result = await controller.list({});

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { occurredAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual(mockAuditLogs);
    });

    it('should apply entityType filter', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLogs[0]]);

      const result = await controller.list({ entityType: 'User' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { entityType: 'User' },
        orderBy: { occurredAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual([mockAuditLogs[0]]);
    });

    it('should apply actorId filter', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLogs[0]]);

      const result = await controller.list({ actorId: 1 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { actorId: 1 },
        orderBy: { occurredAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual([mockAuditLogs[0]]);
    });

    it('should apply severity filter', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLogs[1]]);

      const result = await controller.list({ severity: AuditSeverity.WARNING });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { severity: AuditSeverity.WARNING },
        orderBy: { occurredAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual([mockAuditLogs[1]]);
    });

    it('should apply custom pagination', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const result = await controller.list({ limit: 10, page: 2 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { occurredAt: 'desc' },
        take: 10,
        skip: 10,
      });
      expect(result).toEqual(mockAuditLogs);
    });

    it('should apply multiple filters together', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLogs[0]]);

      const result = await controller.list({
        entityType: 'User',
        actorId: 1,
        severity: AuditSeverity.INFO,
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'User',
          actorId: 1,
          severity: AuditSeverity.INFO,
        },
        orderBy: { occurredAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual([mockAuditLogs[0]]);
    });

    it('should return empty array when no logs match', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const result = await controller.list({ entityType: 'NonExistent' });

      expect(result).toEqual([]);
    });

    it('should handle page 1 correctly (skip 0)', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      await controller.list({ page: 1 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('should handle high page numbers correctly', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await controller.list({ page: 1000 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 49950 }),
      );
    });
  });
});
