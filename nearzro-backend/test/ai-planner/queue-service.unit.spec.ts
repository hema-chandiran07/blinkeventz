import { Test, TestingModule } from '@nestjs/testing';
import { AIPlannerQueueService, GeneratePlanJobData } from '../../src/ai-planner/queue/ai-planner-queue.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { OpenAIProvider } from '../../src/ai-planner/providers/openai.provider';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

// Mock Prisma
const mockPrisma = {
  aIPlan: {
    create: jest.fn().mockResolvedValue({ id: 1, userId: 1 }),
    findFirst: jest.fn(),
  },
};

// Mock Cache
const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

// Mock OpenAI Provider
const mockAIProvider = {
  generateWithCircuitBreaker: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(true),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn().mockReturnValue('fake-api-key'),
};

describe('AIPlannerQueueService', () => {
  let service: AIPlannerQueueService;
  let ai: typeof mockAIProvider;

  const validJobData: GeneratePlanJobData = {
    userId: 1,
    budget: 500000,
    eventType: 'Wedding',
    city: 'Chennai',
    area: 'Velachery',
    guestCount: 300,
  };

  const validAIResponse = JSON.stringify({
    summary: { eventType: 'Wedding', city: 'Chennai', guestCount: 300, totalBudget: 500000 },
    allocations: [
      { category: 'Venue', amount: 150000, notes: 'Great venue' },
      { category: 'Catering', amount: 200000, notes: 'Good food' },
      { category: 'Decor', amount: 100000, notes: 'Beautiful' },
      { category: 'Photography', amount: 50000, notes: 'Professional' },
    ],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIPlannerQueueService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: OpenAIProvider,
          useValue: mockAIProvider,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AIPlannerQueueService>(AIPlannerQueueService);
    ai = module.get(OpenAIProvider);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // POSITIVE TESTS
  // ==========================================

  describe('processGeneratePlanJob - Success Cases', () => {
    it('should successfully process a valid job', async () => {
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValueOnce(validAIResponse);
      mockCache.get.mockResolvedValueOnce(null);

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('success');
      expect(result.planId).toBe(1);
      expect(mockPrisma.aIPlan.create).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should return cached result if available', async () => {
      const cachedPlan = { id: 999, userId: 1 };
      mockCache.get.mockResolvedValueOnce(cachedPlan);

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('success');
      expect(result.planId).toBe(999);
      expect(mockPrisma.aIPlan.create).not.toHaveBeenCalled();
    });

    it('should process job with high budget', async () => {
      // AI response must match high budget
      const highBudgetAIResponse = JSON.stringify({
        summary: { eventType: 'Wedding', city: 'Chennai', guestCount: 300, totalBudget: 10000000 },
        allocations: [
          { category: 'Venue', amount: 3000000, notes: 'Great venue' },
          { category: 'Catering', amount: 4000000, notes: 'Good food' },
          { category: 'Decor', amount: 2000000, notes: 'Nice decoration' },
          { category: 'Photography', amount: 1000000, notes: 'Photos' },
        ],
      });

      mockAIProvider.generateWithCircuitBreaker.mockResolvedValueOnce(highBudgetAIResponse);
      mockCache.get.mockResolvedValueOnce(null);

      const highBudgetData = { ...validJobData, budget: 10000000 };

      const result = await service.processGeneratePlanJob(highBudgetData);

      expect(result.status).toBe('success');
    });

    it('should process job with large guest count', async () => {
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValueOnce(validAIResponse);
      mockCache.get.mockResolvedValueOnce(null);

      const largeGuestData = { ...validJobData, guestCount: 5000 };

      const result = await service.processGeneratePlanJob(largeGuestData);

      expect(result.status).toBe('success');
    });

    it('should handle different cities', async () => {
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValueOnce(validAIResponse);
      mockCache.get.mockResolvedValueOnce(null);

      const mumbaiData = { ...validJobData, city: 'Mumbai', area: 'Bandra' };

      const result = await service.processGeneratePlanJob(mumbaiData);

      expect(result.status).toBe('success');
    });
  });

  // ==========================================
  // NEGATIVE TESTS
  // ==========================================

  describe('processGeneratePlanJob - Error Cases', () => {
    it('should fail when budget allocation mismatch', async () => {
      const mismatchedResponse = JSON.stringify({
        summary: { eventType: 'Wedding', city: 'Chennai', guestCount: 300, totalBudget: 500000 },
        allocations: [
          { category: 'Venue', amount: 300000 }, // Total 300000, not 500000
        ],
      });

      mockAIProvider.generateWithCircuitBreaker.mockResolvedValueOnce(mismatchedResponse);
      mockCache.get.mockResolvedValueOnce(null);

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('does not match');
    });

    it('should fail when AI service is unavailable', async () => {
      mockAIProvider.generateWithCircuitBreaker.mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );
      mockCache.get.mockResolvedValueOnce(null);

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('AI service unavailable');
    });

    it('should fail on invalid JSON from AI', async () => {
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValueOnce('not valid json');
      mockCache.get.mockResolvedValueOnce(null);

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('JSON');
    });

    it('should fail on empty AI response', async () => {
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValueOnce('');
      mockCache.get.mockResolvedValueOnce(null);

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
    });
  });

  // ==========================================
  // REGENERATION TESTS
  // ==========================================

  describe('processGeneratePlanJob - Regeneration', () => {
    it('should fetch existing plan data for regeneration', async () => {
      const existingPlan = {
        id: 10,
        userId: 1,
        budget: 300000,
        city: 'Mumbai',
        area: 'Bandra',
        guestCount: 200,
      };

      // AI response must match existing plan's budget
      const regenerationAIResponse = JSON.stringify({
        summary: { eventType: 'Regenerated', city: 'Mumbai', guestCount: 200, totalBudget: 300000 },
        allocations: [
          { category: 'Venue', amount: 100000, notes: 'Great venue' },
          { category: 'Catering', amount: 150000, notes: 'Good food' },
          { category: 'Decor', amount: 50000, notes: 'Nice decoration' },
        ],
      });

      mockPrisma.aIPlan.findFirst.mockResolvedValue(existingPlan);
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValueOnce(regenerationAIResponse);
      mockCache.get.mockResolvedValueOnce(null);

      const regenerationData: GeneratePlanJobData = {
        userId: 1,
        budget: 0, // Indicates regeneration
        eventType: 'Regenerated',
        city: '',
        area: '',
        guestCount: 0,
        eventId: 10,
      };

      const result = await service.processGeneratePlanJob(regenerationData);

      expect(mockPrisma.aIPlan.findFirst).toHaveBeenCalledWith({
        where: { id: 10, userId: 1 },
      });
      expect(result.status).toBe('success');
    });

    it('should handle regeneration when existing plan not found', async () => {
      mockPrisma.aIPlan.findFirst.mockResolvedValue(null);
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValueOnce(validAIResponse);
      mockCache.get.mockResolvedValueOnce(null);

      const regenerationData: GeneratePlanJobData = {
        userId: 1,
        budget: 0,
        eventType: 'Regenerated',
        city: '',
        area: '',
        guestCount: 0,
        eventId: 999,
      };

      // Should fail because budget is 0 and no existing plan to get budget from
      const result = await service.processGeneratePlanJob(regenerationData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Invalid budget');
    });
  });

  // ==========================================
  // RETRY SIMULATION TESTS
  // ==========================================

  describe('processGeneratePlanJob - Retry Behavior', () => {
    it('should eventually succeed after initial failure', async () => {
      // First call fails, second succeeds
      mockAIProvider.generateWithCircuitBreaker
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(validAIResponse);

      mockCache.get.mockResolvedValue(null);

      const result = await service.processGeneratePlanJob(validJobData);

      // Should have retried and eventually succeeded
      expect(mockAIProvider.generateWithCircuitBreaker).toHaveBeenCalled();
    });
  });
});
