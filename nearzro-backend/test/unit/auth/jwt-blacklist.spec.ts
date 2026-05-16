/**
 * JWT Blacklist Unit Tests
 * NearZro Event Management Platform
 *
 * Tests for JWT token revocation via Redis blacklist
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../../../src/auth/jwt.strategy';
import { AuthService } from '../../../src/auth/auth.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { S3Service } from '../../../src/storage/s3.service';
import { DatabaseStorageService } from '../../../src/storage/database-storage.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import * as jwt from 'jsonwebtoken';
import { EmailProvider } from '../../../src/notifications/providers/email.provider';
import { OtpService } from '../../../src/auth/otp.service';

// Mock Cache
const createCacheMock = () => ({
  get: jest.fn(),
  set: jest.fn(),
});

describe('JwtStrategy - Blacklist', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let cacheMock: any;

  const mockJwtService = {
    sign: jest.fn((payload, options?) => 'signed.token'),
    verify: jest.fn((token: string, options?) => {
      if (token === 'blacklisted.jti') {
        throw new jwt.JsonWebTokenError('token revoked');
      }
      return { sub: 1, email: 'test@example.com', role: 'CUSTOMER', jti: token };
    }),
  };

  beforeEach(async () => {
    cacheMock = createCacheMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { getOrThrow: (key: string) => 'secret' } },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: 'CACHE_MANAGER', useValue: cacheMock },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should throw UnauthorizedException if token has no sub', async () => {
      await expect(strategy.validate({})).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token is blacklisted', async () => {
      // Simulate payload with jti
      const payload = { sub: 1, email: 'test@example.com', role: 'CUSTOMER', jti: 'blacklisted.jti' };

      // Cache mock returns true (blacklisted)
      (cacheMock.get as jest.Mock).mockResolvedValue('true');

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      expect(cacheMock.get).toHaveBeenCalledWith('blacklist:blacklisted.jti');
    });

    it('should pass if token is not blacklisted', async () => {
      const payload = { sub: 1, email: 'test@example.com', role: 'CUSTOMER', jti: 'valid.jti', exp: Math.floor(Date.now() / 1000) + 900 };
      (cacheMock.get as jest.Mock).mockResolvedValue(null);

      const result = await strategy.validate(payload);
      expect(result.userId).toBe(1);
      expect(result.jti).toBe('valid.jti');
      expect(result.exp).toBe(payload.exp);
    });

    it('should pass if token has no jti (legacy tokens)', async () => {
      const payload = { sub: 2, email: 'legacy@example.com', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 900 };
      (cacheMock.get as jest.Mock).mockResolvedValue(null);

      const result = await strategy.validate(payload);
      expect(result.userId).toBe(2);
      expect(result.jti).toBeUndefined();
    });
  });
});

describe('AuthService - JWT Blacklist', () => {
  let authService: AuthService;
  let cacheMock: any;

  const createPrismaMock = () => ({
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    vendor: { findUnique: jest.fn() },
    venue: { findMany: jest.fn() },
  });

  const mockEmailProvider = { sendOtpEmail: jest.fn() };
  const mockOtpService = {};
  const mockS3Service = {};
  const mockDatabaseStorageService = {};

  beforeEach(async () => {
    cacheMock = createCacheMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: createPrismaMock() },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              return null;
            }),
            getOrThrow: (key: string) => 'test-secret',
          },
        },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: OtpService, useValue: mockOtpService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: DatabaseStorageService, useValue: mockDatabaseStorageService },
        { provide: EmailProvider, useValue: mockEmailProvider },
        { provide: 'CACHE_MANAGER', useValue: cacheMock },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('blacklistToken', () => {
    it('should set token in cache with correct TTL', async () => {
      const jti = 'test-jti';
      const expiresAt = Math.floor(Date.now() / 1000) + 900; // 15 min from now

      await authService['blacklistToken'](jti, expiresAt);

      expect(cacheMock.set).toHaveBeenCalledWith(
        'blacklist:test-jti',
        'true',
        expect.any(Number),
      );
    });
  });
});
