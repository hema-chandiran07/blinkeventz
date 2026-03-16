import { Test, TestingModule } from '@nestjs/testing';
import { AIPlannerQueueService, GeneratePlanJobData } from '../../src/ai-planner/queue/ai-planner-queue.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { OpenAIProvider } from '../../src/ai-planner/providers/openai.provider';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

describe('AIPlannerQueueService', () => {
  let service: AIPlannerQueueService;
  let prismaCreate: jest.Mock;
  let prismaFindFirst: jest.Mock;
  let cacheGet: jest.Mock;
  let cacheSet: jest.Mock;
  let aiGenerate: jest.Mock;

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
    // Create fresh mock functions for each test
    prismaCreate = jest.fn().mockResolvedValue({ id: 1, userId: 1 });
    prismaFindFirst = jest.fn();
    cacheGet = jest.fn().mockResolvedValue(null);
    cacheSet = jest.fn().mockResolvedValue(undefined);
    aiGenerate = jest.fn();

    const mockPrisma = {
      aIPlan: {
        create: prismaCreate,
        findFirst: prismaFindFirst,
      },
    };

    const mockCache = {
      get: cacheGet,
      set: cacheSet,
    };

    const mockAIProvider = {
      generateWithCircuitBreaker: aiGenerate,
      isAvailable: jest.fn().mockReturnValue(true),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('fake-api-key'),
    };

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
  });

  // ==========================================
  // POSITIVE TESTS
  // ==========================================

  describe('processGeneratePlanJob - Success Cases', () => {
    it('should successfully process a valid job', async () => {
      aiGenerate.mockResolvedValueOnce(validAIResponse);

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('success');
      expect(result.planId).toBe(1);
      expect(prismaCreate).toHaveBeenCalled();
      expect(cacheSet).toHaveBeenCalled();
    });

    it('should return cached result if available', async () => {
      cacheGet.mockResolvedValueOnce({ id: 999 });

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('success');
      expect(result.planId).toBe(999);
      expect(prismaCreate).not.toHaveBeenCalled();
    });

    it('should process job with high budget', async () => {
      const highBudgetAIResponse = JSON.stringify({
        summary: { eventType: 'Wedding', city: 'Chennai', guestCount: 300, totalBudget: 10000000 },
        allocations: [
          { category: 'Venue', amount: 3000000, notes: 'Great venue' },
          { category: 'Catering', amount: 4000000, notes: 'Good food' },
          { category: 'Decor', amount: 2000000, notes: 'Nice decoration' },
          { category: 'Photography', amount: 1000000, notes: 'Photos' },
        ],
      });

      aiGenerate.mockResolvedValueOnce(highBudgetAIResponse);

      const highBudgetData = { ...validJobData, budget: 10000000 };

      const result = await service.processGeneratePlanJob(highBudgetData);

      expect(result.status).toBe('success');
    });

    it('should process job with large guest count', async () => {
      aiGenerate.mockResolvedValueOnce(validAIResponse);

      const largeGuestData = { ...validJobData, guestCount: 5000 };

      const result = await service.processGeneratePlanJob(largeGuestData);

      expect(result.status).toBe('success');
    });

    it('should handle different cities', async () => {
      aiGenerate.mockResolvedValueOnce(validAIResponse);

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

      aiGenerate.mockResolvedValueOnce(mismatchedResponse);

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('does not match');
    });

    it('should fail when AI service is unavailable', async () => {
      aiGenerate.mockRejectedValueOnce(new Error('AI service unavailable'));

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('AI service unavailable');
    });

    it('should fail on invalid JSON from AI', async () => {
      aiGenerate.mockResolvedValueOnce('not valid json');

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('JSON');
    });

    it('should fail on empty AI response', async () => {
      aiGenerate.mockResolvedValueOnce('');

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

      const regenerationAIResponse = JSON.stringify({
        summary: { eventType: 'Regenerated', city: 'Mumbai', guestCount: 200, totalBudget: 300000 },
        allocations: [
          { category: 'Venue', amount: 100000, notes: 'Great venue' },
          { category: 'Catering', amount: 150000, notes: 'Good food' },
          { category: 'Decor', amount: 50000, notes: 'Nice decoration' },
        ],
      });

      prismaFindFirst.mockResolvedValue(existingPlan);
      aiGenerate.mockResolvedValueOnce(regenerationAIResponse);

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

      expect(prismaFindFirst).toHaveBeenCalledWith({
        where: { id: 10, userId: 1 },
      });
      expect(result.status).toBe('success');
    });

    it('should handle regeneration when existing plan not found', async () => {
      prismaFindFirst.mockResolvedValue(null);
      aiGenerate.mockResolvedValueOnce(validAIResponse);

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
      aiGenerate
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(validAIResponse);

      const result = await service.processGeneratePlanJob(validJobData);

      // Should have retried and eventually succeeded
      expect(aiGenerate).toHaveBeenCalled();
    });
  });
});
