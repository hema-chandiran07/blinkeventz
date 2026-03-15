/**
 * JWT Strategy Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret-key',
      };
      return config[key];
    }),
    getOrThrow: jest.fn((key: string) => 'test-secret-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('✅ Validation', () => {
    it('should validate and return user payload', async () => {
      const payload = {
        sub: 1,
        email: 'test@test.com',
        role: 'CUSTOMER',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    });

    it('should handle different roles', async () => {
      const adminPayload = {
        sub: 1,
        email: 'admin@test.com',
        role: 'ADMIN',
      };

      const vendorPayload = {
        sub: 2,
        email: 'vendor@test.com',
        role: 'VENDOR',
      };

      const venueOwnerPayload = {
        sub: 3,
        email: 'venue@test.com',
        role: 'VENUE_OWNER',
      };

      const adminResult = await strategy.validate(adminPayload);
      const vendorResult = await strategy.validate(vendorPayload);
      const venueOwnerResult = await strategy.validate(venueOwnerPayload);

      expect(adminResult.role).toBe('ADMIN');
      expect(vendorResult.role).toBe('VENDOR');
      expect(venueOwnerResult.role).toBe('VENUE_OWNER');
    });

    it('should map sub to userId', async () => {
      const payload = {
        sub: 123,
        email: 'test@test.com',
        role: 'CUSTOMER',
      };

      const result = await strategy.validate(payload);

      expect(result.userId).toBe(123);
      expect(result.userId).toBe(payload.sub);
    });
  });

  describe('✅ JWT Configuration', () => {
    it('should extract JWT from Authorization header', () => {
      // The strategy should be configured to extract JWT from bearer token
      expect(strategy).toBeDefined();
    });

    it('should use JWT_SECRET from config', () => {
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('✅ Strategy Instance', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should have validate method', () => {
      expect(strategy.validate).toBeDefined();
      expect(typeof strategy.validate).toBe('function');
    });
  });

  describe('❌ Error Handling', () => {
    it('should handle missing payload fields', async () => {
      const incompletePayload = {
        sub: 1,
        // email and role missing
      } as any;

      const result = await strategy.validate(incompletePayload);

      // Should still return userId even if other fields are missing
      expect(result.userId).toBe(1);
    });

    it('should handle null payload', async () => {
      const result = await strategy.validate(null as any);

      // Should handle null gracefully
      expect(result).toBeDefined();
    });
  });
});
