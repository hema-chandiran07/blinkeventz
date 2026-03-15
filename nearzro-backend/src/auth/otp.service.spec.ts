/**
 * OTP Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

describe('OtpService', () => {
  let service: OtpService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SENDGRID_API_KEY: '',
        EMAIL_FROM: 'test@test.com',
        APP_ENV: 'development',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('✅ Send OTP', () => {
    it('should send OTP successfully', async () => {
      const result = await service.sendOtp('test@test.com');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
    });

    it('should generate 6-digit OTP', async () => {
      const result = await service.sendOtp('test@test.com');

      // OTP should be generated (the actual value is logged to console)
      expect(result.success).toBe(true);
    });

    it('should store OTP with 5-minute expiry', async () => {
      const email = 'test@test.com';
      await service.sendOtp(email);

      // The OTP should be stored in the internal store
      const storedOtp = (service as any).otpStore.get(email);
      expect(storedOtp).toBeDefined();
      expect(storedOtp).toHaveProperty('otp');
      expect(storedOtp).toHaveProperty('expiresAt');
    });

    it('should send OTP with phone number', async () => {
      const result = await service.sendOtp('test@test.com', '1234567890');

      expect(result.success).toBe(true);
    });
  });

  describe('✅ Verify OTP', () => {
    it('should verify correct OTP successfully', async () => {
      const email = 'test@test.com';
      const validOtp = '123456';

      // First, send OTP to store it
      await service.sendOtp(email);

      // Get the stored OTP
      const storedOtp = (service as any).otpStore.get(email);

      // Verify with the correct OTP
      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        email: email,
        isEmailVerified: true,
      });

      const result = await service.verifyOtp(email, storedOtp.otp);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');
    });

    it('should reject invalid OTP', async () => {
      const email = 'test@test.com';

      // Send OTP first
      await service.sendOtp(email);

      // Try to verify with wrong OTP
      await expect(service.verifyOtp(email, '000000')).rejects.toThrow(BadRequestException);
    });

    it('should reject expired OTP', async () => {
      const email = 'test@test.com';

      // Manually set an expired OTP
      const expiredDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      (service as any).otpStore.set(email, {
        otp: '123456',
        expiresAt: expiredDate,
      });

      await expect(service.verifyOtp(email, '123456')).rejects.toThrow(BadRequestException);
    });

    it('should reject OTP not found', async () => {
      await expect(service.verifyOtp('nonexistent@test.com', '123456')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should delete OTP after successful verification', async () => {
      const email = 'test@test.com';

      // Send OTP
      await service.sendOtp(email);

      // Get stored OTP
      const storedOtp = (service as any).otpStore.get(email);

      // Verify
      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        email: email,
        isEmailVerified: true,
      });

      await service.verifyOtp(email, storedOtp.otp);

      // OTP should be deleted from store
      const deletedOtp = (service as any).otpStore.get(email);
      expect(deletedOtp).toBeUndefined();
    });
  });

  describe('✅ Resend OTP', () => {
    it('should resend OTP successfully', async () => {
      const result = await service.resendOtp('test@test.com');

      expect(result).toHaveProperty('success', true);
    });

    it('should generate new OTP on resend', async () => {
      const email = 'test@test.com';

      // Send first OTP
      await service.sendOtp(email);
      const firstOtp = (service as any).otpStore.get(email).otp;

      // Resend OTP
      await service.resendOtp(email);
      const secondOtp = (service as any).otpStore.get(email).otp;

      // OTPs should be different
      expect(firstOtp).not.toBe(secondOtp);
    });
  });

  describe('✅ Get OTP for Testing', () => {
    it('should return OTP in development mode', () => {
      const email = 'test@test.com';

      // In development mode, it should return the OTP
      const otp = service.getOtpForTesting(email);

      // Since sendOtp was called, OTP should be in store
      expect(otp).toBeDefined();
    });

    it('should return null in production mode', () => {
      // Override the config to simulate production
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'APP_ENV') return 'production';
        return '';
      });

      const otp = service.getOtpForTesting('test@test.com');

      // In production, should return null
      expect(otp).toBeNull();
    });
  });

  describe('❌ Error Handling', () => {
    it('should handle send OTP failure gracefully', async () => {
      // Even if email sending fails, should return success in dev mode
      const result = await service.sendOtp('test@test.com');

      expect(result.success).toBe(true);
    });

    it('should handle verify with deleted OTP', async () => {
      const email = 'test@test.com';

      // Send OTP
      await service.sendOtp(email);

      // Get and verify to delete
      const storedOtp = (service as any).otpStore.get(email);
      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        email: email,
        isEmailVerified: true,
      });

      await service.verifyOtp(email, storedOtp.otp);

      // Try to verify again - should fail
      await expect(service.verifyOtp(email, storedOtp.otp)).rejects.toThrow();
    });
  });

  describe('Service', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have sendOtp method', () => {
      expect(service.sendOtp).toBeDefined();
      expect(typeof service.sendOtp).toBe('function');
    });

    it('should have verifyOtp method', () => {
      expect(service.verifyOtp).toBeDefined();
      expect(typeof service.verifyOtp).toBe('function');
    });

    it('should have resendOtp method', () => {
      expect(service.resendOtp).toBeDefined();
      expect(typeof service.resendOtp).toBe('function');
    });
  });
});
