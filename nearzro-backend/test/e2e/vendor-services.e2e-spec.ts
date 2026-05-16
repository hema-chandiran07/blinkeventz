/**
 * Vendor Services E2E Test Suite
 * 
 * End-to-end tests for vendor services API endpoints.
 * Tests service creation, activation, deactivation, and listing.
 * 
 * Test Categories:
 * - Positive: Service CRUD operations
 * - Negative: Validation, authorization
 * - Security: Multi-tenant isolation
 * - Role-based: Admin vs Vendor permissions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

const TEST_TIMEOUT = 30000;

describe('VendorServices E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let vendorToken: string;
  let customerToken: string;

  let vendorUser: any;
  let vendor: any;
  let adminUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Clean database
    await prisma.vendorService.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    adminUser = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@test.com',
        passwordHash: '$2b$10$test',
        role: 'ADMIN',
        isEmailVerified: true,
        isActive: true,
      },
    });

    vendorUser = await prisma.user.create({
      data: {
        name: 'Vendor User',
        email: 'vendor@test.com',
        passwordHash: '$2b$10$test',
        role: 'VENDOR',
        isEmailVerified: true,
        isActive: true,
      },
    });

    const customerUser = await prisma.user.create({
      data: {
        name: 'Customer',
        email: 'customer@test.com',
        passwordHash: '$2b$10$test',
        role: 'CUSTOMER',
        isEmailVerified: true,
        isActive: true,
      },
    });

    // Create vendor profile
    vendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        businessName: 'Test Business',
        city: 'Chennai',
        area: 'Velachery',
        verificationStatus: 'VERIFIED',
        serviceRadiusKm: 10,
      },
    });

    // Generate tokens
    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: 'ADMIN' });
    vendorToken = jwtService.sign({ sub: vendorUser.id, email: vendorUser.email, role: 'VENDOR' });
    customerToken = jwtService.sign({ sub: customerUser.id, email: customerUser.email, role: 'CUSTOMER' });
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
  // POSITIVE TEST CASES
  // ============================================

  describe('POSITIVE: Service Creation', () => {
    it('should create a vendor service', async () => {
      const createServiceDto = {
        name: 'Catering Service',
        serviceType: 'CATERING',
        description: 'Professional catering',
        baseRate: 10000,
        pricingModel: 'PER_EVENT',
        minGuests: 20,
        maxGuests: 200,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.serviceName).toBe('Catering Service');
      expect(response.body.baseRate).toBe(10000);
      expect(response.body.isActive).toBe(false); // Default inactive
    });

    it('should create service with minimum required fields', async () => {
      const createServiceDto = {
        name: 'Minimal Service',
        serviceType: 'DECOR_RENTALS',
        baseRate: 5000,
        pricingModel: 'PER_EVENT',
        minGuests: 10,
        maxGuests: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.serviceName).toBe('Minimal Service');
    });
  });

  describe('POSITIVE: Service Activation', () => {
    let service: any;

    beforeEach(async () => {
      service = await prisma.vendorService.create({
        data: {
          vendorId: vendor.id,
          name: 'Inactive Service',
          serviceType: 'CATERING',
          baseRate: 5000,
          pricingModel: 'PER_EVENT',
          minGuests: 10,
          maxGuests: 50,
          isActive: false,
        },
      });
    });

    it('should activate own service as vendor', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/vendor-services/${service.id}/activate`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });

    it('should deactivate own service as vendor', async () => {
      await request(app.getHttpServer())
        .patch(`/vendor-services/${service.id}/activate`)
        .set('Authorization', `Bearer ${vendorToken}`);

      const response = await request(app.getHttpServer())
        .patch(`/vendor-services/${service.id}/deactivate`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should allow admin to activate any service', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/vendor-services/${service.id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  describe('POSITIVE: Service Listing', () => {
    beforeEach(async () => {
      // Create multiple services
      await prisma.vendorService.createMany({
        data: [
          {
            vendorId: vendor.id,
            name: 'Service 1',
            serviceType: 'CATERING',
            baseRate: 5000,
            pricingModel: 'PER_EVENT',
            minGuests: 10,
            maxGuests: 50,
            isActive: true,
          },
          {
            vendorId: vendor.id,
            name: 'Service 2',
            serviceType: 'DECOR_RENTALS',
            baseRate: 3000,
            pricingModel: 'PER_EVENT',
            minGuests: 10,
            maxGuests: 50,
            isActive: true,
          },
        ],
      });
    });

    it('should get services for vendor', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vendor-services/vendor/${vendor.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter active services only', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vendor-services/vendor/${vendor.id}?active=true`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================
  // NEGATIVE TEST CASES
  // ============================================

  describe('NEGATIVE: Validation Errors', () => {
    it('should reject missing serviceName', async () => {
      const createServiceDto = {
        serviceType: 'CATERING',
        baseRate: 5000,
        pricingModel: 'PER_EVENT',
        minGuests: 10,
        maxGuests: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(400);

      expect(response.body.message).toContain('serviceName');
    });

    it('should reject missing baseRate', async () => {
      const createServiceDto = {
        name: 'Test Service',
        serviceType: 'CATERING',
        pricingModel: 'PER_EVENT',
        minGuests: 10,
        maxGuests: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(400);

      expect(response.body.message).toContain('baseRate');
    });

    it('should reject negative baseRate', async () => {
      const createServiceDto = {
        name: 'Test Service',
        serviceType: 'CATERING',
        baseRate: -1000,
        pricingModel: 'PER_EVENT',
        minGuests: 10,
        maxGuests: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(400);

      expect(response.body.message).toContain('baseRate');
    });

    it('should reject minGuests > maxGuests', async () => {
      const createServiceDto = {
        name: 'Test Service',
        serviceType: 'CATERING',
        baseRate: 5000,
        pricingModel: 'PER_EVENT',
        minGuests: 100,
        maxGuests: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(400);

      expect(response.body.message).toContain('minGuests');
    });

    it('should reject invalid serviceType', async () => {
      const createServiceDto = {
        name: 'Test Service',
        serviceType: 'INVALID_TYPE',
        baseRate: 5000,
        pricingModel: 'PER_EVENT',
        minGuests: 10,
        maxGuests: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(400);

      expect(response.body.message).toContain('serviceType');
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('SECURITY: Multi-tenant Isolation', () => {
    let otherVendorUser: any;
    let otherVendor: any;
    let otherService: any;

    beforeEach(async () => {
      // Create another vendor
      otherVendorUser = await prisma.user.create({
        data: {
          name: 'Other Vendor',
          email: 'other@test.com',
          passwordHash: '$2b$10$test',
          role: 'VENDOR',
          isEmailVerified: true,
          isActive: true,
        },
      });

      otherVendor = await prisma.vendor.create({
        data: {
          userId: otherVendorUser.id,
          businessName: 'Other Business',
          city: 'Bangalore',
          area: 'Whitefield',
          verificationStatus: 'VERIFIED',
          serviceRadiusKm: 10,
        },
      });

      otherService = await prisma.vendorService.create({
        data: {
          vendorId: otherVendor.id,
          name: 'Other Service',
          serviceType: 'CATERING',
          baseRate: 8000,
          pricingModel: 'PER_EVENT',
          minGuests: 10,
          maxGuests: 50,
          isActive: false,
        },
      });
    });

    it('should prevent activating other vendor service', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/vendor-services/${otherService.id}/activate`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403);

      expect(response.body.message).toContain('forbidden');
    });

    it('should prevent deactivating other vendor service', async () => {
      // First activate it as admin
      await request(app.getHttpServer())
        .patch(`/vendor-services/${otherService.id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Try to deactivate as other vendor
      const response = await request(app.getHttpServer())
        .patch(`/vendor-services/${otherService.id}/deactivate`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403);

      expect(response.body.message).toContain('forbidden');
    });

    it('should prevent accessing other vendor services list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vendor-services/vendor/${otherVendor.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403);
    });
  });

  // ============================================
  // AUTHORIZATION TESTS
  // ============================================

  describe('AUTHORIZATION: Role-based Access', () => {
    let service: any;

    beforeEach(async () => {
      service = await prisma.vendorService.create({
        data: {
          vendorId: vendor.id,
          name: 'Test Service',
          serviceType: 'CATERING',
          baseRate: 5000,
          pricingModel: 'PER_EVENT',
          minGuests: 10,
          maxGuests: 50,
          isActive: false,
        },
      });
    });

    it('should allow vendor to create service', async () => {
      const createServiceDto = {
        name: 'New Service',
        serviceType: 'DECOR_RENTALS',
        baseRate: 3000,
        pricingModel: 'PER_EVENT',
        minGuests: 10,
        maxGuests: 50,
      };

      await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(201);
    });

    it('should deny customer to create service', async () => {
      const createServiceDto = {
        name: 'New Service',
        serviceType: 'DECOR_RENTALS',
        baseRate: 3000,
        pricingModel: 'PER_EVENT',
        minGuests: 10,
        maxGuests: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createServiceDto)
        .expect(403);

      expect(response.body.message).toContain('forbidden');
    });

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .get(`/vendor-services/vendor/${vendor.id}`)
        .expect(401);
    });
  });

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe('EDGE CASE: Extreme Values', () => {
    it('should handle very large baseRate', async () => {
      const createServiceDto = {
        name: 'Expensive Service',
        serviceType: 'CATERING',
        baseRate: 10000000,
        pricingModel: 'PER_EVENT',
        minGuests: 10,
        maxGuests: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(201);

      expect(response.body.baseRate).toBe(10000000);
    });

    it('should handle zero baseRate', async () => {
      const createServiceDto = {
        name: 'Free Service',
        serviceType: 'CATERING',
        baseRate: 0,
        pricingModel: 'PER_EVENT',
        minGuests: 10,
        maxGuests: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(201);

      expect(response.body.baseRate).toBe(0);
    });

    it('should handle zero minGuests and maxGuests', async () => {
      const createServiceDto = {
        name: 'Any Size Service',
        serviceType: 'CATERING',
        baseRate: 5000,
        pricingModel: 'PER_EVENT',
        minGuests: 0,
        maxGuests: 0,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(201);

      expect(response.body.minGuests).toBe(0);
    });

    it('should handle very long description', async () => {
      const longDescription = 'A'.repeat(2000);

      const createServiceDto = {
        name: 'Long Description Service',
        serviceType: 'CATERING',
        description: longDescription,
        baseRate: 5000,
        pricingModel: 'PER_EVENT',
        minGuests: 10,
        maxGuests: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/vendor-services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createServiceDto)
        .expect(201);

      expect(response.body.description.length).toBe(2000);
    });
  });

  // ============================================
  // NOT FOUND TESTS
  // ============================================

  describe('NOT FOUND: Invalid IDs', () => {
    it('should return 404 for non-existent service', async () => {
      const response = await request(app.getHttpServer())
        .patch('/vendor-services/999999/activate')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should return 404 for non-existent vendor services', async () => {
      const response = await request(app.getHttpServer())
        .get('/vendor-services/vendor/999999')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(404);
    });
  });
});
