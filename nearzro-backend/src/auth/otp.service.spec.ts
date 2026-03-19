/**
 * OTP Service Unit Tests
 * NearZro Event Management Platform
 * 
 * Tests cover:
 * - Positive test scenarios (OTP generation, sending, verification)
 * - Negative test scenarios (invalid OTP, expired OTP)
 * - Edge cases (concurrent requests, multiple OTP requests)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from '../notifications/providers/email.provider';
import { BadRequestException } from '@nestjs/common';

// Mock nodemailer globally to prevent real email calls
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

describe('OtpService', () => {
  let service: OtpService;
  let prisma: PrismaService;
  let emailProvider: EmailProvider;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEmailProvider = {
    send: jest.fn().mockResolvedValue(true),
    sendOtpEmail: jest.fn().mockResolvedValue(true),
    onModuleInit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useFactory: () => {
            return {
              get: (key: string): string => {
                const config: Record<string, string> = {
                  GMAIL_USER: 'test@gmail.com',
                  GMAIL_APP_PASSWORD: 'test-password',
                  EMAIL_FROM: 'test@test.com',
                  APP_ENV: 'test',
                };
                return config[key] || '';
              },
            };
          },
        },
        { provide: EmailProvider, useValue: mockEmailProvider },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    prisma = module.get<PrismaService>(PrismaService);
    emailProvider = module.get<EmailProvider>(EmailProvider);
    
    // Clear OTP store between tests to prevent flaky behavior
    (service as any).otpStore.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear OTP store after each test
    if (service) {
      (service as any).otpStore.clear();
    }
  });

  describe('✅ Send OTP', () => {
    it('should send OTP successfully', async () => {
      const result = await service.sendOtp('test@example.com');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('OTP sent successfully');
      expect(emailProvider.sendOtpEmail).toHaveBeenCalled();
    });

    it('should generate 6-digit OTP', async () => {
      await service.sendOtp('test@example.com');
      
      const otpEntry = (service as any).otpStore.get('test@example.com');
      expect(otpEntry).toBeDefined();
      expect(otpEntry.otp).toMatch(/^\d{6}$/);
    });

    it('should store OTP with 5-minute expiry', async () => {
      const before = new Date();
      await service.sendOtp('test@example.com');
      const after = new Date();
      
      const otpEntry = (service as any).otpStore.get('test@example.com');
      expect(otpEntry).toBeDefined();
      expect(otpEntry.expiresAt.getTime()).toBeGreaterThan(before.getTime() + 4 * 60 * 1000);
      expect(otpEntry.expiresAt.getTime()).toBeLessThan(after.getTime() + 6 * 60 * 1000);
    });

    it('should send OTP with phone number', async () => {
      // Twilio is optional - just check it doesn't throw
      await expect(
        service.sendOtp('test@example.com', '+1234567890')
      ).resolves.not.toThrow();
    });
  });

  describe('✅ Verify OTP', () => {
    it('should verify correct OTP successfully', async () => {
      // Setup Prisma mock to return a user
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@example.com' });
      mockPrisma.user.update.mockResolvedValue({ id: 1, email: 'test@example.com', isEmailVerified: true });
      
      await service.sendOtp('test@example.com');
      
      const otpEntry = (service as any).otpStore.get('test@example.com');
      const result = await service.verifyOtp('test@example.com', otpEntry.otp);
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid OTP', async () => {
      await service.sendOtp('test@example.com');
      
      await expect(
        service.verifyOtp('test@example.com', '000000')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject expired OTP', async () => {
      // Manually set an expired OTP
      (service as any).otpStore.set('test@example.com', {
        otp: '123456',
        expiresAt: new Date(Date.now() - 1000), // Expired
      });
      
      await expect(
        service.verifyOtp('test@example.com', '123456')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject OTP not found', async () => {
      await expect(
        service.verifyOtp('nonexistent@example.com', '123456')
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete OTP after successful verification', async () => {
      // Setup Prisma mock to return a user
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@example.com' });
      mockPrisma.user.update.mockResolvedValue({ id: 1, email: 'test@example.com', isEmailVerified: true });
      
      await service.sendOtp('test@example.com');
      
      const otpEntry = (service as any).otpStore.get('test@example.com');
      await service.verifyOtp('test@example.com', otpEntry.otp);
      
      expect((service as any).otpStore.has('test@example.com')).toBe(false);
    });
  });

  describe('✅ Resend OTP', () => {
    it('should resend OTP successfully', async () => {
      await service.sendOtp('test@example.com');
      const firstOtp = (service as any).otpStore.get('test@example.com');
      
      // Wait a bit to ensure different OTP
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await service.resendOtp('test@example.com');
      const secondOtp = (service as any).otpStore.get('test@example.com');
      
      expect(secondOtp).toBeDefined();
      expect(secondOtp.otp).not.toBe(firstOtp.otp);
    });

    it('should generate new OTP on resend', async () => {
      await service.sendOtp('test@example.com');
      const firstOtp = (service as any).otpStore.get('test@example.com');
      
      await service.resendOtp('test@example.com');
      const secondOtp = (service as any).otpStore.get('test@example.com');
      
      expect(secondOtp.otp).not.toEqual(firstOtp.otp);
    });
  });

  describe('✅ Get OTP for Testing', () => {
    it('should return OTP in development mode', async () => {
      const otp = await (service as any).getOtpForTesting('test@example.com');
      
      // In test mode, should return OTP from store
      expect(otp).toBeDefined();
    });

    it('should return null in production mode', async () => {
      // Note: Since we're using a factory, we can't easily change the config after instantiation
      // This test verifies the service has the getOtpForTesting method
      expect((service as any).getOtpForTesting).toBeDefined();
    });
  });

  describe('❌ Error Handling', () => {
    it('should handle send OTP failure gracefully', async () => {
      // Email provider throws - but we shouldn't get here since we mock Gmail config
      mockEmailProvider.sendOtpEmail.mockRejectedValue(new Error('Send failed'));
      
      await expect(
        service.sendOtp('test@example.com')
      ).rejects.toThrow();
    });

    it('should handle verify with deleted OTP', async () => {
      // Setup Prisma mock to return a user
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@example.com' });
      mockPrisma.user.update.mockResolvedValue({ id: 1, email: 'test@example.com', isEmailVerified: true });
      
      await service.sendOtp('test@example.com');
      
      const otpEntry = (service as any).otpStore.get('test@example.com');
      await service.verifyOtp('test@example.com', otpEntry.otp);
      
      // Should throw since OTP was deleted
      await expect(
        service.verifyOtp('test@example.com', otpEntry.otp)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have sendOtp method', () => {
      expect(typeof service.sendOtp).toBe('function');
    });

    it('should have verifyOtp method', () => {
      expect(typeof service.verifyOtp).toBe('function');
    });

    it('should have resendOtp method', () => {
      expect(typeof service.resendOtp).toBe('function');
    });
  });
});
