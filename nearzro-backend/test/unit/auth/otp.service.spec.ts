/**
 * OTP Service Unit Tests (Retry Logic)
 * NearZro Event Management Platform
 *
 * Focus: OTP brute-force protection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from '../../../src/auth/otp.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from '../../../src/notifications/providers/email.provider';
import { BadRequestException, UnauthorizedException, HttpException } from '@nestjs/common';
import * as crypto from 'crypto';

// Mock EmailProvider
const mockEmailProvider = {
  sendOtpEmail: jest.fn().mockResolvedValue({}),
};

// Mock Prisma
const createPrismaMock = () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
});

describe('OtpService - Retry Logic', () => {
  let service: OtpService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GMAIL_USER') return 'test@gmail.com';
              if (key === 'GMAIL_APP_PASSWORD') return 'password';
              if (key === 'EMAIL_FROM') return 'test@example.com';
              if (key === 'APP_ENV') return 'development'; // enable dev mode
              if (key === 'TWILIO_ACCOUNT_SID') return '';
              if (key === 'TWILIO_AUTH_TOKEN') return '';
              if (key === 'TWILIO_SMS_FROM') return '';
              return null;
            }),
            getOrThrow: jest.fn(),
          },
        },
        { provide: EmailProvider, useValue: mockEmailProvider },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('should set initial retryCount to 0', async () => {
      const email = 'test@example.com';
      await service.sendOtp(email);
      const stored = (service as any).otpStore.get(email);
      expect(stored).toBeDefined();
      expect(stored.retryCount).toBe(0);
      expect(stored.lastSentAt).toBeInstanceOf(Date);
    });
  });

  describe('sendPhoneOtp', () => {
    it('should set initial retryCount to 0 for phone', async () => {
      const phone = '+919876543210';
      await service.sendPhoneOtp(phone);
      const stored = (service as any).phoneOtpStore.get(phone);
      expect(stored).toBeDefined();
      expect(stored.retryCount).toBe(0);
      expect(stored.lastSentAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyOtp', () => {
    it('should succeed on correct OTP', async () => {
      const email = 'test@example.com';
      await service.sendOtp(email);
      // Get the actual OTP generated
      const stored = (service as any).otpStore.get(email);
      const otp = stored.otp;
      const result = await service.verifyOtp(email, otp);
      expect(result.success).toBe(true);
    });

    it('should increment retryCount on wrong OTP', async () => {
      const email = 'test@example.com';
      await service.sendOtp(email);
      const wrongOtp = '000000';
      try {
        await service.verifyOtp(email, wrongOtp);
      } catch (e) {
        // Expected error
      }
      const stored = (service as any).otpStore.get(email);
      expect(stored.retryCount).toBe(1);
    });

  it('should invalidate OTP after 5 failed attempts', async () => {
    const email = 'test@example.com';
    await service.sendOtp(email);
    const wrongOtp = '000000';

    // Fail 4 times (should still be BadRequest)
    for (let i = 0; i < 4; i++) {
      try {
        await service.verifyOtp(email, wrongOtp);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    }

    // OTP should still exist with retryCount 4
    let stored = (service as any).otpStore.get(email);
    expect(stored).toBeDefined();
    expect(stored.retryCount).toBe(4);

    // 5th attempt should throw Unauthorized and delete entry
    await expect(service.verifyOtp(email, wrongOtp))
      .rejects.toThrow(UnauthorizedException);

    // OTP should be deleted
    stored = (service as any).otpStore.get(email);
    expect(stored).toBeUndefined();
  });

    it('should throw UnauthorizedException after 5 failed attempts', async () => {
      const email = 'test@example.com';
      await service.sendOtp(email);
      const wrongOtp = '000000';

      // Fail 5 times
      for (let i = 0; i < 4; i++) {
        try {
          await service.verifyOtp(email, wrongOtp);
        } catch (e) {
          expect(e).toBeInstanceOf(BadRequestException);
        }
      }

      // 5th attempt
      await expect(service.verifyOtp(email, wrongOtp))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyPhoneOtp', () => {
    it('should increment retryCount on wrong OTP', async () => {
      const phone = '+919876543210';
      await service.sendPhoneOtp(phone);
      // Use wrong OTP
      try {
        await service.verifyPhoneOtp(phone, '000000');
      } catch (e) {}
      const stored = (service as any).phoneOtpStore.get(phone);
      expect(stored.retryCount).toBe(1);
    });

    it('should invalidate OTP after 5 failed attempts', async () => {
      const phone = '+919876543210';
      await service.sendPhoneOtp(phone);
      for (let i = 0; i < 5; i++) {
        try {
          await service.verifyPhoneOtp(phone, '000000');
        } catch (e) {}
      }
      const stored = (service as any).phoneOtpStore.get(phone);
      expect(stored).toBeUndefined();
    });
  });

  describe('resendOtp', () => {
  });
});
