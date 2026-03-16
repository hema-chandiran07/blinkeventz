import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AIPlannerService } from '../../src/ai-planner/ai-planner.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('AIPlannerService', () => {
  let service: AIPlannerService;
  let prisma: any;

  // Mock data
  const mockPlan = {
    id: 1,
    userId: 1,
    budget: 500000,
    city: 'Chennai',
    area: 'Velachery',
    guestCount: 300,
    planJson: {
      summary: { eventType: 'Wedding', city: 'Chennai', guestCount: 300, totalBudget: 500000 },
      allocations: [
        { category: 'Venue', amount: 150000 },
        { category: 'Catering', amount: 200000 },
        { category: 'Decor', amount: 100000 },
        { category: 'Photography', amount: 50000 },
      ],
    },
    status: 'GENERATED',
    EventId: null,
  };

  const mockVendors = [
    { id: 1, name: 'Vendor 1', vendor: { city: 'Chennai', verificationStatus: 'VERIFIED' } },
  ];

  const mockCart = {
    id: 1,
    userId: 1,
    status: 'ACTIVE',
    items: [],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      aIPlan: {
        findFirst: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIPlannerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AIPlannerService>(AIPlannerService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // POSITIVE TESTS
  // ==========================================

  describe('getPlan', () => {
    it('should return plan when found and authorized', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(mockPlan);

      const result = await service.getPlan(1, 1);

      expect(result).toEqual(mockPlan);
      expect(prisma.aIPlan.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
    });

    it('should return plan with large budget', async () => {
      const largeBudgetPlan = { ...mockPlan, budget: 10000000 };
      prisma.aIPlan.findFirst.mockResolvedValue(largeBudgetPlan);

      const result = await service.getPlan(1, 1);

      expect(result.budget).toBe(10000000);
    });

    it('should return plan with large guest count', async () => {
      const largeGuestPlan = { ...mockPlan, guestCount: 5000 };
      prisma.aIPlan.findFirst.mockResolvedValue(largeGuestPlan);

      const result = await service.getPlan(1, 1);

      expect(result.guestCount).toBe(5000);
    });

    it('should return plan with different cities', async () => {
      const mumbaiPlan = { ...mockPlan, city: 'Mumbai', area: 'Bandra' };
      prisma.aIPlan.findFirst.mockResolvedValue(mumbaiPlan);

      const result = await service.getPlan(1, 1);

      expect(result.city).toBe('Mumbai');
      expect(result.area).toBe('Bandra');
    });
  });

  describe('matchVendorsFromPlan', () => {
    it('should return matching vendors for valid plan', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(mockPlan);
      prisma.vendorService.findMany.mockResolvedValue(mockVendors);

      const result = await service.matchVendorsFromPlan(1, 1);

      expect(result).toEqual(mockVendors);
      expect(prisma.vendorService.findMany).toHaveBeenCalled();
    });

    it('should return vendors for different cities', async () => {
      const mumbaiPlan = { ...mockPlan, city: 'Mumbai' };
      const mumbaiVendors = [
        { id: 2, name: 'Mumbai Vendor', vendor: { city: 'Mumbai', verificationStatus: 'VERIFIED' } },
      ];

      prisma.aIPlan.findFirst.mockResolvedValue(mumbaiPlan);
      prisma.vendorService.findMany.mockResolvedValue(mumbaiVendors);

      const result = await service.matchVendorsFromPlan(1, 1);

      expect(result).toEqual(mumbaiVendors);
    });

    it('should filter by verified vendors', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(mockPlan);
      prisma.vendorService.findMany.mockResolvedValue(mockVendors);

      await service.matchVendorsFromPlan(1, 1);

      const findManyCall = prisma.vendorService.findMany.mock.calls[0][0];
      expect(findManyCall.where.vendor.verificationStatus).toBe('VERIFIED');
    });
  });

  describe('createCartFromAIPlan', () => {
    it('should create cart from valid plan', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(mockPlan);
      prisma.cart.create.mockResolvedValue(mockCart);
      prisma.aIPlan.update.mockResolvedValue({ ...mockPlan, status: 'ACCEPTED' });

      const result = await service.createCartFromAIPlan(1, 1);

      expect(result).toEqual(mockCart);
      expect(prisma.cart.create).toHaveBeenCalled();
      expect(prisma.aIPlan.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'ACCEPTED' },
      });
    });

    it('should create cart with correct item count', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(mockPlan);
      const cartWithItems = {
        ...mockCart,
        items: [
          { category: 'Venue', amount: 150000 },
          { category: 'Catering', amount: 200000 },
        ],
      };
      prisma.cart.create.mockResolvedValue(cartWithItems);
      prisma.aIPlan.update.mockResolvedValue({});

      const result = await service.createCartFromAIPlan(1, 1);

      expect(result.items.length).toBe(2);
    });

    it('should include AI_PLAN source in cart items', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(mockPlan);
      const cartWithMeta = {
        ...mockCart,
        items: [{ meta: { source: 'AI_PLAN' } }],
      };
      prisma.cart.create.mockResolvedValue(cartWithMeta);
      prisma.aIPlan.update.mockResolvedValue({});

      await service.createCartFromAIPlan(1, 1);

      const createCall = prisma.cart.create.mock.calls[0][0];
      expect(createCall.data.items.create[0].meta.source).toBe('AI_PLAN');
    });
  });

  // ==========================================
  // NEGATIVE TESTS
  // ==========================================

  describe('getPlan - Error Cases', () => {
    it('should throw when plan not found', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(null);

      await expect(service.getPlan(999, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw when user not authorized', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(null);

      await expect(service.getPlan(1, 999)).rejects.toThrow(BadRequestException);
    });
  });

  describe('matchVendorsFromPlan - Error Cases', () => {
    it('should throw when plan not found', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(null);

      await expect(service.matchVendorsFromPlan(999, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw when user not authorized', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(null);

      await expect(service.matchVendorsFromPlan(1, 999)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createCartFromAIPlan - Error Cases', () => {
    it('should throw when plan not found', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(null);

      await expect(service.createCartFromAIPlan(1, 999)).rejects.toThrow(BadRequestException);
    });

    it('should throw when user not authorized', async () => {
      prisma.aIPlan.findFirst.mockResolvedValue(null);

      await expect(service.createCartFromAIPlan(999, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw when plan has no allocations', async () => {
      const emptyPlan = { ...mockPlan, planJson: { allocations: [] } };
      prisma.aIPlan.findFirst.mockResolvedValue(emptyPlan);

      await expect(service.createCartFromAIPlan(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw when planJson is null', async () => {
      const nullJsonPlan = { ...mockPlan, planJson: null };
      prisma.aIPlan.findFirst.mockResolvedValue(nullJsonPlan);

      await expect(service.createCartFromAIPlan(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // EDGE CASE TESTS
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle extremely high budget', async () => {
      const highBudgetPlan = { ...mockPlan, budget: 100000000 };
      prisma.aIPlan.findFirst.mockResolvedValue(highBudgetPlan);

      const result = await service.getPlan(1, 1);

      expect(result.budget).toBe(100000000);
    });

    it('should handle minimum budget', async () => {
      const minBudgetPlan = { ...mockPlan, budget: 1000 };
      prisma.aIPlan.findFirst.mockResolvedValue(minBudgetPlan);

      const result = await service.getPlan(1, 1);

      expect(result.budget).toBe(1000);
    });

    it('should handle single guest', async () => {
      const singleGuestPlan = { ...mockPlan, guestCount: 1 };
      prisma.aIPlan.findFirst.mockResolvedValue(singleGuestPlan);

      const result = await service.getPlan(1, 1);

      expect(result.guestCount).toBe(1);
    });

    it('should handle maximum guests', async () => {
      const maxGuestPlan = { ...mockPlan, guestCount: 10000 };
      prisma.aIPlan.findFirst.mockResolvedValue(maxGuestPlan);

      const result = await service.getPlan(1, 1);

      expect(result.guestCount).toBe(10000);
    });

    it('should handle empty city in plan', async () => {
      const emptyCityPlan = { ...mockPlan, city: '' };
      prisma.aIPlan.findFirst.mockResolvedValue(emptyCityPlan);

      const result = await service.getPlan(1, 1);

      expect(result.city).toBe('');
    });
  });
});
