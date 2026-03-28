import { Test, TestingModule } from '@nestjs/testing';
import { AIPlannerQueueService, GeneratePlanJobData, GeneratePlanJobResult } from './ai-planner-queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAIProvider } from '../providers/openai.provider';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER_TOKEN } from '../openai.module';

// Mock data for AI plan generation
const mockAIPlanResponse = {
  summary: {
    eventType: 'Wedding',
    city: 'Mumbai',
    guestCount: 100,
    totalBudget: 100000,
  },
  allocations: [
    { category: 'Venue', amount: 30000, notes: 'Grand ballroom' },
    { category: 'Catering', amount: 40000, notes: 'Per plate vegetarian' },
    { category: 'Decor', amount: 15000, notes: 'Flowers and lights' },
    { category: 'Photography', amount: 10000, notes: 'Full day coverage' },
    { category: 'Miscellaneous', amount: 5000, notes: 'Contingency' },
  ],
};

describe('AIPlannerQueueService', () => {
  let service: AIPlannerQueueService;
  let prisma: any;
  let aiProvider: any;
  let cache: any;

  // Mock PrismaService
  const mockPrisma = {
    aIPlan: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  // Mock Cache
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  // Mock OpenAI Provider
  const mockAIProvider = {
    generateWithCircuitBreaker: jest.fn(),
    isAvailable: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIPlannerQueueService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AI_PROVIDER_TOKEN,
          useValue: mockAIProvider,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<AIPlannerQueueService>(AIPlannerQueueService);
    prisma = module.get(PrismaService);
    aiProvider = module.get(AI_PROVIDER_TOKEN);
    cache = module.get(CACHE_MANAGER);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have PrismaService injected', () => {
      expect(prisma).toBeDefined();
    });

    it('should have OpenAIProvider injected', () => {
      expect(aiProvider).toBeDefined();
    });

    it('should have cache injected', () => {
      expect(cache).toBeDefined();
    });
  });

  describe('processGeneratePlanJob() - Success Cases', () => {
    /**
     * Test: should successfully process a valid job
     * Validates that the service correctly processes a valid AI plan generation job
     */
    it('should successfully process a valid job', async () => {
      // Arrange
      const jobData: GeneratePlanJobData = {
        userId: 1,
        budget: 100000,
        eventType: 'Wedding',
        city: 'Mumbai',
        area: 'Bandra',
        guestCount: 100,
      };

      // Mock cache miss
      mockCache.get.mockResolvedValue(null);

      // Mock AI provider response
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValue(
        JSON.stringify(mockAIPlanResponse),
      );

      // Mock database creation
      mockPrisma.aIPlan.create.mockResolvedValue({
        id: 1,
        userId: 1,
        budget: 100000,
        city: 'Mumbai',
        area: 'Bandra',
        guestCount: 100,
        planJson: mockAIPlanResponse,
      });

      // Mock cache set
      mockCache.set.mockResolvedValue(true);

      // Act
      const result = await service.processGeneratePlanJob(jobData);

      // Assert
      expect(result).toEqual({
        planId: 1,
        status: 'success',
      });
      expect(prisma.aIPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          budget: 100000,
          city: 'Mumbai',
          area: 'Bandra',
          guestCount: 100,
        }),
      });
      expect(cache.set).toHaveBeenCalled();
    });

    /**
     * Test: should process job with high budget
     * Validates handling of high budget plans
     */
    it('should process job with high budget', async () => {
      // Arrange
      const jobData: GeneratePlanJobData = {
        userId: 1,
        budget: 5000000, // 50 Lakhs
        eventType: 'Wedding',
        city: 'Delhi',
        area: 'Nehru Place',
        guestCount: 500,
      };

      const highBudgetResponse = {
        ...mockAIPlanResponse,
        summary: {
          eventType: 'Wedding',
          city: 'Delhi',
          guestCount: 500,
          totalBudget: 5000000,
        },
        allocations: [
          { category: 'Venue', amount: 1500000 },
          { category: 'Catering', amount: 2000000 },
          { category: 'Decor', amount: 750000 },
          { category: 'Photography', amount: 500000 },
          { category: 'Miscellaneous', amount: 250000 },
        ],
      };

      mockCache.get.mockResolvedValue(null);
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValue(
        JSON.stringify(highBudgetResponse),
      );
      mockPrisma.aIPlan.create.mockResolvedValue({
        id: 2,
        ...jobData,
        planJson: highBudgetResponse,
      });
      mockCache.set.mockResolvedValue(true);

      // Act
      const result = await service.processGeneratePlanJob(jobData);

      // Assert
      expect(result.status).toBe('success');
      expect(result.planId).toBe(2);
      expect(prisma.aIPlan.create).toHaveBeenCalled();
    });

    /**
     * Test: should process job with large guest count
     * Validates handling of large guest counts
     */
    it('should process job with large guest count', async () => {
      // Arrange
      const jobData: GeneratePlanJobData = {
        userId: 1,
        budget: 200000,
        eventType: 'Corporate Event',
        city: 'Bangalore',
        area: 'Whitefield',
        guestCount: 1000,
      };

      const largeGuestResponse = {
        summary: {
          eventType: 'Corporate Event',
          city: 'Bangalore',
          guestCount: 1000,
          totalBudget: 200000,
        },
        allocations: [
          { category: 'Venue', amount: 80000 },
          { category: 'Catering', amount: 80000 },
          { category: 'Decor', amount: 20000 },
          { category: 'Photography', amount: 10000 },
          { category: 'Miscellaneous', amount: 10000 },
        ],
      };

      mockCache.get.mockResolvedValue(null);
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValue(
        JSON.stringify(largeGuestResponse),
      );
      mockPrisma.aIPlan.create.mockResolvedValue({
        id: 3,
        ...jobData,
        planJson: largeGuestResponse,
      });
      mockCache.set.mockResolvedValue(true);

      // Act
      const result = await service.processGeneratePlanJob(jobData);

      // Assert
      expect(result.status).toBe('success');
      expect(result.planId).toBe(3);
    });

    /**
     * Test: should handle different cities
     * Validates that city-specific processing works correctly
     */
    it('should handle different cities', async () => {
      // Arrange
      const jobData: GeneratePlanJobData = {
        userId: 1,
        budget: 150000,
        eventType: 'Birthday Party',
        city: 'Chennai',
        area: 'T Nagar',
        guestCount: 50,
      };

      const chennaiResponse = {
        summary: {
          eventType: 'Birthday Party',
          city: 'Chennai',
          guestCount: 50,
          totalBudget: 150000,
        },
        allocations: [
          { category: 'Venue', amount: 45000 },
          { category: 'Catering', amount: 60000 },
          { category: 'Decor', amount: 25000 },
          { category: 'Photography', amount: 15000 },
          { category: 'Miscellaneous', amount: 5000 },
        ],
      };

      mockCache.get.mockResolvedValue(null);
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValue(
        JSON.stringify(chennaiResponse),
      );
      mockPrisma.aIPlan.create.mockResolvedValue({
        id: 4,
        ...jobData,
        planJson: chennaiResponse,
      });
      mockCache.set.mockResolvedValue(true);

      // Act
      const result = await service.processGeneratePlanJob(jobData);

      // Assert
      expect(result.status).toBe('success');
      expect(result.planId).toBe(4);
      expect(prisma.aIPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            city: 'Chennai',
            budget: 150000,
          }),
        }),
      );
    });

    /**
     * Test: should return cached result if available
     * Validates cache hit functionality
     */
    it('should return cached result if available', async () => {
      // Arrange
      const jobData: GeneratePlanJobData = {
        userId: 1,
        budget: 100000,
        eventType: 'Wedding',
        city: 'Mumbai',
        area: 'Bandra',
        guestCount: 100,
      };

      // Mock cache hit
      mockCache.get.mockResolvedValue({ id: 99 });

      // Act
      const result = await service.processGeneratePlanJob(jobData);

      // Assert
      expect(result).toEqual({
        planId: 99,
        status: 'success',
      });
      // Should not call AI or database
      expect(aiProvider.generateWithCircuitBreaker).not.toHaveBeenCalled();
      expect(prisma.aIPlan.create).not.toHaveBeenCalled();
    });
  });

  describe('processGeneratePlanJob() - Negative Test Cases', () => {
    /**
     * Test: should handle AI service failure
     * Validates error handling when AI service fails
     */
    it('should handle AI service failure', async () => {
      // Arrange
      const jobData: GeneratePlanJobData = {
        userId: 1,
        budget: 100000,
        eventType: 'Wedding',
        city: 'Mumbai',
        area: 'Bandra',
        guestCount: 100,
      };

      mockCache.get.mockResolvedValue(null);
      mockAIProvider.generateWithCircuitBreaker.mockRejectedValue(
        new Error('AI service unavailable'),
      );

      // Act
      const result = await service.processGeneratePlanJob(jobData);

      // Assert
      expect(result.status).toBe('failed');
      expect(result.error).toBe('AI service unavailable');
      expect(prisma.aIPlan.create).not.toHaveBeenCalled();
    });

    /**
     * Test: should handle invalid JSON response
     * Validates error handling for malformed AI responses
     */
    it('should handle invalid JSON response', async () => {
      // Arrange
      const jobData: GeneratePlanJobData = {
        userId: 1,
        budget: 100000,
        eventType: 'Wedding',
        city: 'Mumbai',
        area: 'Bandra',
        guestCount: 100,
      };

      mockCache.get.mockResolvedValue(null);
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValue('invalid json response');

      // Act
      const result = await service.processGeneratePlanJob(jobData);

      // Assert
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });

    /**
     * Test: should handle database creation failure
     * Validates error handling when database operation fails
     */
    it('should handle database creation failure', async () => {
      // Arrange
      const jobData: GeneratePlanJobData = {
        userId: 1,
        budget: 100000,
        eventType: 'Wedding',
        city: 'Mumbai',
        area: 'Bandra',
        guestCount: 100,
      };

      mockCache.get.mockResolvedValue(null);
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValue(
        JSON.stringify(mockAIPlanResponse),
      );
      mockPrisma.aIPlan.create.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act
      const result = await service.processGeneratePlanJob(jobData);

      // Assert
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('processGeneratePlanJob() - Edge Cases', () => {
    /**
     * Test: should handle budget allocation mismatch
     * Validates budget validation logic
     */
    it('should handle budget allocation mismatch', async () => {
      // Arrange
      const jobData: GeneratePlanJobData = {
        userId: 1,
        budget: 100000,
        eventType: 'Wedding',
        city: 'Mumbai',
        area: 'Bandra',
        guestCount: 100,
      };

      // AI returns allocations that don't match the budget
      const mismatchedResponse = {
        summary: {
          eventType: 'Wedding',
          city: 'Mumbai',
          guestCount: 100,
          totalBudget: 100000,
        },
        allocations: [
          { category: 'Venue', amount: 50000 },
          { category: 'Catering', amount: 100000 }, // Too high!
        ],
      };

      mockCache.get.mockResolvedValue(null);
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValue(
        JSON.stringify(mismatchedResponse),
      );

      // Act
      const result = await service.processGeneratePlanJob(jobData);

      // Assert
      expect(result.status).toBe('failed');
      expect(result.error).toContain('budget');
    });

    /**
     * Test: should handle minimum budget
     * Validates handling of minimum budget values
     */
    it('should handle minimum budget', async () => {
      // Arrange
      const jobData: GeneratePlanJobData = {
        userId: 1,
        budget: 1000, // Minimum budget
        eventType: 'Small Gathering',
        city: 'Pune',
        area: 'Koregaon Park',
        guestCount: 10,
      };

      const minBudgetResponse = {
        summary: {
          eventType: 'Small Gathering',
          city: 'Pune',
          guestCount: 10,
          totalBudget: 1000,
        },
        allocations: [
          { category: 'Venue', amount: 300 },
          { category: 'Catering', amount: 400 },
          { category: 'Decor', amount: 200 },
          { category: 'Miscellaneous', amount: 100 },
        ],
      };

      mockCache.get.mockResolvedValue(null);
      mockAIProvider.generateWithCircuitBreaker.mockResolvedValue(
        JSON.stringify(minBudgetResponse),
      );
      mockPrisma.aIPlan.create.mockResolvedValue({
        id: 5,
        ...jobData,
        planJson: minBudgetResponse,
      });
      mockCache.set.mockResolvedValue(true);

      // Act
      const result = await service.processGeneratePlanJob(jobData);

      // Assert
      expect(result.status).toBe('success');
      expect(result.planId).toBe(5);
    });
  });
});
