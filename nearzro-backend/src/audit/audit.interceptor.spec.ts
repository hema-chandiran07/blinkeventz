// src/audit/audit.interceptor.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { AuditSeverity, AuditSource } from '@prisma/client';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let reflector: Reflector;
  let auditService: jest.Mocked<AuditService>;

  const mockAuditMeta = {
    action: 'CREATE',
    entityType: 'User',
    severity: AuditSeverity.INFO,
    source: AuditSource.USER,
  };

  const mockUser = {
    userId: 1,
    email: 'test@example.com',
    role: 'ADMIN',
  };

  let mockRecordFn: jest.Mock;

  beforeEach(async () => {
    mockRecordFn = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            record: mockRecordFn,
          },
        },
      ],
    }).compile();

    interceptor = module.get<AuditInterceptor>(AuditInterceptor);
    reflector = module.get<Reflector>(Reflector);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should not audit when no audit metadata is present', async () => {
      jest.spyOn(reflector, 'get').mockReturnValueOnce(undefined);
      
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Test' },
            user: mockUser,
          }),
          getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
        }),
        getHandler: jest.fn(),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: 123 })),
      } as unknown as CallHandler;

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('should create audit entry with correct metadata', async () => {
      jest.spyOn(reflector, 'get').mockReturnValueOnce(mockAuditMeta);
      
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Mozilla/5.0' },
            user: mockUser,
          }),
          getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
        }),
        getHandler: jest.fn(),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: 123, name: 'Test' })),
      } as unknown as CallHandler;

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entityType: 'User',
          severity: AuditSeverity.INFO,
          source: AuditSource.USER,
          actorId: 1,
          actorEmail: 'test@example.com',
        }),
      );
    });

    it('should handle missing user gracefully', async () => {
      jest.spyOn(reflector, 'get').mockReturnValueOnce(mockAuditMeta);
      
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Test' },
            user: undefined,
          }),
          getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
        }),
        getHandler: jest.fn(),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: 123 })),
      } as unknown as CallHandler;

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: undefined,
          actorEmail: undefined,
        }),
      );
    });

    it('should handle missing IP gracefully', async () => {
      jest.spyOn(reflector, 'get').mockReturnValueOnce(mockAuditMeta);
      
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: { 'user-agent': 'Test' },
            user: mockUser,
          }),
          getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
        }),
        getHandler: jest.fn(),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: 123 })),
      } as unknown as CallHandler;

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(auditService.record).toHaveBeenCalled();
    });

    it('should not throw when auditService.record fails', async () => {
      jest.spyOn(reflector, 'get').mockReturnValueOnce(mockAuditMeta);
      mockRecordFn.mockRejectedValueOnce(new Error('Database error'));
      
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: mockUser,
          }),
          getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
        }),
        getHandler: jest.fn(),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: 123 })),
      } as unknown as CallHandler;

      // Should not throw
      await expect(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      ).toBeDefined();
    });

    it('should capture response data after handler executes', async () => {
      jest.spyOn(reflector, 'get').mockReturnValueOnce(mockAuditMeta);
      
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: mockUser,
          }),
          getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
        }),
        getHandler: jest.fn(),
      } as unknown as ExecutionContext;

      const mockResponse = { id: 123, name: 'Test User' };
      const handleMock = jest.fn().mockReturnValue(of(mockResponse));
      const mockCallHandler = {
        handle: handleMock,
      } as unknown as CallHandler;

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(handleMock).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: mockResponse,
        }),
      );
    });
  });
});
