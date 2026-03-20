/**
 * Promotions Service Unit Tests
 * NearZro Event Management Platform
 *
 * Comprehensive unit tests for PromotionsService.
 * Covers CRUD operations, validation logic, and edge cases.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PromotionsService } from '../../../src/promotions/promotions.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { createPrismaMock } from '../../mocks/prisma.mock';
import {
  createPromotion,
  createActivePromotion,
  createExpiredPromotion,
  createInactivePromotion,
} from '../../utils/mock.factory';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // CREATE METHOD
  // ============================================
  describe('create', () => {
    const validDto = {
      code: 'WELCOME20',
      description: 'Welcome discount',
      discountType: 'PERCENTAGE' as const,
      discountValue: 20,
      minCartValue: 1000,
      maxDiscount: 1000,
      validFrom: '2026-01-01',
      validUntil: '2027-12-31',
      usageLimit: 500,
      isActive: true,
    };

    it('should create a promotion successfully', async () => {
      const mockPromotion = createPromotion({ code: 'WELCOME20', discountValue: 20 });
      prismaMock.promotion.create.mockResolvedValue(mockPromotion);

      const result = await service.create(validDto);

      expect(result).toEqual(mockPromotion);
      expect(prismaMock.promotion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'WELCOME20',
          discountType: 'PERCENTAGE',
          discountValue: 20,
        }),
      });
    });

    // Note: DTO validation is handled by class-validator pipe in controller
    // Service layer only handles business logic, so these validation failures
    // would be caught at the controller level via ValidationPipe
  });

  // ============================================
  // FINDALL METHOD
  // ============================================
  describe('findAll', () => {
    it('should return paginated promotions', async () => {
      const promotions = [
        createPromotion({ id: 1 }),
        createPromotion({ id: 2 }),
      ];
      
      prismaMock.promotion.findMany.mockResolvedValue(promotions);
      prismaMock.promotion.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(prismaMock.promotion.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle empty results', async () => {
      prismaMock.promotion.findMany.mockResolvedValue([]);
      prismaMock.promotion.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should calculate pagination correctly for multiple pages', async () => {
      const promotions = Array(10).fill(null).map((_, i) => createPromotion({ id: i + 1 }));
      
      prismaMock.promotion.findMany.mockResolvedValue(promotions);
      prismaMock.promotion.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(5);
      expect(prismaMock.promotion.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ============================================
  // FINDONE METHOD
  // ============================================
  describe('findOne', () => {
    it('should return a promotion by id', async () => {
      const promotion = createPromotion({ id: 1 });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);

      const result = await service.findOne(1);

      expect(result).toEqual(promotion);
      expect(prismaMock.promotion.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when promotion not found', async () => {
      prismaMock.promotion.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // UPDATE METHOD
  // ============================================
  describe('update', () => {
    const updateDto = {
      discountValue: 30,
      isActive: false,
    };

    it('should update a promotion successfully', async () => {
      const existingPromotion = createPromotion({ id: 1, discountValue: 20 });
      const updatedPromotion = { ...existingPromotion, ...updateDto, discountValue: 30 };
      
      prismaMock.promotion.findUnique
        .mockResolvedValueOnce(existingPromotion) // for findOne check
        .mockResolvedValueOnce(updatedPromotion); // for update
      
      prismaMock.promotion.update.mockResolvedValue(updatedPromotion);

      const result = await service.update(1, updateDto);

      expect(result.discountValue).toBe(30);
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when updating non-existent promotion', async () => {
      prismaMock.promotion.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should convert date strings to Date objects', async () => {
      const existingPromotion = createPromotion({ id: 1 });
      const updateDtoWithDates = {
        validFrom: '2026-06-01',
        validUntil: '2027-06-01',
      };
      
      prismaMock.promotion.findUnique
        .mockResolvedValueOnce(existingPromotion)
        .mockResolvedValueOnce(existingPromotion);
      prismaMock.promotion.update.mockResolvedValue(existingPromotion);

      await service.update(1, updateDtoWithDates);

      expect(prismaMock.promotion.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          validFrom: expect.any(Date),
          validUntil: expect.any(Date),
        }),
      });
    });
  });

  // ============================================
  // REMOVE METHOD
  // ============================================
  describe('remove', () => {
    it('should delete a promotion successfully', async () => {
      const promotion = createPromotion({ id: 1 });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);
      prismaMock.promotion.delete.mockResolvedValue(promotion);

      await service.remove(1);

      expect(prismaMock.promotion.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when deleting non-existent promotion', async () => {
      prismaMock.promotion.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // VALIDATECODE METHOD
  // ============================================
  describe('validateCode', () => {
    beforeEach(() => {
      // Mock Date for consistent testing
      jest.useFakeTimers().setSystemTime(new Date('2026-06-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should validate a valid percentage promotion', async () => {
      const promotion = createActivePromotion({
        code: 'WELCOME10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minCartValue: 500,
        maxDiscount: 500,
      });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);

      const result = await service.validateCode('WELCOME10', 1000);

      expect(result.valid).toBe(true);
      expect(result.code).toBe('WELCOME10');
      expect(result.discountAmount).toBe(100); // 10% of 1000
    });

    it('should validate a valid flat promotion', async () => {
      const promotion = createActivePromotion({
        code: 'FLAT100',
        discountType: 'FLAT',
        discountValue: 100,
        minCartValue: null,
        maxDiscount: null,
      });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);

      const result = await service.validateCode('FLAT100', 500);

      expect(result.valid).toBe(true);
      expect(result.discountType).toBe('FLAT');
      expect(result.discountAmount).toBe(100);
    });

    it('should cap discount at maxDiscount for percentage promotions', async () => {
      const promotion = createActivePromotion({
        code: 'WELCOME50',
        discountType: 'PERCENTAGE',
        discountValue: 50,
        maxDiscount: 200,
      });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);

      const result = await service.validateCode('WELCOME50', 1000);

      expect(result.discountAmount).toBe(200); // 50% of 1000 = 500, capped at 200
    });

    it('should throw NotFoundException for invalid code', async () => {
      prismaMock.promotion.findUnique.mockResolvedValue(null);

      await expect(service.validateCode('INVALID')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive promotion', async () => {
      const promotion = createInactivePromotion({ code: 'INACTIVE' });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);

      await expect(service.validateCode('INACTIVE')).rejects.toThrow(
        new BadRequestException('Promotion is not active'),
      );
    });

    it('should throw BadRequestException for expired promotion', async () => {
      // Create promotion that is active but expired
      const promotion = createActivePromotion({ 
        code: 'EXPIRED',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
      });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);

      await expect(service.validateCode('EXPIRED')).rejects.toThrow(
        new BadRequestException('Promotion has expired'),
      );
    });

    it('should throw BadRequestException for promotion not yet valid', async () => {
      const promotion = createActivePromotion({
        code: 'FUTURE',
        validFrom: new Date('2027-01-01'),
        validUntil: new Date('2027-12-31'),
      });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);

      await expect(service.validateCode('FUTURE')).rejects.toThrow(
        new BadRequestException('Promotion is not yet valid'),
      );
    });

    it('should throw BadRequestException when usage limit reached', async () => {
      const promotion = createActivePromotion({
        code: 'LIMITED',
        usageLimit: 100,
        usedCount: 100,
      });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);

      await expect(service.validateCode('LIMITED')).rejects.toThrow(
        new BadRequestException('Promotion usage limit reached'),
      );
    });

    it('should throw BadRequestException when cart value below minimum', async () => {
      const promotion = createActivePromotion({
        code: 'MIN500',
        minCartValue: 500,
      });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);

      await expect(service.validateCode('MIN500', 400)).rejects.toThrow(
        new BadRequestException('Minimum cart value of ₹500 required'),
      );
    });

    // Note: The actual implementation returns the discountValue for FLAT type
    // regardless of cartValue. This is the actual behavior - test reflects real code.
    it('should return discount value for flat type when cartValue not provided', async () => {
      const promotion = createActivePromotion({
        code: 'FLAT100',
        discountType: 'FLAT',
        discountValue: 100,
      });
      prismaMock.promotion.findUnique.mockResolvedValue(promotion);

      const result = await service.validateCode('FLAT100');

      expect(result.discountAmount).toBe(100); // FLAT type returns discountValue
    });
  });

  // ============================================
  // INCREMENTUSAGE METHOD
  // ============================================
  describe('incrementUsage', () => {
    it('should increment usedCount for a promotion', async () => {
      const promotion = createPromotion({ id: 1, usedCount: 5 });
      const updatedPromotion = { ...promotion, usedCount: 6 };
      
      prismaMock.promotion.update.mockResolvedValue(updatedPromotion);

      const result = await service.incrementUsage(1);

      expect(result.usedCount).toBe(6);
      expect(prismaMock.promotion.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { usedCount: { increment: 1 } },
      });
    });
  });
});
