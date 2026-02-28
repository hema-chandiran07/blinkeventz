/**
 * Backend Unit Tests - Auth Service
 * Comprehensive test suite for authentication logic
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService - Unit Tests', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  // Mock implementations
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('register()', () => {
    const validDto = {
      name: 'Test User',
      email: 'test@test.com',
      password: 'Test@1234',
      role: 'CUSTOMER',
    };

    it('should successfully register a new customer', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        ...validDto,
        passwordHash: 'hashed_password',
      });
      mockJwt.sign.mockReturnValue('mock-token-123');

      // Act
      const result = await service.register(validDto);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(validDto.email);
      expect(result.user.role).toBe(validDto.role);
      
      // Verify Prisma calls
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validDto.email },
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: validDto.email,
            role: validDto.role,
          }),
        }),
      );
    });

    it('should successfully register a venue owner', async () => {
      // Arrange
      const venueOwnerDto = {
        ...validDto,
        role: 'VENUE_OWNER' as const,
      };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 2,
        ...venueOwnerDto,
        passwordHash: 'hashed_password',
      });
      mockJwt.sign.mockReturnValue('mock-token-456');

      // Act
      const result = await service.register(venueOwnerDto);

      // Assert
      expect(result.user.role).toBe('VENUE_OWNER');
    });

    it('should successfully register a vendor', async () => {
      // Arrange
      const vendorDto = {
        ...validDto,
        role: 'VENDOR' as const,
      };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 3,
        ...vendorDto,
        passwordHash: 'hashed_password',
      });
      mockJwt.sign.mockReturnValue('mock-token-789');

      // Act
      const result = await service.register(vendorDto);

      // Assert
      expect(result.user.role).toBe('VENDOR');
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 999,
        email: validDto.email,
      });

      // Act & Assert
      await expect(service.register(validDto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should hash password before storing', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        ...validDto,
        passwordHash: 'hashed_Test@1234',
      });
      mockJwt.sign.mockReturnValue('mock-token');

      // Act
      await service.register(validDto);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: expect.stringContaining('hashed_'),
          }),
        }),
      );
    });
  });

  describe('login()', () => {
    const validCredentials = {
      email: 'test@test.com',
      password: 'Test@1234',
    };

    const mockUser = {
      id: 1,
      email: validCredentials.email,
      passwordHash: 'hashed_Test@1234',
      name: 'Test User',
      role: 'CUSTOMER' as const,
      isActive: true,
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('valid-token');

      // Act
      const result = await service.login(validCredentials);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(validCredentials.email);
      expect(result.token).toBe('valid-token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(validCredentials)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(validCredentials)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(service.login(validCredentials)).rejects.toThrow(UnauthorizedException);
    });

    it('should return user without password in response', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('token');

      // Act
      const result = await service.login(validCredentials);

      // Assert
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');
      expect(result.user).toHaveProperty('role');
    });
  });

  describe('getCurrentUser()', () => {
    it('should return user without sensitive data', async () => {
      // Arrange
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'test@test.com',
        name: 'Test User',
        role: 'CUSTOMER' as const,
        passwordHash: 'hashed',
        isActive: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.getCurrentUser(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null if user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getCurrentUser(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validateUser()', () => {
    it('should return user data without password if valid', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        passwordHash: 'hashed',
        name: 'Test User',
        role: 'CUSTOMER' as const,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(1);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null if user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.validateUser(999);

      // Assert
      expect(result).toBeNull();
    });
  });
});
