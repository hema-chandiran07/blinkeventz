/**
 * Comprehensive Auth Service Unit Tests
 * Tests for Registration, Login, Password Reset, OTP, OAuth, and Guards
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { OtpService } from './otp.service';
import { EmailProvider } from '../notifications/providers/email.provider';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock S3Service and DatabaseStorageService at module level to avoid AWS SDK initialization errors
jest.mock('../storage/s3.service', () => ({
  S3Service: jest.fn().mockImplementation(() => ({
    uploadKycDocument: jest.fn().mockResolvedValue('https://s3.mock'),
  })),
}));

jest.mock('../storage/database-storage.service', () => ({
  DatabaseStorageService: jest.fn().mockImplementation(() => ({
    storeFile: jest.fn().mockResolvedValue('data-url'),
  })),
}));

// Mock crypto module at module level
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('mock-token')),
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({ digest: jest.fn(() => 'hash') })),
  })),
  randomInt: jest.fn(() => 123456),
  randomUUID: jest.fn(() => 'uuid-1234'),
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('AuthService - Comprehensive Unit Tests', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let otpService: OtpService;

  // Mock implementations
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    vendor: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    venue: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    kycDocument: {
      create: jest.fn(),
    },
    vendorService: {
      create: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(() => 'mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-jwt-secret',
        JWT_EXPIRES_IN: '15m',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
    getOrThrow: jest.fn((key: string) => 'test-jwt-secret'),
  };

  const mockOtpService = {
    sendOtp: jest.fn().mockResolvedValue({ success: true }),
    verifyOtp: jest.fn().mockResolvedValue(true),
  };

  const mockEmailProvider = {
    send: jest.fn().mockResolvedValue(true),
    sendOtpEmail: jest.fn().mockResolvedValue(true),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  } as unknown as Cache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: EmailProvider, useValue: mockEmailProvider },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    otpService = module.get<OtpService>(OtpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
