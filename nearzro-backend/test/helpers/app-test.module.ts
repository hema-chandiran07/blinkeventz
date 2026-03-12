/**
 * Test App Module Helper
 * 
 * This file provides utilities for creating test NestJS modules.
 * It helps set up the application context for integration and E2E tests.
 * 
 * Responsibilities:
 * - Create testing module with real dependencies
 * - Override providers with mocks
 * - Compile and configure test modules
 */

import { TestingModule, Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { VendorsModule } from '../../src/vendors/vendors.module';
import { VendorServicesModule } from '../../src/vendors/vendor-services/vendor-services.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

/**
 * Create a full application testing module
 * Includes all real dependencies
 */
export async function createAppTestingModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [AppModule],
  }).compile();
}

/**
 * Create Vendors module testing module
 * Useful for testing vendor-related functionality
 */
export async function createVendorsTestingModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [VendorsModule],
  }).compile();
}

/**
 * Create VendorServices module testing module
 */
export async function createVendorServicesTestingModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [VendorServicesModule],
  }).compile();
}

/**
 * Create testing module with custom providers
 * 
 * @param imports - Modules to import
 * @param providers - Providers to override or add
 */
export async function createCustomTestingModule(
  imports: any[],
  providers: any[],
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports,
    providers,
  }).compile();
}

/**
 * Create testing module with mocked Prisma
 * 
 * @param imports - Modules to import
 * @param mockPrisma - Custom Prisma mock (optional)
 */
export async function createTestingModuleWithMockPrisma(
  imports: any[],
  mockPrisma?: any,
): Promise<TestingModule> {
  const module = await Test.createTestingModule({
    imports,
    providers: [
      {
        provide: PrismaService,
        useValue: mockPrisma || createMockPrismaService(),
      },
    ],
  }).compile();

  return module;
}

/**
 * Create a mock Prisma service
 * Returns basic mock implementation
 */
export function createMockPrismaService(): any {
  return {
    vendor: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    vendorService: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((fn) => fn()),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}

/**
 * Get service from testing module
 * 
 * @param module - Compiled testing module
 * @param serviceToken - Service token to retrieve
 */
export function getService<T>(module: TestingModule, serviceToken: any): T {
  return module.get<T>(serviceToken);
}

/**
 * Create mock JwtService for testing
 */
export function createMockJwtService(): JwtService {
  return {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn().mockReturnValue({ sub: 1, email: 'test@test.com', role: 'ADMIN' }),
    decode: jest.fn().mockReturnValue({ sub: 1, email: 'test@test.com', role: 'ADMIN' }),
  } as any;
}
