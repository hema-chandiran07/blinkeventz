/**
 * Comprehensive Auth Service Unit Tests
 * Tests for Registration, Login, Password Reset, OTP, OAuth, and Guards
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { OtpService } from './otp.service';

// Mock crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('mock-token-data')),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('hashed-token'),
    }),
  }),
  randomInt: jest.fn().mockReturnValue(123456),
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

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ sub: 1, email: 'test@test.com', role: 'CUSTOMER' }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret-key-for-testing',
        JWT_EXPIRATION: '15m',
        JWT_ISSUER: 'nearzro',
        JWT_AUDIENCE: 'nearzro-api',
      };
      return config[key];
    }),
    getOrThrow: jest.fn((key: string) => 'test-secret-key-for-testing'),
  };

  const mockOtpService = {
    sendOtp: jest.fn().mockResolvedValue({ success: true, message: 'OTP sent successfully' }),
    verifyOtp: jest.fn().mockResolvedValue({ success: true, message: 'OTP verified successfully' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OtpService, useValue: mockOtpService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    otpService = module.get<OtpService>(OtpService);

    jest.clearAllMocks();
  });

  // ========================================
  // REGISTRATION TESTS - POSITIVE CASES
  // ========================================

  describe('✅ Registration - Customer', () => {
    const validCustomerDto = {
      name: 'Test Customer',
      email: 'customer@test.com',
      password: 'Test@1234',
    };

    it('should register customer successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        ...validCustomerDto,
        role: Role.CUSTOMER,
        passwordHash: 'hashed_password',
        isEmailVerified: false,
      });
      mockOtpService.sendOtp.mockResolvedValue({ success: true, message: 'OTP sent' });

      const result = await service.register(validCustomerDto);

      expect(result).toBeDefined();
      expect(result.user).toHaveProperty('email', validCustomerDto.email);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockOtpService.sendOtp).toHaveBeenCalledWith(validCustomerDto.email, undefined);
    });

    it('should hash password with bcrypt', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        ...validCustomerDto,
        role: Role.CUSTOMER,
        passwordHash: 'hashed_password',
      });
      mockOtpService.sendOtp.mockResolvedValue({ success: true, message: 'OTP sent' });

      await service.register(validCustomerDto);

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe(validCustomerDto.password);
      expect(createCall.data.passwordHash).toBeDefined();
    });
  });

  describe('✅ Registration - Vendor', () => {
    const validVendorDto = {
      name: 'Test Vendor',
      email: 'vendor@test.com',
      password: 'Test@1234',
      businessName: 'Test Business',
      businessType: 'DECORATION',
      description: 'Test description',
      city: 'Test City',
      area: 'Test Area',
      phone: '1234567890',
      serviceRadiusKm: 10,
      kycDocType: 'AADHAR',
      kycDocNumber: '1234567890',
    };

    it('should register vendor successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        email: validVendorDto.email,
        name: validVendorDto.name,
        role: Role.VENDOR,
      });
      mockPrisma.vendor.create.mockResolvedValue({
        id: 1,
        userId: 1,
        businessName: validVendorDto.businessName,
      });
      mockPrisma.kycDocument.create.mockResolvedValue({ id: 1 });
      mockOtpService.sendOtp.mockResolvedValue({ success: true, message: 'OTP sent' });

      const result = await service.registerVendor(validVendorDto);

      expect(result).toBeDefined();
      expect(result.user).toHaveProperty('email', validVendorDto.email);
      expect(mockPrisma.vendor.create).toHaveBeenCalled();
    });
  });

  describe('✅ Registration - Venue Owner', () => {
    const validVenueOwnerDto = {
      name: 'Test Venue Owner',
      email: 'venueowner@test.com',
      password: 'Test@1234',
      venueName: 'Test Venue',
      venueType: 'Banquet Hall',
      description: 'Test venue description',
      city: 'Test City',
      area: 'Test Area',
      phone: '1234567890',
      capacity: '100',
      kycDocType: 'AADHAR',
      kycDocNumber: '1234567890',
    };

    it('should register venue owner successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        email: validVenueOwnerDto.email,
        name: validVenueOwnerDto.name,
        role: Role.VENUE_OWNER,
      });
      mockPrisma.venue.create.mockResolvedValue({
        id: 1,
        name: validVenueOwnerDto.venueName,
      });
      mockPrisma.kycDocument.create.mockResolvedValue({ id: 1 });
      mockOtpService.sendOtp.mockResolvedValue({ success: true, message: 'OTP sent' });

      const result = await service.registerVenueOwner(validVenueOwnerDto, {} as any);

      expect(result).toBeDefined();
      expect(result.user).toHaveProperty('email', validVenueOwnerDto.email);
      expect(mockPrisma.venue.create).toHaveBeenCalled();
    });
  });

  // ========================================
  // REGISTRATION TESTS - NEGATIVE CASES
  // ========================================

  describe('❌ Registration - Negative Cases', () => {
    it('should reject duplicate email registration', async () => {
      const existingUser = {
        id: 1,
        email: 'existing@test.com',
        name: 'Existing User',
      };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(
        service.register({
          name: 'New User',
          email: 'existing@test.com',
          password: 'Test@1234',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject weak password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({
          name: 'Test User',
          email: 'test@test.com',
          password: 'weak',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid email format', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({
          name: 'Test User',
          email: 'invalid-email',
          password: 'Test@1234',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject missing required fields', async () => {
      await expect(
        service.register({
          name: 'Test User',
          // email missing
          password: 'Test@1234',
        } as any)
      ).rejects.toThrow();
    });
  });

  // ========================================
  // LOGIN TESTS - POSITIVE CASES
  // ========================================

  describe('✅ Login - Positive Cases', () => {
    const validUser = {
      id: 1,
      email: 'test@test.com',
      name: 'Test User',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqKx8p5gO', // Test@1234
      role: Role.CUSTOMER,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      vendor: null,
      venues: [],
    };

    it('should login with email successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(validUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('access-token');
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 1 });

      const result = await service.login({
        email: 'test@test.com',
        password: 'Test@1234',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(validUser.email);
    });

    it('should login with vendor username successfully', async () => {
      const vendorUser = {
        ...validUser,
        vendor: {
          id: 1,
          username: 'testvendor',
          userId: 1,
        },
        venues: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.vendor.findUnique.mockResolvedValue({
        id: 1,
        username: 'testvendor',
        user: vendorUser,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('access-token');
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 1 });

      const result = await service.login({
        email: 'testvendor',
        password: 'Test@1234',
      });

      expect(result.user.role).toBe(Role.VENDOR);
    });

    it('should login with venue username successfully', async () => {
      const venueUser = {
        ...validUser,
        vendor: null,
        venues: [
          {
            id: 1,
            username: 'testvenue',
            name: 'Test Venue',
            userId: 1,
          },
        ],
      };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.venue.findFirst.mockResolvedValue({
        id: 1,
        username: 'testvenue',
        owner: venueUser,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('access-token');
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 1 });

      const result = await service.login({
        email: 'testvenue',
        password: 'Test@1234',
      });

      expect(result.user.role).toBe(Role.VENUE_OWNER);
    });

    it('should return refresh token on login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(validUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('access-token');
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 1 });

      const result = await service.login({
        email: 'test@test.com',
        password: 'Test@1234',
      });

      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.refreshToken).toBe('string');
    });
  });

  // ========================================
  // LOGIN TESTS - NEGATIVE CASES
  // ========================================

  describe('❌ Login - Negative Cases', () => {
    it('should reject login with wrong password', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        passwordHash: await bcrypt.hash('CorrectPassword123!', 12),
        failedLoginAttempts: 0,
        lockedUntil: null,
        isActive: true,
        vendor: null,
        venues: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@test.com', password: 'WrongPassword' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject login with non-existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.venue.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@test.com', password: 'Password123!' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject login with inactive user', async () => {
      const inactiveUser = {
        id: 1,
        email: 'inactive@test.com',
        passwordHash: await bcrypt.hash('Password123!', 12),
        isActive: false,
        vendor: null,
        venues: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(
        service.login({ email: 'inactive@test.com', password: 'Password123!' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject OAuth-only user login with password', async () => {
      const oauthUser = {
        id: 1,
        email: 'oauth@test.com',
        passwordHash: null,
        googleId: 'google_12345',
        isActive: true,
        vendor: null,
        venues: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(oauthUser);

      await expect(
        service.login({ email: 'oauth@test.com', password: 'anypassword' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject login when account is locked', async () => {
      const lockedUser = {
        id: 1,
        email: 'locked@test.com',
        passwordHash: await bcrypt.hash('Password123!', 12),
        isActive: true,
        lockedUntil: new Date(Date.now() + 60 * 60 * 1000), // Locked for 1 hour
        failedLoginAttempts: 5,
        vendor: null,
        venues: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(lockedUser);

      await expect(
        service.login({ email: 'locked@test.com', password: 'Password123!' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ========================================
  // PASSWORD RESET TESTS
  // ========================================

  describe('✅ Password Reset', () => {
    it('should generate reset token for forgot password', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.passwordResetToken.create.mockResolvedValue({ id: 1 });

      const result = await service.forgotPassword({ email: 'test@test.com' });

      expect(result).toHaveProperty('message');
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
    });

    it('should reset password with valid token', async () => {
      const resetToken = 'valid-reset-token';
      const hashedToken = 'hashed-token';
      const user = {
        id: 1,
        email: 'test@test.com',
        passwordHash: 'old-hash',
      };

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        token: hashedToken,
        userId: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, passwordHash: 'new-hash' });
      mockPrisma.passwordResetToken.delete.mockResolvedValue({ id: 1 });

      const result = await service.resetPassword({
        token: resetToken,
        newPassword: 'NewTest@1234',
        confirmPassword: 'NewTest@1234',
      });

      expect(result).toHaveProperty('message');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should reject reset password with invalid token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'invalid-token',
          newPassword: 'NewTest@1234',
          confirmPassword: 'NewTest@1234',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject reset password with expired token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        token: 'hashed-token',
        userId: 1,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired 1 hour ago
      });

      await expect(
        service.resetPassword({
          token: 'expired-token',
          newPassword: 'NewTest@1234',
          confirmPassword: 'NewTest@1234',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject reset password with mismatched passwords', async () => {
      await expect(
        service.resetPassword({
          token: 'some-token',
          newPassword: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // OTP TESTS
  // ========================================

  describe('✅ OTP Verification', () => {
    it('should send OTP successfully', async () => {
      mockOtpService.sendOtp.mockResolvedValue({ success: true, message: 'OTP sent successfully' });

      const result = await service.sendOtp('test@test.com');

      expect(result.success).toBe(true);
      expect(mockOtpService.sendOtp).toHaveBeenCalledWith('test@test.com', undefined);
    });

    it('should verify OTP successfully', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
        isEmailVerified: true,
      };
      mockOtpService.verifyOtp.mockResolvedValue({ success: true, message: 'Verified', user });

      const result = await service.verifyOtp('test@test.com', '123456');

      expect(result.success).toBe(true);
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith('test@test.com', '123456');
    });

    it('should reject invalid OTP', async () => {
      mockOtpService.verifyOtp.mockRejectedValue(new BadRequestException('Invalid OTP'));

      await expect(service.verifyOtp('test@test.com', '000000')).rejects.toThrow(BadRequestException);
    });

    it('should reject expired OTP', async () => {
      mockOtpService.verifyOtp.mockRejectedValue(new BadRequestException('OTP has expired'));

      await expect(service.verifyOtp('test@test.com', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // OAUTH TESTS
  // ========================================

  describe('✅ OAuth Login', () => {
    it('should handle Google login for new user', async () => {
      const googleUser = {
        googleId: 'google-12345',
        email: 'google@test.com',
        name: 'Google User',
        picture: 'https://google.com/pic.jpg',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        ...googleUser,
        role: Role.CUSTOMER,
      });
      mockJwt.sign.mockReturnValue('access-token');

      const result = await service.googleLogin(googleUser);

      expect(result).toHaveProperty('accessToken');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should handle Google login for existing user', async () => {
      const existingUser = {
        id: 1,
        googleId: null,
        email: 'existing@test.com',
        name: 'Existing User',
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce({ googleId: 'google-12345' }); // First call with googleId
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser); // Second call with email
      mockPrisma.user.update.mockResolvedValue({ ...existingUser, googleId: 'google-12345' });
      mockJwt.sign.mockReturnValue('access-token');

      const result = await service.googleLogin({
        googleId: 'google-12345',
        email: 'existing@test.com',
        name: 'Existing User',
      });

      expect(result).toHaveProperty('accessToken');
    });

    it('should handle Facebook login for new user', async () => {
      const facebookUser = {
        facebookId: 'facebook-12345',
        email: 'facebook@test.com',
        name: 'Facebook User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        ...facebookUser,
        role: Role.CUSTOMER,
      });
      mockJwt.sign.mockReturnValue('access-token');

      const result = await service.facebookLogin(facebookUser);

      expect(result).toHaveProperty('accessToken');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should reject OAuth profile without email', async () => {
      await expect(
        service.googleLogin({
          googleId: 'google-12345',
          email: '',
          name: 'No Email User',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // REFRESH TOKEN TESTS
  // ========================================

  describe('✅ Refresh Token', () => {
    it('should refresh token with valid refresh token', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        role: Role.CUSTOMER,
      };
      const refreshToken = 'valid-refresh-token';

      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 1,
        userId: 1,
        token: 'hashed-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        revoked: false,
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.refreshToken.update.mockResolvedValue({ id: 1, revoked: true });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 2 });
      mockJwt.sign.mockReturnValue('new-access-token');

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject expired refresh token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 1,
        userId: 1,
        token: 'hashed-token',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Expired
        revoked: false,
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject revoked refresh token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 1,
        userId: 1,
        token: 'hashed-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        revoked: true,
      });

      await expect(service.refreshToken('revoked-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ========================================
  // TOKEN REVOCATION TESTS
  // ========================================

  describe('✅ Token Revocation', () => {
    it('should revoke specific refresh token', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.revokeToken('token-to-revoke');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('should revoke all user tokens (logout all devices)', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      await service.revokeAllUserTokens(1);

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, revoked: false },
        data: { revoked: true },
      });
    });
  });

  // ========================================
  // GUARDS TESTS
  // ========================================

  describe('✅ Guards & Authorization', () => {
    it('should generate valid JWT token', async () => {
      const payload = {
        sub: 1,
        email: 'test@test.com',
        role: Role.CUSTOMER,
        hasVendorProfile: false,
        hasVenueProfile: false,
      };

      const token = await service.generateTokens({
        id: 1,
        email: 'test@test.com',
        role: Role.CUSTOMER,
      });

      expect(token.accessToken).toBeDefined();
      expect(mockJwt.sign).toHaveBeenCalled();
    });

    it('should include correct payload in JWT', async () => {
      const payload = {
        sub: 1,
        email: 'test@test.com',
        role: Role.CUSTOMER,
      };

      await service.generateTokens({
        id: 1,
        email: 'test@test.com',
        role: Role.CUSTOMER,
      });

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 1,
          email: 'test@test.com',
          role: Role.CUSTOMER,
        }),
        expect.any(Object)
      );
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe('⚠️ Edge Cases', () => {
    it('should handle login with user name (legacy)', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        name: 'testuser',
        passwordHash: await bcrypt.hash('Password123!', 12),
        role: Role.CUSTOMER,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        vendor: null,
        venues: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.venue.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('access-token');
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 1 });

      const result = await service.login({
        email: 'testuser',
        password: 'Password123!',
      });

      expect(result).toBeDefined();
    });

    it('should handle check email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@test.com' });

      const result = await service.checkEmailExists('test@test.com');

      expect(result).toBe(true);
    });

    it('should return false for non-existing email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.checkEmailExists('nonexistent@test.com');

      expect(result).toBe(false);
    });
  });
});
