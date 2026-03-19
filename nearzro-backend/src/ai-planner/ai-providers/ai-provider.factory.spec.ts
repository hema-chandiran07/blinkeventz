import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIProviderFactory } from './ai-provider.factory';
import { OpenAIProvider } from '../providers/openai.provider';
import { MockAIProvider } from './mock-ai.provider';
import { AIProviderType } from './ai-provider.interface';

/**
 * AIProviderFactory Unit Tests - PROPERLY FIXED
 * 
 * The factory uses the injected OpenAIProvider via constructor.
 * We need to properly spy on the instance methods.
 */

describe('AIProviderFactory', () => {
  let factory: AIProviderFactory;
  let openAIProvider: OpenAIProvider;
  let mockAIProvider: MockAIProvider;
  let configService: ConfigService;

  // Create spy objects
  let openAIProviderSpy: {
    generate: jest.Mock;
    isAvailable: jest.Mock;
    getProviderName: jest.Mock;
    getCostPer1KTokens: jest.Mock;
    isCircuitOpen: jest.Mock;
    getCircuitBreakerStats: jest.Mock;
  };

  let mockAIProviderSpy: {
    generate: jest.Mock;
    isAvailable: jest.Mock;
    getProviderName: jest.Mock;
    getCostPer1KTokens: jest.Mock;
    generateWithCircuitBreaker: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create spy functions
    openAIProviderSpy = {
      generate: jest.fn().mockResolvedValue('AI response content'),
      isAvailable: jest.fn().mockReturnValue(true),
      getProviderName: jest.fn().mockReturnValue('OpenAI'),
      getCostPer1KTokens: jest.fn().mockReturnValue(0.00075),
      isCircuitOpen: jest.fn().mockReturnValue(false),
      getCircuitBreakerStats: jest.fn().mockReturnValue({
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        isAvailable: true,
      }),
    };

    mockAIProviderSpy = {
      generate: jest.fn().mockResolvedValue('Mock response'),
      isAvailable: jest.fn().mockReturnValue(true),
      getProviderName: jest.fn().mockReturnValue('MockAI'),
      getCostPer1KTokens: jest.fn().mockReturnValue(0),
      generateWithCircuitBreaker: jest.fn().mockResolvedValue('Mock with CB'),
    };

    // Create mock instances with spy methods
    openAIProvider = {
      ...openAIProviderSpy,
    } as unknown as OpenAIProvider;

    mockAIProvider = {
      ...mockAIProviderSpy,
    } as unknown as MockAIProvider;

    configService = {
      get: jest.fn().mockReturnValue('fake-api-key'),
    } as unknown as ConfigService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIProviderFactory,
        { provide: OpenAIProvider, useValue: openAIProvider },
        { provide: MockAIProvider, useValue: mockAIProvider },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    factory = module.get<AIProviderFactory>(AIProviderFactory);
  });

  describe('Module Setup', () => {
    it('should be defined', () => {
      expect(factory).toBeDefined();
    });
  });

  describe('getProvider() - POSITIVE Cases', () => {
    it('should return OpenAIProvider when available', () => {
      const provider = factory.getProvider();
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('OpenAI');
    });

    it('should return requested provider type if specified', () => {
      const provider = factory.getProvider(AIProviderType.OPENAI);
      expect(provider).toBeDefined();
      expect(provider.isAvailable()).toBe(true);
    });

    it('should fallback to any available provider when primary unavailable', () => {
      openAIProviderSpy.isAvailable.mockReturnValueOnce(false);
      const provider = factory.getProvider();
      expect(provider).toBeDefined();
    });
  });

  describe('getProvider() - NEGATIVE Cases', () => {
    it('should throw when no providers available', () => {
      openAIProviderSpy.isAvailable.mockReturnValue(false);
      expect(() => factory.getProvider()).toThrow('No AI provider available');
    });
  });

  describe('generateWithFallback() - POSITIVE Cases', () => {
    it('should generate with primary provider', async () => {
      const result = await factory.generateWithFallback('Test prompt');
      
      expect(result).toBeDefined();
      expect(result.content).toBe('AI response content');
      expect(openAIProviderSpy.generate).toHaveBeenCalledWith('Test prompt');
    });

    it('should include correct provider info in response', async () => {
      const result = await factory.generateWithFallback('Test');
      
      expect(result.provider).toBe(AIProviderType.OPENAI);
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(typeof result.cost).toBe('number');
    });

    it('should calculate cost correctly', async () => {
      const result = await factory.generateWithFallback('Test prompt');
      
      // "AI response content" = 19 chars, 19/4 = 4.75 -> ceil = 5 tokens
      // cost = (5/1000) * 0.00075 = 0.00000375
      expect(result.tokensUsed).toBe(5);
      expect(result.cost).toBeCloseTo(0.00000375, 10);
    });
  });

  describe('generateWithFallback() - NEGATIVE Cases', () => {
    it('should throw when provider fails', async () => {
      openAIProviderSpy.generate.mockRejectedValueOnce(new Error('OpenAI API error'));
      
      await expect(factory.generateWithFallback('Test prompt')).rejects.toThrow();
    });
  });

  describe('getAvailableProviders()', () => {
    it('should return list of available providers', () => {
      const providers = factory.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toContain(AIProviderType.OPENAI);
    });

    it('should return empty list when no providers available', () => {
      openAIProviderSpy.isAvailable.mockReturnValue(false);
      const providers = factory.getAvailableProviders();
      expect(providers).toEqual([]);
    });
  });

  describe('setPrimaryProvider()', () => {
    it('should set primary provider', () => {
      expect(() => factory.setPrimaryProvider(AIProviderType.OPENAI)).not.toThrow();
    });

    it('should throw when setting unavailable provider', () => {
      expect(() => factory.setPrimaryProvider(AIProviderType.ANTHROPIC)).toThrow();
    });
  });
});
