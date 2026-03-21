/**
 * Promotions Integration Tests
 * NearZro Event Management Platform
 *
 * Integration tests for Promotions API endpoints.
 * Tests controller + service layer with mocked Prisma.
 * Fast, isolated tests - no real database needed.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PromotionsController } from '../../src/promotions/promotions.controller';
import { PromotionsService } from '../../src/promotions/promotions.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { createPrismaMock } from '../mocks/prisma.mock';

describe('Promotions (Integration)', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    mockPrisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionsController],
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  // ============================================
  // POST /promotions - Create Promotion
  // ============================================
  describe('POST /promotions', () => {
    it('should create promotion successfully (201)', async () => {
      const createDto = {
        code: 'WELCOME20',
        description: 'Test discount',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        validFrom: '2026-01-01',
        validUntil: '2027-12-31',
      };

      const createdPromotion = {
        id: 1,
        ...createDto,
        minCartValue: null,
        maxDiscount: null,
        usageLimit: null,
        usedCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.promotion.create.mockResolvedValue(createdPromotion);

      const response = await request(app.getHttpServer())
        .post('/promotions')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('code', 'WELCOME20');
      expect(response.body).toHaveProperty('id');
    });

    it('should fail with invalid discount type (400)', async () => {
      const invalidDto = {
        code: 'TEST',
        discountType: 'INVALID',
        discountValue: 20,
        validFrom: '2026-01-01',
        validUntil: '2027-12-31',
      };

      const response = await request(app.getHttpServer())
        .post('/promotions')
        .send(invalidDto);

      expect(response.status).toBe(400);
    });

    it('should fail with missing required fields (400)', async () => {
      const invalidDto = { code: 'TEST' };

      const response = await request(app.getHttpServer())
        .post('/promotions')
        .send(invalidDto);

      expect(response.status).toBe(400);
    });
  });

  // ============================================
  // GET /promotions - List All Promotions
  // ============================================
  describe('GET /promotions', () => {
    it('should return paginated promotions (200)', async () => {
      const promotions = [
        { id: 1, code: 'PROMO_1', discountValue: 10, isActive: true, description: 'Test 1', discountType: 'PERCENTAGE', validFrom: new Date(), validUntil: new Date(), createdAt: new Date(), updatedAt: new Date(), minCartValue: null, maxDiscount: null, usageLimit: null, usedCount: 0 },
        { id: 2, code: 'PROMO_2', discountValue: 20, isActive: true, description: 'Test 2', discountType: 'FIXED', validFrom: new Date(), validUntil: new Date(), createdAt: new Date(), updatedAt: new Date(), minCartValue: null, maxDiscount: null, usageLimit: null, usedCount: 0 },
      ];

      mockPrisma.promotion.findMany.mockResolvedValue(promotions);
      mockPrisma.promotion.count.mockResolvedValue(2);

      const response = await request(app.getHttpServer())
        .get('/promotions')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should handle pagination parameters (200)', async () => {
      mockPrisma.promotion.findMany.mockResolvedValue([]);
      mockPrisma.promotion.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .get('/promotions?page=2&limit=5')
        .expect(200);

      expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  // ============================================
  // GET /promotions/:id - Get Promotion by ID
  // ============================================
  describe('GET /promotions/:id', () => {
    it('should return promotion by id (200)', async () => {
      const promotion = { 
        id: 42, 
        code: 'SPECIFIC_CODE', 
        discountValue: 15,
        isActive: true,
        description: 'Test',
        discountType: 'PERCENTAGE' as const,
        validFrom: new Date(),
        validUntil: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        minCartValue: null,
        maxDiscount: null,
        usageLimit: null,
        usedCount: 0,
      };
      
      mockPrisma.promotion.findUnique.mockResolvedValue(promotion);

      const response = await request(app.getHttpServer())
        .get('/promotions/42')
        .expect(200);

      expect(response.body).toHaveProperty('id', 42);
      expect(response.body.code).toBe('SPECIFIC_CODE');
    });

    it('should return 404 for non-existent promotion', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/promotions/999')
        .expect(404);

      expect(response.body.message).toContain('Promotion not found');
    });
  });

  // ============================================
  // PATCH /promotions/:id - Update Promotion
  // ============================================
  describe('PATCH /promotions/:id', () => {
    it('should update promotion successfully (200)', async () => {
      const existingPromotion = { 
        id: 1, 
        code: 'UPDATE_TEST', 
        discountValue: 10,
        isActive: true,
        description: 'Test',
        discountType: 'PERCENTAGE' as const,
        validFrom: new Date(),
        validUntil: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        minCartValue: null,
        maxDiscount: null,
        usageLimit: null,
        usedCount: 0,
      };
      const updatedPromotion = { 
        ...existingPromotion, 
        discountValue: 30, 
        isActive: false 
      };

      mockPrisma.promotion.findUnique.mockResolvedValue(existingPromotion);
      mockPrisma.promotion.update.mockResolvedValue(updatedPromotion);

      const response = await request(app.getHttpServer())
        .patch('/promotions/1')
        .send({ discountValue: 30, isActive: false })
        .expect(200);

      expect(response.body.discountValue).toBe(30);
    });

    it('should return 404 for non-existent promotion', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch('/promotions/999')
        .send({ discountValue: 30 })
        .expect(404);
    });
  });

  // ============================================
  // DELETE /promotions/:id - Delete Promotion
  // ============================================
  describe('DELETE /promotions/:id', () => {
    it('should delete promotion successfully (200)', async () => {
      const promotion = { 
        id: 5, 
        code: 'DELETE_ME',
        discountValue: 10,
        isActive: true,
        description: 'Test',
        discountType: 'PERCENTAGE' as const,
        validFrom: new Date(),
        validUntil: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        minCartValue: null,
        maxDiscount: null,
        usageLimit: null,
        usedCount: 0,
      };
      
      mockPrisma.promotion.findUnique.mockResolvedValue(promotion);
      mockPrisma.promotion.delete.mockResolvedValue(promotion);

      const response = await request(app.getHttpServer())
        .delete('/promotions/5')
        .expect(200);

      expect(mockPrisma.promotion.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('should return 404 for non-existent promotion', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .delete('/promotions/999')
        .expect(404);
    });
  });

  // ============================================
  // POST /promotions/validate - Validate Code (Public)
  // ============================================
  describe('POST /promotions/validate', () => {
    it('should validate valid promotion code (200/201)', async () => {
      const promotion = {
        code: 'VALID_PROMO',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minCartValue: 500,
        maxDiscount: 500,
        isActive: true,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2027-12-31'),
        usageLimit: null,
        usedCount: 0,
        id: 1,
        description: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.promotion.findUnique.mockResolvedValue(promotion);

      const response = await request(app.getHttpServer())
        .post('/promotions/validate')
        .send({ code: 'VALID_PROMO', cartValue: 1000 });

      expect([200, 201]).toContain(response.status);
      expect(response.body.valid).toBe(true);
      expect(response.body.discountAmount).toBe(100);
    });

    it('should return 404 for invalid code', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/promotions/validate')
        .send({ code: 'NONEXISTENT' })
        .expect(404);

      expect(response.body.message).toContain('Invalid promotion code');
    });

    it('should fail for inactive promotion', async () => {
      const promotion = {
        code: 'INACTIVE_PROMO',
        isActive: false,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2027-12-31'),
        minCartValue: null,
        maxDiscount: null,
        usageLimit: null,
        usedCount: 0,
        id: 1,
        description: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.promotion.findUnique.mockResolvedValue(promotion);

      const response = await request(app.getHttpServer())
        .post('/promotions/validate')
        .send({ code: 'INACTIVE_PROMO' })
        .expect(400);

      expect(response.body.message).toContain('not active');
    });

    it('should fail when cart value below minimum', async () => {
      const promotion = {
        code: 'MIN_CART',
        minCartValue: 500,
        isActive: true,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2027-12-31'),
        maxDiscount: null,
        usageLimit: null,
        usedCount: 0,
        id: 1,
        description: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.promotion.findUnique.mockResolvedValue(promotion);

      const response = await request(app.getHttpServer())
        .post('/promotions/validate')
        .send({ code: 'MIN_CART', cartValue: 400 })
        .expect(400);

      expect(response.body.message).toContain('Minimum cart value');
    });
  });
});
