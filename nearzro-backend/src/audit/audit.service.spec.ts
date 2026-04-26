// src/audit/audit.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditSeverity, AuditSource, Prisma } from '@prisma/client';
import { AuditLogEntry } from './types/audit.types';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrisma: {
    auditOutbox: {
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
      auditOutbox: {
        create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);

    // Mock the logger
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('record', () => {
    const baseEntry: AuditLogEntry = {
      entityType: 'User',
      entityId: '123',
      action: 'CREATE',
      severity: AuditSeverity.INFO,
      source: AuditSource.USER,
      actorId: 1,
      actorEmail: 'test@example.com',
      actorRole: 'ADMIN',
    };

    it('should create an audit outbox entry with all fields', async () => {
      const entry: AuditLogEntry = {
        ...baseEntry,
        description: 'User created',
        oldValue: { name: 'Old' },
        newValue: { name: 'New' },
        diff: { name: { before: 'Old', after: 'New' } },
        metadata: { ip: '127.0.0.1' },
        retentionUntil: new Date('2027-01-01'),
      };

      await service.record(entry);

      expect(mockPrisma.auditOutbox.create).toHaveBeenCalledWith({
        data: {
          payload: expect.objectContaining({
            entityType: 'User',
            entityId: '123',
            action: 'CREATE',
            severity: AuditSeverity.INFO,
            source: AuditSource.USER,
            actorId: 1,
            actorEmail: 'test@example.com',
            description: 'User created',
          }),
        },
      });
    });

    it('should use default severity and source when not provided', async () => {
      const entry: AuditLogEntry = {
        entityType: 'User',
        entityId: '123',
        action: 'CREATE',
      };

      await service.record(entry);

      expect(mockPrisma.auditOutbox.create).toHaveBeenCalledWith({
        data: {
          payload: expect.objectContaining({
            severity: AuditSeverity.INFO,
            source: AuditSource.SYSTEM,
          }),
        },
      });
    });

    it('should handle null oldValue and newValue correctly', async () => {
      const entry: AuditLogEntry = {
        entityType: 'User',
        entityId: '123',
        action: 'UPDATE',
        oldValue: null,
        newValue: null,
      };

      await service.record(entry);

      expect(mockPrisma.auditOutbox.create).toHaveBeenCalled();
    });

    it('should handle undefined optional fields correctly', async () => {
      const entry: AuditLogEntry = {
        entityType: 'User',
        action: 'CREATE',
      };

      await service.record(entry);

      expect(mockPrisma.auditOutbox.create).toHaveBeenCalledWith({
        data: {
          payload: expect.objectContaining({
            entityType: 'User',
            action: 'CREATE',
          }),
        },
      });
    });

    it('should not throw when Prisma create fails', async () => {
      const entry: AuditLogEntry = {
        entityType: 'User',
        action: 'CREATE',
      };

      mockPrisma.auditOutbox.create.mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw
      await expect(service.record(entry)).resolves.toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to write audit outbox',
        expect.any(Error),
      );
    });

    it('should handle complex nested JSON objects', async () => {
      const entry: AuditLogEntry = {
        entityType: 'Event',
        entityId: '456',
        action: 'UPDATE',
        oldValue: {
          user: { profile: { address: { city: 'Delhi' } } },
          items: [1, 2, 3],
        },
        newValue: {
          user: { profile: { address: { city: 'Mumbai' } } },
          items: [1, 2, 3, 4],
        },
      };

      await service.record(entry);

      expect(mockPrisma.auditOutbox.create).toHaveBeenCalled();
    });
  });
});
