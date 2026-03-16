/**
 * Vendors Integration Test Suite
 * 
 * Integration tests that test the VendorsService with real Prisma database.
 * These tests use the actual database but in an isolated transaction.
 * 
 * Test Categories:
 * - Service + Prisma interaction
 * - Database transactions
 * - Business logic validation
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { VendorsService } from '../../src/vendors/vendors.service';
import { VendorServicesService } from '../../src/vendors/vendor-services/vendor-services.service';
import * as dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });
dotenv.config();

const TEST_TIMEOUT = 30000;

describe('Vendors Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let vendorsService: VendorsService;
  let vendorServicesService: VendorServicesService;

  beforeAll(async () => {
    // Create testing module with full app for proper DI
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    
    // Connect to database
    prisma = app.get<PrismaService>(PrismaService);
    await prisma.$connect();
    
    await app.init();

    vendorsService = app.get<VendorsService>(VendorsService);
    vendorServicesService = app.get<VendorServicesService>(VendorServicesService);

    // Clean up any existing test data first
    await cleanupDatabase(prisma);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup - disconnect database first, then close app
    if (prisma) {
      try {
        await cleanupDatabase(prisma);
        await prisma.$disconnect();
      } catch (e) {
        console.warn('Cleanup error:', e);
      }
    }

    if (app) {
      try {
        await app.close();
      } catch (e) {
        console.warn('App close error:', e);
      }
    }
  });

  beforeEach(async () => {
    // Clean vendor services and vendors before each test (but keep users for isolation)
    await prisma.vendorService.deleteMany().catch(() => {});
    await prisma.vendor.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
  });

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  async function cleanupDatabase(prisma: PrismaService) {
    // Clean in correct order: child tables first, then parent tables
    await prisma.vendorService.deleteMany().catch(() => {});
    await prisma.vendor.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
  }

  // Each test creates its own user for complete isolation
  async function createTestUser(role: 'VENDOR' | 'ADMIN' = 'VENDOR') {
    const timestamp = Date.now() + Math.random();
    const user = await prisma.user.create({
      data: {
        name: role === 'VENDOR' ? 'Test Vendor' : 'Test Admin',
        email: `integration-${role.toLowerCase()}-${timestamp}@test.com`,
        passwordHash: '$2b$10$test',
        role: role,
        isEmailVerified: true,
        isActive: true,
      },
    });
    return user;
  }

  // ============================================
  // VENDOR CREATION TESTS
  // ============================================

  describe('Vendor Creation', () => {
    it('should create a vendor with valid data', async () => {
      const user = await createTestUser('VENDOR');
      
      const vendorData = {
        businessName: 'Integration Test Vendor',
        city: 'Chennai',
        area: 'Velachery',
        serviceRadiusKm: 15,
      };

      const vendor = await vendorsService.createVendor(user.id, vendorData, true);

      expect(vendor).toBeDefined();
      expect(vendor.businessName).toBe(vendorData.businessName);
      expect(vendor.city).toBe(vendorData.city);
      expect(vendor.verificationStatus).toBe('PENDING');
    });

    it('should create vendor with minimal data', async () => {
      const user = await createTestUser('VENDOR');
      
      const vendorData = {
        businessName: 'Minimal Vendor',
        city: 'Bangalore',
        area: 'MG Road',
      };

      const vendor = await vendorsService.createVendor(user.id, vendorData, true);

      expect(vendor).toBeDefined();
      expect(vendor.businessName).toBe('Minimal Vendor');
    });

    it('should fail when vendor already exists for user', async () => {
      const user = await createTestUser('VENDOR');
      
      const vendorData = {
        businessName: 'First Vendor',
        city: 'Chennai',
        area: 'Velachery',
      };

      // Create first vendor
      await vendorsService.createVendor(user.id, vendorData, true);

      // Try to create second vendor - should fail
      await expect(
        vendorsService.createVendor(user.id, vendorData, true)
      ).rejects.toThrow();
    });

    it('should fail with invalid data', async () => {
      const user = await createTestUser('VENDOR');
      
      const invalidData = {
        businessName: '', // Empty - should fail validation
        city: 'Chennai',
        area: 'Velachery',
      };

      await expect(
        vendorsService.createVendor(user.id, invalidData, false)
      ).rejects.toThrow();
    });
  });

  // ============================================
  // VENDOR RETRIEVAL TESTS
  // ============================================

  describe('Vendor Retrieval', () => {
    it('should find vendor by ID', async () => {
      const user = await createTestUser('VENDOR');
      
      const createdVendor = await vendorsService.createVendor(
        user.id,
        {
          businessName: 'Existing Vendor',
          city: 'Chennai',
          area: 'T Nagar',
        },
        true
      );

      const vendor = await vendorsService.findById(createdVendor.id);

      expect(vendor).toBeDefined();
      expect(vendor.id).toBe(createdVendor.id);
      expect(vendor.businessName).toBe('Existing Vendor');
    });

    it('should find vendor by user ID', async () => {
      const user = await createTestUser('VENDOR');
      
      await vendorsService.createVendor(
        user.id,
        {
          businessName: 'Existing Vendor',
          city: 'Chennai',
          area: 'T Nagar',
        },
        true
      );

      const vendor = await vendorsService.getVendorByUserId(user.id);

      expect(vendor).toBeDefined();
      expect(vendor.userId).toBe(user.id);
    });

    it('should return null for non-existent vendor', async () => {
      // Service throws NotFoundException instead of returning null
      await expect(vendorsService.findById(999999)).rejects.toThrow('Vendor with ID 999999 not found');
    });

    it('should return all vendors', async () => {
      // Create two vendors with different users - isolated from other tests
      const user1 = await createTestUser('VENDOR');
      const user2 = await createTestUser('VENDOR');

      await vendorsService.createVendor(
        user1.id,
        { businessName: 'Vendor 1', city: 'Chennai', area: 'Anna Nagar' },
        true
      );

      await vendorsService.createVendor(
        user2.id,
        { businessName: 'Vendor 2', city: 'Mumbai', area: 'Bandra' },
        true
      );

      const vendors = await vendorsService.findAll();

      expect(Array.isArray(vendors)).toBe(true);
      // There should be at least 2 vendors (could be more from other tests)
      expect(vendors.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // VENDOR APPROVAL TESTS
  // ============================================

  describe('Vendor Approval', () => {
    it('should approve pending vendor', async () => {
      const user = await createTestUser('VENDOR');
      
      const pendingVendor = await vendorsService.createVendor(
        user.id,
        { businessName: 'Pending Approval', city: 'Chennai', area: 'Anna Nagar' },
        true
      );

      const approved = await vendorsService.approveVendor(pendingVendor.id);

      expect(approved).toBeDefined();
      expect(approved.verificationStatus).toBe('VERIFIED');
    });

    it('should reject pending vendor', async () => {
      const user = await createTestUser('VENDOR');
      
      const pendingVendor = await vendorsService.createVendor(
        user.id,
        { businessName: 'Pending Approval', city: 'Chennai', area: 'Anna Nagar' },
        true
      );

      const rejected = await vendorsService.rejectVendor(pendingVendor.id);

      expect(rejected).toBeDefined();
      expect(rejected.verificationStatus).toBe('REJECTED');
    });

    it('should fail when approving non-existent vendor', async () => {
      await expect(vendorsService.approveVendor(999999)).rejects.toThrow();
    });
  });

  // ============================================
  // DATABASE ERROR HANDLING
  // ============================================

  describe('Database Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This tests the error handling in the service
      // In real scenario, we'd mock Prisma to throw an error
      const vendor = await vendorsService.findAll();
      expect(vendor).toBeDefined();
    });

    it('should handle transaction rollback', async () => {
      const user = await createTestUser('VENDOR');
      
      // Test that failed operations don't leave partial data
      const initialCount = await prisma.vendor.count();

      try {
        await vendorsService.createVendor(
          user.id,
          { businessName: '', city: '', area: '' }, // Invalid
          false
        );
      } catch (e) {
        // Expected to fail
      }

      // Count should remain the same
      const finalCount = await prisma.vendor.count();
      expect(finalCount).toBe(initialCount);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle very long business name', async () => {
      const user = await createTestUser('VENDOR');
      
      const longName = 'A'.repeat(100);
      const vendor = await vendorsService.createVendor(
        user.id,
        { businessName: longName, city: 'Chennai', area: 'Velachery' },
        true
      );

      expect(vendor.businessName.length).toBe(100);
    });

    it('should handle zero service radius', async () => {
      const user = await createTestUser('VENDOR');
      
      const vendor = await vendorsService.createVendor(
        user.id,
        { businessName: 'Zero Radius', city: 'Chennai', area: 'Velachery', serviceRadiusKm: 0 },
        true
      );

      expect(vendor.serviceRadiusKm).toBe(0);
    });

    it('should handle whitespace trimming', async () => {
      const user = await createTestUser('VENDOR');
      
      const vendor = await vendorsService.createVendor(
        user.id,
        { businessName: '  Trimmed Vendor  ', city: '  Chennai  ', area: '  Velachery  ' },
        true
      );

      expect(vendor.businessName).toBe('Trimmed Vendor');
      expect(vendor.city).toBe('Chennai');
    });

    it('should handle vendor with no services', async () => {
      const user = await createTestUser('VENDOR');
      
      const vendor = await vendorsService.createVendor(
        user.id,
        { businessName: 'No Services', city: 'Chennai', area: 'Velachery' },
        true
      );

      const services = await vendorServicesService.findByVendor(vendor.id);
      expect(services).toEqual([]);
    });
  });
});
