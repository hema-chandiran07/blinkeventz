/**
 * Vendor Services Integration Test Suite
 * 
 * Integration tests for vendor services with real Prisma database.
 * Tests service creation, activation, and business logic.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { VendorServicesModule } from '../../src/vendors/vendor-services/vendor-services.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { VendorServicesService } from '../../src/vendors/vendor-services/vendor-services.service';
import { VendorsService } from '../../src/vendors/vendors.service';
import { ServiceType, VendorPricingModel } from '@prisma/client';
import { CreateVendorServiceDto } from '../../src/vendors/vendor-services/dto/create-vendor-service.dto';

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

function createInvalidServiceDto(): Partial<CreateVendorServiceDto> {
  return {
    name: '',
    serviceType: 'INVALID_TYPE' as any,
    baseRate: -100,
    pricingModel: 'INVALID' as any,
    minGuests: 100,
    maxGuests: 50, // Invalid: greater than min
  };
}

describe('VendorServices Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let vendorServicesService: VendorServicesService;
  let vendorsService: VendorsService;

  let testVendorUser: any;
  let testVendor: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [VendorServicesModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    vendorServicesService = app.get<VendorServicesService>(VendorServicesService);
    vendorsService = app.get<VendorsService>(VendorsService);

    // Create test vendor user and vendor
    testVendorUser = await prisma.user.create({
      data: {
        name: 'Service Test Vendor',
        email: 'service-integration-test@test.com',
        passwordHash: '$2b$10$test',
        role: 'VENDOR',
        isEmailVerified: true,
        isActive: true,
      },
    });

    testVendor = await vendorsService.createVendor(
      testVendorUser.id,
      {
        businessName: 'Service Test Business',
        city: 'Chennai',
        area: 'Velachery',
      },
      true
    );
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await prisma.vendorService.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.vendorService.deleteMany();
  });

  // ============================================
  // CREATE TESTS
  // ============================================

  describe('create()', () => {
    it('should create a vendor service with valid data', async () => {
      const dto = createServiceDto();
      const service = await vendorServicesService.create(testVendor.id, dto);

      expect(service).toBeDefined();
      expect(service.name).toBe(dto.name);
      expect(service.baseRate).toBe(dto.baseRate);
      expect(service.isActive).toBe(false);
    });

    it('should create service with minimal required fields', async () => {
      const dto = createMinimalServiceDto();
      const service = await vendorServicesService.create(testVendor.id, dto);

      expect(service).toBeDefined();
      expect(service.isActive).toBe(false);
    });

    it('should create service with per-event pricing', async () => {
      const dto = createServiceDto({
        pricingModel: VendorPricingModel.PER_EVENT,
        baseRate: 15000,
      });
      const service = await vendorServicesService.create(testVendor.id, dto);

      expect(service.pricingModel).toBe(VendorPricingModel.PER_EVENT);
      expect(service.baseRate).toBe(15000);
    });

    it('should create service with per-day pricing', async () => {
      const dto = createServiceDto({
        pricingModel: VendorPricingModel.PER_DAY,
        baseRate: 25000,
      });
      const service = await vendorServicesService.create(testVendor.id, dto);

      expect(service.pricingModel).toBe(VendorPricingModel.PER_DAY);
    });
  });

  // ============================================
  // FIND BY VENDOR TESTS
  // ============================================

  describe('findByVendor()', () => {
    beforeEach(async () => {
      // Create multiple services
      await vendorServicesService.create(testVendor.id, createServiceDto({ name: 'Service One' }));
      await vendorServicesService.create(testVendor.id, createServiceDto({ name: 'Service Two' }));
    });

    it('should get all services for vendor', async () => {
      const services = await vendorServicesService.findByVendor(testVendor.id);

      expect(services.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no services exist', async () => {
      await prisma.vendorService.deleteMany();
      
      const services = await vendorServicesService.findByVendor(testVendor.id);
      
      expect(services).toEqual([]);
    });
  });

  // ============================================
  // ACTIVATE TESTS
  // ============================================

  describe('activate()', () => {
    let inactiveService: any;

    beforeEach(async () => {
      inactiveService = await vendorServicesService.create(
        testVendor.id,
        createServiceDto({ name: 'Service To Activate' })
      );
    });

    it('should activate a service', async () => {
      const activated = await vendorServicesService.activate(inactiveService.id);

      expect(activated.isActive).toBe(true);
    });

    it('should allow admin to activate any service', async () => {
      const activated = await vendorServicesService.activate(inactiveService.id);

      expect(activated.isActive).toBe(true);
    });

    it('should throw when service not found', async () => {
      await expect(vendorServicesService.activate(999999)).rejects.toThrow();
    });
  });

  // ============================================
  // DEACTIVATE TESTS
  // ============================================

  describe('deactivate()', () => {
    let activeService: any;

    beforeEach(async () => {
      activeService = await vendorServicesService.create(
        testVendor.id,
        createServiceDto({ name: 'Service To Deactivate' })
      );
      await vendorServicesService.activate(activeService.id);
    });

    it('should deactivate a service', async () => {
      const deactivated = await vendorServicesService.deactivate(activeService.id);

      expect(deactivated.isActive).toBe(false);
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
      const dto = createServiceDto({ baseRate: 10000000 });
      const service = await vendorServicesService.create(testVendor.id, dto);

      expect(service.baseRate).toBe(10000000);
    });

    it('should handle zero baseRate', async () => {
      const dto = createServiceDto({ baseRate: 0 });
      const service = await vendorServicesService.create(testVendor.id, dto);

      expect(service.baseRate).toBe(0);
    });

    it('should handle zero guest counts', async () => {
      const dto = createServiceDto({ minGuests: 0, maxGuests: 0 });
      const service = await vendorServicesService.create(testVendor.id, dto);

      expect(service.minGuests).toBe(0);
      expect(service.maxGuests).toBe(0);
    });

    it('should handle large guest capacity', async () => {
      const dto = createServiceDto({ minGuests: 100, maxGuests: 10000 });
      const service = await vendorServicesService.create(testVendor.id, dto);

      expect(service.minGuests).toBe(100);
      expect(service.maxGuests).toBe(10000);
    });

    it('should handle long description', async () => {
      const longDescription = 'A'.repeat(2000);
      const dto = createServiceDto({ description: longDescription });
      const service = await vendorServicesService.create(testVendor.id, dto);

      expect(service.description?.length).toBe(2000);
    });

    it('should handle multiple services for same vendor', async () => {
      const count = 5;
      for (let i = 0; i < count; i++) {
        await vendorServicesService.create(
          testVendor.id,
          createServiceDto({ name: `Service ${i + 1}`, baseRate: 1000 * (i + 1) })
        );
      }

      const services = await vendorServicesService.findByVendor(testVendor.id);
      expect(services.length).toBeGreaterThanOrEqual(count);
    });

    it('should toggle service status correctly', async () => {
      const service = await vendorServicesService.create(
        testVendor.id,
        createServiceDto({ name: 'Toggle Test Service' })
      );

      // Activate
      await vendorServicesService.activate(service.id);
      let result = await vendorServicesService.findByVendor(testVendor.id);
      expect(result.find(s => s.id === service.id)?.isActive).toBe(true);

      // Deactivate
      await vendorServicesService.deactivate(service.id);
      result = await vendorServicesService.findByVendor(testVendor.id);
      expect(result.find(s => s.id === service.id)?.isActive).toBe(false);
    });
  });
});
