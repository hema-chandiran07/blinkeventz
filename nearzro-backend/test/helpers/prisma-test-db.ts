/**
 * Prisma Test Database Helper
 * 
 * This file provides utilities for managing the test database state.
 * It handles database cleanup, seeding, and reset operations for E2E tests.
 * 
 * Responsibilities:
 * - Reset database to clean state before each test
 * - Clean specific tables to isolate tests
 * - Seed minimal required test data
 * - Manage database transactions for test isolation
 * - Properly disconnect after tests
 */

import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Clean all vendor-related tables
 * Deletes data in correct order to respect foreign key constraints
 */
export async function cleanVendorTables(prisma: PrismaService): Promise<void> {
  // Delete in correct order to respect foreign key constraints
  await prisma.vendorService.deleteMany();
  await prisma.vendor.deleteMany();
}

/**
 * Clean all user-related tables
 */
export async function cleanUserTables(prisma: PrismaService): Promise<void> {
  await prisma.user.deleteMany();
}

/**
 * Clean all data related to vendors and users
 */
export async function cleanAllTestData(prisma: PrismaService): Promise<void> {
  // Delete in correct order to respect foreign key constraints
  await prisma.vendorService.deleteMany().catch(() => {});
  await prisma.vendor.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
}

/**
 * Reset database to clean state
 * Use this in beforeEach() to ensure test isolation
 */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await cleanAllTestData(prisma);
}

/**
 * Disconnect Prisma service properly
 * Call this in afterAll() to avoid open handles
 */
export async function disconnectDatabase(prisma: PrismaService | null): Promise<void> {
  if (prisma) {
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.warn('Prisma disconnect error:', e);
    }
  }
}

/**
 * Seed minimal test data required for E2E tests
 * Creates base users and roles needed for authentication
 */
export async function seedMinimalTestData(prisma: PrismaService): Promise<{
  adminUser: any;
  vendorUser: any;
  customerUser: any;
}> {
  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nearzro.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@nearzro.com',
      passwordHash: '$2b$10$test', // Hashed 'password'
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });

  // Create vendor user
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@nearzro.com' },
    update: {},
    create: {
      name: 'Test Vendor',
      email: 'vendor@nearzro.com',
      passwordHash: '$2b$10$test',
      role: 'VENDOR',
      isEmailVerified: true,
      isActive: true,
    },
  });

  // Create customer user
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@nearzro.com' },
    update: {},
    create: {
      name: 'Test Customer',
      email: 'customer@nearzro.com',
      passwordHash: '$2b$10$test',
      role: 'CUSTOMER',
      isEmailVerified: true,
      isActive: true,
    },
  });

  return { adminUser, vendorUser, customerUser };
}

/**
 * Create a test vendor with user
 * Returns both the user and vendor objects
 */
export async function createTestVendorWithUser(
  prisma: PrismaService,
  overrides?: {
    businessName?: string;
    city?: string;
    area?: string;
    verifiedStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  },
): Promise<{ user: any; vendor: any }> {
  const uniqueEmail = `vendor-${Date.now()}@nearzro.com`;
  
  const user = await prisma.user.create({
    data: {
      name: overrides?.businessName || 'Test Vendor',
      email: uniqueEmail,
      passwordHash: '$2b$10$test',
      role: 'VENDOR',
      isEmailVerified: true,
      isActive: true,
    } as any,
  });

  const vendor = await prisma.vendor.create({
    data: {
      userId: user.id,
      businessName: overrides?.businessName || 'Test Business',
      city: overrides?.city || 'Chennai',
      area: overrides?.area || 'Velachery',
      verificationStatus: overrides?.verifiedStatus || 'PENDING',
      serviceRadiusKm: 10,
    } as any,
  });

  return { user, vendor };
}

/**
 * Create a test vendor service
 */
export async function createTestVendorService(
  prisma: PrismaService,
  vendorId: number,
  overrides?: {
    serviceName?: string;
    serviceType?: string;
    baseRate?: number;
    isActive?: boolean;
  },
): Promise<any> {
  return prisma.vendorService.create({
    data: {
      vendorId,
      serviceName: overrides?.serviceName || 'Test Service',
      serviceType: (overrides?.serviceType || 'CATERING') as any,
      description: 'Test service description',
      baseRate: overrides?.baseRate || 1000,
      pricingModel: 'PER_EVENT',
      minGuests: 10,
      maxGuests: 100,
      isActive: overrides?.isActive ?? true,
    } as any,
  });
}

/**
 * Create a test user
 */
export async function createTestUser(
  prisma: PrismaService,
  overrides?: {
    email?: string;
    name?: string;
    role?: string;
    isActive?: boolean;
    isEmailVerified?: boolean;
  },
): Promise<any> {
  const uniqueEmail = overrides?.email || `user-${Date.now()}@nearzro.com`;
  
  return prisma.user.create({
    data: {
      name: overrides?.name || 'Test User',
      email: uniqueEmail,
      passwordHash: '$2b$10$test',
      role: overrides?.role || 'CUSTOMER',
      isActive: overrides?.isActive ?? true,
      isEmailVerified: overrides?.isEmailVerified ?? true,
    } as any,
  });
}

/**
 * Run a function within a database transaction
 * Automatically rolls back on failure
 */
export async function withTransaction<T>(
  prisma: PrismaService,
  fn: () => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn);
}
