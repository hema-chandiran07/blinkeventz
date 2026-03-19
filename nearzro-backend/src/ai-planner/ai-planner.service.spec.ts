import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AIPlannerService } from './ai-planner.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AIPlannerService', () => {
  let service: AIPlannerService;
  let prisma: PrismaService;

  const mockUserId = 1;
  const mockPlanId = 100;

  const mockAIPlan = {
    id: mockPlanId,
    userId: mockUserId,
    budget: 500000,
    city: 'Mumbai',
    area: 'Bandra',
    guestCount: 300,
    eventType: 'Wedding',
    planJson: {
      summary: {
        eventType: 'Wedding',
        city: 'Mumbai',
        guestCount: 300,
        totalBudget: 500000,
      },
      allocations: [
        { category: 'Venue', amount: 150000, notes: 'Grand ballroom' },
        { category: 'Catering', amount: 200000, notes: 'Per plate' },
        { category: 'Decor', amount: 100000, notes: 'Flowers and lights' },
        { category: 'Photography', amount: 50000, notes: 'Full day' },
      ],
    },
    status: 'GENERATED',
    shareId: 'share-123',
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVendor = {
    id: 1,
    name: 'Test Catering',
    baseRate: 50000,
    pricingModel: 'PER_EVENT',
    isActive: true,
    vendor: {
      id: 1,
      businessName: 'Test Vendor',
      city: 'Mumbai',
      verificationStatus: 'VERIFIED',
    },
  };

  const mockPrisma = {
    aIPlan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vendorService: {
      findMany: jest.fn(),
    },
    cart: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIPlannerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AIPlannerService>(AIPlannerService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlan', () => {
    it('should return plan when found and authorized', async () => {
      mockPrisma.aIPlan.findFirst.mockResolvedValue(mockAIPlan);

      const result = await service.getPlan(mockPlanId, mockUserId);

      expect(result).toEqual(mockAIPlan);
      expect(mockPrisma.aIPlan.findFirst).toHaveBeenCalledWith({
        where: { id: mockPlanId, userId: mockUserId },
      });
    });

    it('should throw when plan not found', async () => {
      mockPrisma.aIPlan.findFirst.mockResolvedValue(null);

      await expect(service.getPlan(999, mockUserId)).rejects.toThrow(BadRequestException);
    });

    it('should throw when user not authorized', async () => {
      // The service checks userId in the query, so it won't find a plan with different userId
      mockPrisma.aIPlan.findFirst.mockResolvedValue(null);

      await expect(service.getPlan(mockPlanId, mockUserId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPlanPublic', () => {
    it('should return public plan by shareId', async () => {
      const publicPlan = { ...mockAIPlan, isPublic: true };
      mockPrisma.aIPlan.findUnique.mockResolvedValue(publicPlan);

      const result = await service.getPlanPublic('share-123');

      expect(result).toBeDefined();
    });

    it('should return null for non-public plan', async () => {
      const privatePlan = { ...mockAIPlan, isPublic: false };
      mockPrisma.aIPlan.findUnique.mockResolvedValue(privatePlan);

      const result = await service.getPlanPublic('share-123');

      expect(result).toBeNull();
    });

    it('should return null for non-existent plan', async () => {
      mockPrisma.aIPlan.findUnique.mockResolvedValue(null);

      const result = await service.getPlanPublic('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('matchVendorsFromPlan', () => {
    it('should return matching vendors', async () => {
      mockPrisma.aIPlan.findFirst.mockResolvedValue(mockAIPlan);
      mockPrisma.vendorService.findMany.mockResolvedValue([mockVendor]);

      const result = await service.matchVendorsFromPlan(mockPlanId, mockUserId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw when plan not found', async () => {
      mockPrisma.aIPlan.findFirst.mockResolvedValue(null);

      await expect(service.matchVendorsFromPlan(999, mockUserId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createCartFromAIPlan', () => {
    it('should create cart from plan', async () => {
      const mockCart = {
        id: 1,
        userId: mockUserId,
        status: 'ACTIVE',
        items: [],
      };
      mockPrisma.aIPlan.findFirst.mockResolvedValue(mockAIPlan);
      mockPrisma.cart.create.mockResolvedValue(mockCart);
      mockPrisma.aIPlan.update.mockResolvedValue({ ...mockAIPlan, status: 'ACCEPTED' });

      const result = await service.createCartFromAIPlan(mockUserId, mockPlanId);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should throw when plan not found', async () => {
      mockPrisma.aIPlan.findFirst.mockResolvedValue(null);

      await expect(service.createCartFromAIPlan(mockUserId, 999)).rejects.toThrow(BadRequestException);
    });

    it('should throw when plan has no JSON', async () => {
      const planWithoutJson = { ...mockAIPlan, planJson: null };
      mockPrisma.aIPlan.findFirst.mockResolvedValue(planWithoutJson);

      await expect(service.createCartFromAIPlan(mockUserId, mockPlanId)).rejects.toThrow(BadRequestException);
    });

    it('should throw when plan has empty allocations', async () => {
      const planEmptyAllocations = {
        ...mockAIPlan,
        planJson: { summary: {}, allocations: [] },
      };
      mockPrisma.aIPlan.findFirst.mockResolvedValue(planEmptyAllocations);

      await expect(service.createCartFromAIPlan(mockUserId, mockPlanId)).rejects.toThrow(
        'Cannot create cart from empty plan',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very low budget', async () => {
      const lowBudgetPlan = {
        ...mockAIPlan,
        budget: 1000,
        planJson: {
          summary: { totalBudget: 1000 },
          allocations: [{ category: 'Venue', amount: 1000 }],
        },
      };
      const mockCart = { id: 1, userId: mockUserId, status: 'ACTIVE', items: [] };
      mockPrisma.aIPlan.findFirst.mockResolvedValue(lowBudgetPlan);
      mockPrisma.cart.create.mockResolvedValue(mockCart);
      mockPrisma.aIPlan.update.mockResolvedValue({ ...lowBudgetPlan, status: 'ACCEPTED' });

      await expect(service.createCartFromAIPlan(mockUserId, mockPlanId)).resolves.toBeDefined();
    });

    it('should handle very high budget', async () => {
      const highBudgetPlan = {
        ...mockAIPlan,
        budget: 100000000,
        planJson: {
          summary: { totalBudget: 100000000 },
          allocations: [
            { category: 'Venue', amount: 30000000 },
            { category: 'Catering', amount: 40000000 },
          ],
        },
      };
      const mockCart = { id: 1, userId: mockUserId, status: 'ACTIVE', items: [] };
      mockPrisma.aIPlan.findFirst.mockResolvedValue(highBudgetPlan);
      mockPrisma.cart.create.mockResolvedValue(mockCart);
      mockPrisma.aIPlan.update.mockResolvedValue({ ...highBudgetPlan, status: 'ACCEPTED' });

      await expect(service.createCartFromAIPlan(mockUserId, mockPlanId)).resolves.toBeDefined();
    });

    it('should handle unknown city in vendor matching', async () => {
      const planWithUnknownCity = { ...mockAIPlan, city: 'UnknownCity123' };
      mockPrisma.aIPlan.findFirst.mockResolvedValue(planWithUnknownCity);
      mockPrisma.vendorService.findMany.mockResolvedValue([]);

      const result = await service.matchVendorsFromPlan(mockPlanId, mockUserId);

      expect(result).toEqual([]);
    });
  });
});
