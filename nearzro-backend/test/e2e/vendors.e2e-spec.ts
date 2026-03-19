/**
 * Vendors E2E Test Suite
 * 
 * End-to-end tests for vendor API endpoints using Supertest.
 * Tests real HTTP requests against the running application.
 * 
 * Test Categories:
 * - Positive: Successful vendor creation, retrieval, approval
 * - Negative: Validation errors, duplicate vendors, missing fields
 * - Security: Multi-tenant isolation, authorization
 * - Role-based: Admin vs Vendor vs Customer permissions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

// Test configuration
const TEST_TIMEOUT = 30000;

describe('Vendors E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let vendorToken: string;
  let customerToken: string;

  // Test data
  let testVendorUser: any;
  let testVendor: any;
  let adminUser: any;

  beforeAll(async () => {
    // Create testing module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Enable validation pipe for all endpoints
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

    // Clean database before tests
    await prisma.vendorService.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.user.deleteMany();

    // Seed test data
    adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@test.com',
        passwordHash: '$2b$10$test',
        role: 'ADMIN',
        isEmailVerified: true,
        isActive: true,
      },
    });

    const vendorUser = await prisma.user.create({
      data: {
        name: 'Test Vendor',
        email: 'vendor@test.com',
        passwordHash: '$2b$10$test',
        role: 'VENDOR',
        isEmailVerified: true,
        isActive: true,
      },
    });

    const customerUser = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        passwordHash: '$2b$10$test',
        role: 'CUSTOMER',
        isEmailVerified: true,
        isActive: true,
      },
    });

    testVendorUser = vendorUser;

    // Generate tokens
    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email, role: 'ADMIN' });
    vendorToken = jwtService.sign({ sub: vendorUser.id, email: vendorUser.email, role: 'VENDOR' });
    customerToken = jwtService.sign({ sub: customerUser.id, email: customerUser.email, role: 'CUSTOMER' });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Clean up
    await prisma.vendorService.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    // Clean vendor tables before each test
    await prisma.vendorService.deleteMany();
    await prisma.vendor.deleteMany();
  });

  // ============================================
  // POSITIVE TEST CASES
  // ============================================

  describe('POSITIVE: Vendor Creation', () => {
    it('should create vendor successfully', async () => {
      const createVendorDto = {
        businessName: 'New Test Vendor',
        city: 'Chennai',
        area: 'Velachery',
        serviceRadiusKm: 15,
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.businessName).toBe(createVendorDto.businessName);
      expect(response.body.city).toBe(createVendorDto.city);
      expect(response.body.verificationStatus).toBe('PENDING');
    });

    it('should create vendor with minimal required fields', async () => {
      const createVendorDto = {
        businessName: 'Minimal Vendor',
        city: 'Bangalore',
        area: 'MG Road',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.businessName).toBe('Minimal Vendor');
    });
  });

  describe('POSITIVE: Vendor Retrieval', () => {
    beforeEach(async () => {
      // Create test vendor
      testVendor = await prisma.vendor.create({
        data: {
          userId: testVendorUser.id,
          businessName: 'Existing Vendor',
          city: 'Chennai',
          area: 'T Nagar',
          verificationStatus: 'PENDING',
          serviceRadiusKm: 10,
        },
      });
    });

    it('should get vendor by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vendors/${testVendor.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(response.body.id).toBe(testVendor.id);
      expect(response.body.businessName).toBe('Existing Vendor');
    });

    it('should get all vendors', async () => {
      const response = await request(app.getHttpServer())
        .get('/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POSITIVE: Vendor Approval', () => {
    beforeEach(async () => {
      testVendor = await prisma.vendor.create({
        data: {
          userId: testVendorUser.id,
          businessName: 'Pending Vendor',
          city: 'Chennai',
          area: 'Anna Nagar',
          verificationStatus: 'PENDING',
          serviceRadiusKm: 10,
        },
      });
    });

    it('should approve vendor as admin', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/vendors/${testVendor.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.verificationStatus).toBe('VERIFIED');
    });

    it('should reject vendor as admin', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/vendors/${testVendor.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.verificationStatus).toBe('REJECTED');
    });
  });

  // ============================================
  // NEGATIVE TEST CASES
  // ============================================

  describe('NEGATIVE: Validation Errors', () => {
    it('should reject missing businessName', async () => {
      const createVendorDto = {
        city: 'Chennai',
        area: 'Velachery',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(400);

      expect(response.body.message).toContain('businessName');
    });

    it('should reject missing city', async () => {
      const createVendorDto = {
        businessName: 'Test Vendor',
        area: 'Velachery',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(400);

      expect(response.body.message).toContain('city');
    });

    it('should reject missing area', async () => {
      const createVendorDto = {
        businessName: 'Test Vendor',
        city: 'Chennai',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(400);

      expect(response.body.message).toContain('area');
    });

    it('should reject empty businessName', async () => {
      const createVendorDto = {
        businessName: '',
        city: 'Chennai',
        area: 'Velachery',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(400);

      expect(response.body.message).toContain('businessName');
    });

    it('should reject empty city', async () => {
      const createVendorDto = {
        businessName: 'Test Vendor',
        city: '',
        area: 'Velachery',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(400);

      expect(response.body.message).toContain('city');
    });

    it('should reject negative serviceRadiusKm', async () => {
      const createVendorDto = {
        businessName: 'Test Vendor',
        city: 'Chennai',
        area: 'Velachery',
        serviceRadiusKm: -10,
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(400);

      expect(response.body.message).toContain('serviceRadiusKm');
    });
  });

  describe('NEGATIVE: Duplicate Vendor', () => {
    beforeEach(async () => {
      // Create first vendor
      await prisma.vendor.create({
        data: {
          userId: testVendorUser.id,
          businessName: 'Duplicate Test Vendor',
          city: 'Chennai',
          area: 'Velachery',
          verificationStatus: 'PENDING',
          serviceRadiusKm: 10,
        },
      });
    });

    it('should reject duplicate vendor for same user', async () => {
      const createVendorDto = {
        businessName: 'Duplicate Test Vendor',
        city: 'Chennai',
        area: 'Velachery',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('SECURITY: Multi-tenant Isolation', () => {
    let otherVendorUser: any;
    let otherVendor: any;

    beforeEach(async () => {
      // Create another vendor
      otherVendorUser = await prisma.user.create({
        data: {
          name: 'Other Vendor',
          email: 'othervendor@test.com',
          passwordHash: '$2b$10$test',
          role: 'VENDOR',
          isEmailVerified: true,
          isActive: true,
        },
      });

      otherVendor = await prisma.vendor.create({
        data: {
          userId: otherVendorUser.id,
          businessName: 'Other Vendor Business',
          city: 'Bangalore',
          area: 'Whitefield',
          verificationStatus: 'VERIFIED',
          serviceRadiusKm: 10,
        },
      });
    });

    it('vendor should not access other vendor data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vendors/${otherVendor.id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403); // Should be forbidden

      expect(response.body.message).toContain('forbidden');
    });
  });

  // ============================================
  // AUTHORIZATION TESTS
  // ============================================

  describe('AUTHORIZATION: Role-based Access', () => {
    it('should allow admin to approve vendor', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          userId: testVendorUser.id,
          businessName: 'Vendor to Approve',
          city: 'Chennai',
          area: 'Nungambakkam',
          verificationStatus: 'PENDING',
          serviceRadiusKm: 10,
        },
      });

      await request(app.getHttpServer())
        .patch(`/vendors/${vendor.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should deny customer to approve vendor', async () => {
      const vendor = await prisma.vendor.create({
        data: {
          userId: testVendorUser.id,
          businessName: 'Vendor to Approve',
          city: 'Chennai',
          area: 'Nungambakkam',
          verificationStatus: 'PENDING',
          serviceRadiusKm: 10,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/vendors/${vendor.id}/approve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.message).toContain('forbidden');
    });

    it('should deny unauthenticated access', async () => {
      await request(app.getHttpServer())
        .get('/vendors')
        .expect(401); // Unauthorized
    });

    it('should deny invalid token', async () => {
      await request(app.getHttpServer())
        .get('/vendors')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe('EDGE CASE: Extreme Values', () => {
    it('should handle very long businessName', async () => {
      const createVendorDto = {
        businessName: 'A'.repeat(100),
        city: 'Chennai',
        area: 'Velachery',
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(201);

      expect(response.body.businessName.length).toBe(100);
    });

    it('should handle zero serviceRadiusKm', async () => {
      const createVendorDto = {
        businessName: 'Zero Radius Vendor',
        city: 'Chennai',
        area: 'Velachery',
        serviceRadiusKm: 0,
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(201);

      expect(response.body.serviceRadiusKm).toBe(0);
    });

    it('should handle large serviceRadiusKm', async () => {
      const createVendorDto = {
        businessName: 'Large Radius Vendor',
        city: 'Chennai',
        area: 'Velachery',
        serviceRadiusKm: 1000,
      };

      const response = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(createVendorDto)
        .expect(201);

      expect(response.body.serviceRadiusKm).toBe(1000);
    });
  });

  // ============================================
  // NOT FOUND TESTS
  // ============================================

  describe('NOT FOUND: Invalid IDs', () => {
    it('should return 404 for non-existent vendor', async () => {
      const response = await request(app.getHttpServer())
        .get('/vendors/999999')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should return 404 when approving non-existent vendor', async () => {
      const response = await request(app.getHttpServer())
        .patch('/vendors/999999/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });
});
