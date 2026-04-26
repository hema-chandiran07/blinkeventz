/**
 * Promotions Controller Unit Tests
 * NearZro Event Management Platform
 *
 * Comprehensive unit tests for PromotionsController.
 * Covers all endpoints with positive and negative scenarios.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsController } from '../../../src/promotions/promotions.controller';
import { PromotionsService } from '../../../src/promotions/promotions.service';
import { JwtAuthGuard } from '../../../src/auth/jwt-auth.guard';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { createPromotion, createActivePromotion } from '../../utils/mock.factory';

describe('PromotionsController', () => {
  let controller: PromotionsController;
  let service: PromotionsService;

  const mockPromotionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    validateCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionsController],
      providers: [
        { provide: PromotionsService, useValue: mockPromotionsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PromotionsController>(PromotionsController);
    service = module.get<PromotionsService>(PromotionsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================
  // CREATE METHOD
  // ============================================
  describe('create', () => {
    const createDto = {
      code: 'WELCOME20',
      description: 'Welcome discount',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      validFrom: '2026-01-01',
      validUntil: '2027-12-31',
    };

    it('should create a promotion successfully', async () => {
      const mockPromotion = createPromotion({ code: 'WELCOME20' });
      mockPromotionsService.create.mockResolvedValue(mockPromotion);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockPromotion);
      expect(mockPromotionsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle service errors', async () => {
      mockPromotionsService.create.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.create(createDto)).rejects.toThrow('Validation failed');
    });
  });

  // ============================================
  // FINDALL METHOD
  // ============================================
  describe('findAll', () => {
    it('should return paginated promotions with default pagination', async () => {
      const mockResponse = {
        data: [createPromotion({ id: 1 }), createPromotion({ id: 2 })],
        total: 2,
        page: 1,
        totalPages: 1,
      };
      mockPromotionsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(undefined, undefined);

      expect(result).toEqual(mockResponse);
      expect(mockPromotionsService.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('should return paginated promotions with custom pagination', async () => {
      const mockResponse = {
        data: [createPromotion({ id: 1 })],
        total: 10,
        page: 2,
        totalPages: 5,
      };
      mockPromotionsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll('2', '5');

      expect(result).toEqual(mockResponse);
      expect(mockPromotionsService.findAll).toHaveBeenCalledWith({ page: 2, limit: 5 });
    });

    it('should handle NaN pagination values', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };
      mockPromotionsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll('abc', 'xyz');

      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(0);
    });
  });

  // ============================================
  // FINDONE METHOD
  // ============================================
  describe('findOne', () => {
    it('should return a promotion by id', async () => {
      const mockPromotion = createPromotion({ id: 1 });
      mockPromotionsService.findOne.mockResolvedValue(mockPromotion);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockPromotion);
      expect(mockPromotionsService.findOne).toHaveBeenCalledWith(1);
    });

    it('should convert string id to number', async () => {
      const mockPromotion = createPromotion({ id: 42 });
      mockPromotionsService.findOne.mockResolvedValue(mockPromotion);

      await controller.findOne('42');

      expect(mockPromotionsService.findOne).toHaveBeenCalledWith(42);
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
      const updatedPromotion = createPromotion({ id: 1, discountValue: 30, isActive: false });
      mockPromotionsService.update.mockResolvedValue(updatedPromotion);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(updatedPromotion);
      expect(mockPromotionsService.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  // ============================================
  // REMOVE METHOD
  // ============================================
  describe('remove', () => {
    it('should delete a promotion successfully', async () => {
      const mockPromotion = createPromotion({ id: 1 });
      mockPromotionsService.remove.mockResolvedValue(mockPromotion);

      await controller.remove('1');

      expect(mockPromotionsService.remove).toHaveBeenCalledWith(1);
    });
  });

  // ============================================
  // VALIDATE METHOD (PUBLIC)
  // ============================================
  describe('validate', () => {
    const validateDto = {
      code: 'WELCOME10',
      cartValue: 1000,
    };

    it('should validate a valid promotion code', async () => {
      const mockValidation = {
        valid: true,
        code: 'WELCOME10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        discountAmount: 100,
        description: 'Welcome discount',
      };
      mockPromotionsService.validateCode.mockResolvedValue(mockValidation);

      const result = await controller.validate(validateDto);

      expect(result).toEqual(mockValidation);
      expect(mockPromotionsService.validateCode).toHaveBeenCalledWith('WELCOME10', 1000);
    });

    it('should validate without cartValue', async () => {
      const mockValidation = {
        valid: true,
        code: 'WELCOME10',
        discountType: 'FLAT',
        discountValue: 100,
        discountAmount: 0,
        description: 'Flat discount',
      };
      mockPromotionsService.validateCode.mockResolvedValue(mockValidation);

      const result = await controller.validate({ code: 'WELCOME10' });

      expect(result).toEqual(mockValidation);
      expect(mockPromotionsService.validateCode).toHaveBeenCalledWith('WELCOME10', undefined);
    });
  });
});
