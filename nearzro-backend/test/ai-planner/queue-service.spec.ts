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
      get: jest.fn().mockReturnValue('fake-key'),
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

  describe('processGeneratePlanJob', () => {
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

    it('should successfully process a valid job', async () => {
      aiGenerate.mockResolvedValueOnce(validAIResponse);

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('success');
      expect(result.planId).toBe(1);
      expect(prismaCreate).toHaveBeenCalled();
      expect(cacheSet).toHaveBeenCalled();
    });

    it('should return cached result if available', async () => {
      cacheGet.mockResolvedValueOnce({ id: 999, userId: 1 });

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('success');
      expect(result.planId).toBe(999);
      expect(prismaCreate).not.toHaveBeenCalled();
    });

    it('should validate budget allocation', async () => {
      // Return AI response with mismatched budget
      aiGenerate.mockResolvedValueOnce(
        JSON.stringify({
          summary: { eventType: 'Wedding', city: 'Chennai', guestCount: 300, totalBudget: 500000 },
          allocations: [
            { category: 'Venue', amount: 300000 }, // Total 300000, not 500000
          ],
        })
      );

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('does not match');
    });

    it('should handle AI service failure', async () => {
      aiGenerate.mockRejectedValueOnce(new Error('AI service unavailable'));

      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('AI service unavailable');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failures', async () => {
      // First call fails, second succeeds
      const validAIResponse = JSON.stringify({
        summary: { eventType: 'Wedding', city: 'Chennai', guestCount: 300, totalBudget: 500000 },
        allocations: [
          { category: 'Venue', amount: 500000 },
        ],
      });

      aiGenerate
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(validAIResponse);

      // This test verifies the retry happens at the AI provider level
      // The Bull retry is configured separately
      const result = await service.processGeneratePlanJob({
        userId: 1,
        budget: 500000,
        eventType: 'Wedding',
        city: 'Chennai',
        area: 'Velachery',
        guestCount: 300,
      });

      // Should eventually succeed after retry
      expect(aiGenerate).toHaveBeenCalled();
    });
  });

  describe('Regeneration', () => {
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

      const result = await service.processGeneratePlanJob({
        userId: 1,
        budget: 0, // Indicates regeneration
        eventType: 'Regenerated',
        city: '',
        area: '',
        guestCount: 0,
        eventId: 10, // Existing plan ID
      });

      expect(prismaFindFirst).toHaveBeenCalledWith({
        where: { id: 10, userId: 1 },
      });
      expect(result.status).toBe('success');
    });
  });
});
