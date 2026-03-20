// src/audit/audit.processor.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditProcessor } from './audit.processor';
import { PrismaService } from '../prisma/prisma.service';
import { AuditOutboxService } from './audit.outbox.service';

describe('AuditProcessor', () => {
  let processor: AuditProcessor;
  let outboxService: Partial<AuditOutboxService>;

  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    outboxService = {
      processBatch: jest.fn().mockResolvedValue(undefined),
    };

    const mockPrisma = {
      auditOutbox: {
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback({})),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditProcessor,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditOutboxService,
          useValue: outboxService,
        },
      ],
    }).compile();

    processor = module.get<AuditProcessor>(AuditProcessor);
    
    // Mock the logger
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should call outboxService.processBatch with default batch size', async () => {
      await processor.process();

      expect(outboxService.processBatch).toHaveBeenCalledWith(100);
    });

    it('should call outboxService.processBatch with custom batch size', async () => {
      await processor.processNow(50);

      expect(outboxService.processBatch).toHaveBeenCalledWith(50);
    });

    it('should handle errors from outboxService', async () => {
      (outboxService.processBatch as jest.Mock).mockRejectedValue(
        new Error('Processing failed'),
      );

      await processor.process();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Audit processing failed:',
        expect.any(Error),
      );
    });

    it('should not throw when processBatch fails', async () => {
      (outboxService.processBatch as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(processor.process()).resolves.toBeUndefined();
    });
  });
});
