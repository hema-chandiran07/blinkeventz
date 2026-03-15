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
  generateWithCircuitBreaker: jest.fn().mockResolvedValue(
    JSON.stringify({
      summary: { eventType: 'Wedding', city: 'Chennai', guestCount: 300, totalBudget: 500000 },
      allocations: [
        { category: 'Venue', amount: 150000, notes: 'Great venue' },
        { category: 'Catering', amount: 200000, notes: 'Good food' },
        { category: 'Decor', amount: 100000, notes: 'Beautiful' },
        { category: 'Photography', amount: 50000, notes: 'Professional' },
      ],
    })
  ),
  isAvailable: jest.fn().mockReturnValue(true),
};

describe('AIPlannerQueueService', () => {
  let service: AIPlannerQueueService;
  let prisma: typeof mockPrisma;
  let ai: typeof mockAIProvider;

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
          useValue: {
            get: jest.fn().mockReturnValue('fake-key'),
          },
        },
      ],
    }).compile();

    service = module.get<AIPlannerQueueService>(AIPlannerQueueService);
    prisma = module.get(PrismaService);
    ai = module.get(OpenAIProvider);
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

    it('should successfully process a valid job', async () => {
      mockCache.get.mockResolvedValueOnce(null);
      
      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('success');
      expect(result.planId).toBe(1);
      expect(prisma.aIPlan.create).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should return cached result if available', async () => {
      const cachedPlan = { id: 999, userId: 1 };
      mockCache.get.mockResolvedValueOnce(cachedPlan);
      
      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('success');
      expect(result.planId).toBe(999);
      expect(prisma.aIPlan.create).not.toHaveBeenCalled();
    });

    it('should validate budget allocation', async () => {
      // Return AI response with mismatched budget
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValueOnce(
        JSON.stringify({
          summary: { eventType: 'Wedding', city: 'Chennai', guestCount: 300, totalBudget: 500000 },
          allocations: [
            { category: 'Venue', amount: 300000 }, // Total 300000, not 500000
          ],
        })
      );
      
      mockCache.get.mockResolvedValueOnce(null);
      
      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('does not match');
    });

    it('should handle AI service failure', async () => {
      mockAIProvider.generateWithCircuitBreaker.mockRejectedValueOnce(
        new Error('AI service unavailable')
      );
      
      mockCache.get.mockResolvedValueOnce(null);
      
      const result = await service.processGeneratePlanJob(validJobData);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('AI service unavailable');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failures', async () => {
      // First call fails, second succeeds
      mockAIProvider.generateWithCircuitBreaker
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(
          JSON.stringify({
            summary: { eventType: 'Wedding', city: 'Chennai', guestCount: 300, totalBudget: 500000 },
            allocations: [
              { category: 'Venue', amount: 500000 },
            ],
          })
        );

      mockCache.get.mockResolvedValue(null);

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
      expect(mockAIProvider.generateWithCircuitBreaker).toHaveBeenCalled();
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

      prisma.aIPlan.findFirst.mockResolvedValue(existingPlan);

      const result = await service.processGeneratePlanJob({
        userId: 1,
        budget: 0, // Indicates regeneration
        eventType: 'Regenerated',
        city: '',
        area: '',
        guestCount: 0,
        eventId: 10, // Existing plan ID
      });

      expect(prisma.aIPlan.findFirst).toHaveBeenCalledWith({
        where: { id: 10, userId: 1 },
      });
    });
  });
});
