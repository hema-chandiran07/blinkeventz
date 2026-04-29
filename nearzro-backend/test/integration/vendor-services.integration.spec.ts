/**
 * Vendor Services Integration Test Suite
 * 
 * Integration tests for vendor services with real Prisma database.
 * Tests service creation, activation, and business logic.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { VendorServicesService } from '../../src/vendors/vendor-services/vendor-services.service';
import { ServiceType, VendorPricingModel } from '@prisma/client';
import { CreateVendorServiceDto } from '../../src/vendors/vendor-services/dto/create-vendor-service.dto';
import * as dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });
dotenv.config();

const TEST_TIMEOUT = 30000;

// ============================================
// TEST DATA FACTORY
// ============================================

function createServiceDto(overrides?: Partial<CreateVendorServiceDto>): CreateVendorServiceDto {
  return {
    name: 'Test Photography Service',
    serviceType: ServiceType.PHOTOGRAPHY,
    description: 'Professional photography service',
    baseRate: 5000,
    pricingModel: VendorPricingModel.PER_EVENT,
    minGuests: 10,
    maxGuests: 500,
    ...overrides,
  };
}

function createMinimalServiceDto(overrides?: Partial<CreateVendorServiceDto>): CreateVendorServiceDto {
  return {
    name: 'Minimal Service',
    serviceType: ServiceType.PHOTOGRAPHY,
    baseRate: 3000,
    pricingModel: VendorPricingModel.PER_PERSON,
    minGuests: 20,
    maxGuests: 100,
    ...overrides,
  };
}

describe('VendorServices Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let vendorServicesService: VendorServicesService;

  beforeAll(async () => {
    // Use full AppModule for proper DI
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    
    // Connect to database
    prisma = app.get<PrismaService>(PrismaService);
    await prisma.$connect();
    
    await app.init();

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
    // Clean vendor services first, then vendors, then users
    // This ensures proper cleanup order for foreign key constraints
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

  // Each test creates its own user and vendor for complete isolation
  async function createTestUserWithVendor() {
    // Create unique user
    const timestamp = Date.now() + Math.random();
    const user = await prisma.user.create({
      data: {
        email: `vendor_${timestamp}@test.com`,
        passwordHash: "test_hash",
        name: "Test Vendor",
        role: "VENDOR",
        isEmailVerified: true,
        isActive: true,
      }
    });
    
    // Create vendor for this user
    const vendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        businessName: "Test Vendor Business",
        city: "Chennai",
        area: "Adyar",
        serviceRadiusKm: 10
      }
    });
    
    return { user, vendor };
  }

  // ============================================
  // CREATE TESTS
  // ============================================

  describe('create()', () => {
    it('should create a vendor service with valid data', async () => {
      const { user, vendor } = await createTestUserWithVendor();
      
      const dto = createServiceDto();
      // The service create method expects userId to look up the vendor
      const service = await vendorServicesService.create(user.id, dto);

      expect(service).toBeDefined();
      expect(service.name).toBe(dto.name);
      expect(service.baseRate).toBe(dto.baseRate);
      expect(service.isActive).toBe(false);
      expect(service.vendorId).toBe(vendor.id);
    });

    it('should create service with minimal required fields', async () => {
      const { user } = await createTestUserWithVendor();
      
      const dto = createMinimalServiceDto();
      const service = await vendorServicesService.create(user.id, dto);

      expect(service).toBeDefined();
      expect(service.isActive).toBe(false);
    });

    it('should create service with per-event pricing', async () => {
      const { user } = await createTestUserWithVendor();
      
      const dto = createServiceDto({
        pricingModel: VendorPricingModel.PER_EVENT,
        baseRate: 15000,
      });
      const service = await vendorServicesService.create(user.id, dto);

      expect(service.pricingModel).toBe(VendorPricingModel.PER_EVENT);
      expect(service.baseRate).toBe(15000);
    });

    it('should create service with per-day pricing', async () => {
      const { user } = await createTestUserWithVendor();
      
      const dto = createServiceDto({
        pricingModel: VendorPricingModel.PER_DAY,
        baseRate: 25000,
      });
      const service = await vendorServicesService.create(user.id, dto);

      expect(service.pricingModel).toBe(VendorPricingModel.PER_DAY);
    });

    it('should fail when vendor profile does not exist', async () => {
      // Create user but no vendor
      const timestamp = Date.now() + Math.random();
      const user = await prisma.user.create({
        data: {
          email: `vendor_notexist_${timestamp}@test.com`,
          passwordHash: "test_hash",
          name: "Test Vendor",
          role: "VENDOR",
          isEmailVerified: true,
          isActive: true,
        }
      });
      
      const dto = createServiceDto();
      
      await expect(
        vendorServicesService.create(user.id, dto)
      ).rejects.toThrow('Vendor profile not found');
    });
  });

  // ============================================
  // FIND BY VENDOR TESTS
  // ============================================

  describe('findByVendor()', () => {
    it('should get all services for vendor', async () => {
      const { user, vendor } = await createTestUserWithVendor();
      
      // Create multiple services
      await vendorServicesService.create(user.id, createServiceDto({ name: 'Service One' }));
      await vendorServicesService.create(user.id, createServiceDto({ name: 'Service Two' }));

      const services = await vendorServicesService.findByVendor(vendor.id);

      expect(services.length).toBe(2);
    });

    it('should return empty array when no services exist', async () => {
      const { vendor } = await createTestUserWithVendor();
      
      const services = await vendorServicesService.findByVendor(vendor.id);
      
      expect(services).toEqual([]);
    });
  });

  // ============================================
  // ACTIVATE TESTS
  // ============================================

  describe('activate()', () => {
    it('should activate a service', async () => {
      const { user } = await createTestUserWithVendor();
      
      const service = await vendorServicesService.create(
        user.id,
        createServiceDto({ name: 'Service To Activate' })
      );

      const activated = await vendorServicesService.activate(service.id);

      expect(activated.isActive).toBe(true);
    });

    it('should allow admin to activate any service', async () => {
      const { user } = await createTestUserWithVendor();
      
      const service = await vendorServicesService.create(
        user.id,
        createServiceDto({ name: 'Service To Activate' })
      );

       const activated = await vendorServicesService.activate(service.id, undefined, true);

<<<<<<< Updated upstream
      expect(activated.isActive).toBe(true);
    });
=======
       expect(activated.isActive).toBe(true);
     });
>>>>>>> Stashed changes

    it('should throw when service not found', async () => {
      await expect(vendorServicesService.activate(999999)).rejects.toThrow();
    });
  });

  // ============================================
  // DEACTIVATE TESTS
  // ============================================

  describe('deactivate()', () => {
    it('should deactivate a service', async () => {
      const { user } = await createTestUserWithVendor();
      
      const service = await vendorServicesService.create(
        user.id,
        createServiceDto({ name: 'Service To Deactivate' })
      );
      await vendorServicesService.activate(service.id);

      const deactivated = await vendorServicesService.deactivate(service.id);

<<<<<<< Updated upstream
      expect(deactivated.isActive).toBe(false);
=======
       expect(deactivated.isActive).toBe(false);
>>>>>>> Stashed changes
    });

    it('should throw when service not found', async () => {
      await expect(vendorServicesService.deactivate(999999)).rejects.toThrow();
    });
  });

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe('Edge Cases', () => {
    it('should handle very large baseRate', async () => {
      const { user } = await createTestUserWithVendor();
      
      const dto = createServiceDto({ baseRate: 10000000 });
      const service = await vendorServicesService.create(user.id, dto);

      expect(service.baseRate).toBe(10000000);
    });

    it('should handle zero baseRate', async () => {
      const { user } = await createTestUserWithVendor();
      
      const dto = createServiceDto({ baseRate: 0 });
      const service = await vendorServicesService.create(user.id, dto);

      expect(service.baseRate).toBe(0);
    });

    it('should handle zero guest counts', async () => {
      const { user } = await createTestUserWithVendor();
      
      const dto = createServiceDto({ minGuests: 0, maxGuests: 0 });
      const service = await vendorServicesService.create(user.id, dto);

      expect(service.minGuests).toBe(0);
      expect(service.maxGuests).toBe(0);
    });

    it('should handle large guest capacity', async () => {
      const { user } = await createTestUserWithVendor();
      
      const dto = createServiceDto({ minGuests: 100, maxGuests: 10000 });
      const service = await vendorServicesService.create(user.id, dto);

      expect(service.minGuests).toBe(100);
      expect(service.maxGuests).toBe(10000);
    });

    it('should handle long description', async () => {
      const { user } = await createTestUserWithVendor();
      
      const longDescription = 'A'.repeat(2000);
      const dto = createServiceDto({ description: longDescription });
      const service = await vendorServicesService.create(user.id, dto);

      expect(service.description?.length).toBe(2000);
    });

    it('should handle multiple services for same vendor', async () => {
      const { user, vendor } = await createTestUserWithVendor();
      
      const count = 5;
      for (let i = 0; i < count; i++) {
        await vendorServicesService.create(
          user.id,
          createServiceDto({ name: `Service ${i + 1}`, baseRate: 1000 * (i + 1) })
        );
      }

      const services = await vendorServicesService.findByVendor(vendor.id);
      expect(services.length).toBe(count);
    });

    it('should toggle service status correctly', async () => {
      const { user, vendor } = await createTestUserWithVendor();
      
      const service = await vendorServicesService.create(
        user.id,
        createServiceDto({ name: 'Toggle Test Service' })
      );

      // Activate
      await vendorServicesService.activate(service.id);
      let result = await vendorServicesService.findByVendor(vendor.id);
<<<<<<< Updated upstream
      expect(result.find(s => s.id === service.id)?.isActive).toBe(true);
=======
       expect(result.find(s => s.id === service.id)?.isActive).toBe(true);
>>>>>>> Stashed changes

      // Deactivate
      await vendorServicesService.deactivate(service.id);
      result = await vendorServicesService.findByVendor(vendor.id);
<<<<<<< Updated upstream
      expect(result.find(s => s.id === service.id)?.isActive).toBe(false);
=======
       expect(result.find(s => s.id === service.id)?.isActive).toBe(false);
>>>>>>> Stashed changes
    });
  });
});
