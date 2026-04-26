// test/integration/audit.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditModule } from '../../src/audit/audit.module';
import { AuditService } from '../../src/audit/audit.service';
import { AuditProcessor } from '../../src/audit/audit.processor';
import { AuditController } from '../../src/audit/audit.controller';
import { AuditOutboxService } from '../../src/audit/audit.outbox.service';
import { AuditOutboxStatus, AuditSeverity, AuditSource, Role } from '@prisma/client';

describe('Audit Integration Tests', () => {
  let app: INestApplication;
  let auditService: AuditService;
  let mockPrisma: any;
  let mockOutboxService: any;

  beforeAll(async () => {
    mockPrisma = {
      auditOutbox: {
        create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    mockOutboxService = {
      processBatch: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuditModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(AuditOutboxService)
      .useValue(mockOutboxService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    
    auditService = moduleFixture.get<AuditService>(AuditService);
    
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Audit Log Creation Flow', () => {
    it('should create audit log entry via outbox', async () => {
      await auditService.record({
        entityType: 'User',
        entityId: '123',
        action: 'CREATE',
        severity: AuditSeverity.INFO,
        source: AuditSource.USER,
        actorId: 1,
        actorEmail: 'test@example.com',
        actorRole: Role.ADMIN,
        description: 'Test user created',
      });

      expect(mockPrisma.auditOutbox.create).toHaveBeenCalledWith({
        data: {
          payload: expect.objectContaining({
            entityType: 'User',
            action: 'CREATE',
          }),
        },
      });
    });

    it('should handle multiple concurrent audit entries', async () => {
      mockPrisma.auditOutbox.create.mockResolvedValue({ id: BigInt(1) });

      const promises = Array.from({ length: 10 }, (_, i) =>
        auditService.record({
          entityType: 'Event',
          entityId: String(i),
          action: 'CREATE',
        }),
      );

      await Promise.all(promises);

      expect(mockPrisma.auditOutbox.create).toHaveBeenCalledTimes(10);
    });
  });

  describe('Audit Query Flow', () => {
    it('should query audit logs with filters', async () => {
      const mockData = [
        {
          id: BigInt(1),
          entityType: 'User',
          action: 'CREATE',
          severity: AuditSeverity.INFO,
        },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockData);

      const controller = app.get<AuditController>(AuditController);
      const result = await controller.list({ entityType: 'User' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { entityType: 'User' },
        orderBy: { occurredAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual(mockData);
    });

    it('should support pagination', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const controller = app.get<AuditController>(AuditController);
      await controller.list({ page: 2, limit: 10 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { occurredAt: 'desc' },
        take: 10,
        skip: 10,
      });
    });
  });

  describe('Audit Processing Flow', () => {
    it('should call outbox service to process entries', async () => {
      const processor = app.get<AuditProcessor>(AuditProcessor);
      await processor.process();

      expect(mockOutboxService.processBatch).toHaveBeenCalledWith(100);
    });
  });
});
