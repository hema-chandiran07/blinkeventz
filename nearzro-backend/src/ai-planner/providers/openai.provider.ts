import OpenAI from 'openai';
import { Logger, OnModuleInit, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, AICircuitBreakerProvider } from '../ai-providers/ai-provider.interface';
import {
  AI_CONFIG,
  ERROR_MESSAGES,
  CIRCUIT_BREAKER_CONFIG,
  SYSTEM_PROMPT,
} from '../constants/ai-planner.constants';
import { CircuitBreaker, CircuitBreakerState } from '../utils/circuit-breaker';

/**
 * OpenAI Provider
 * 
 * Implements AIProvider interface with production-ready features:
 * - Request timeout handling
 * - Retry with exponential backoff
 * - Circuit breaker protection
 * - Graceful degradation
 * - Structured system prompts
 */
@Injectable()
export class OpenAIProvider implements AICircuitBreakerProvider, OnModuleInit {
  private readonly logger = new Logger(OpenAIProvider.name);
  private client: OpenAI | null = null;
  private isInitialized = false;
  
  // Circuit breaker for OpenAI calls
  private readonly circuitBreaker: CircuitBreaker;

  // Cost per 1K tokens (USD)
  private readonly costPer1K = {
    input: 0.00015, // gpt-4o-mini input
    output: 0.0006,  // gpt-4o-mini output
  };

  constructor(private readonly config: ConfigService) {
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker('openai', {
      failureThreshold: CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD,
      resetTimeoutSeconds: CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_SECONDS,
      successThreshold: CIRCUIT_BREAKER_CONFIG.SUCCESS_THRESHOLD,
    });
    
    // Don't call initialize() here - use OnModuleInit instead
  }

  /**
   * NestJS lifecycle hook - called after DI is complete
   */
  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  /**
   * Initialize OpenAI client with API key validation
   * Called after dependency injection is complete
   */
  private async initialize(): Promise<void> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');

    // Check if API key is properly configured
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_')) {
      this.logger.warn(
        'OPENAI_API_KEY not configured or invalid - AI features will be disabled',
      );
      this.isInitialized = false;
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: apiKey.trim(),
        maxRetries: AI_CONFIG.MAX_RETRIES,
        timeout: AI_CONFIG.TIMEOUT_MS,
      });

      // Verify API key works
      await this.client.models.list();
      
      this.isInitialized = true;
      this.logger.log('OpenAI provider initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize OpenAI provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.isInitialized = false;
    }
  }

  /**
   * Check if the provider is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'OpenAI';
  }

  /**
   * Get estimated cost per 1K tokens
   */
  getCostPer1KTokens(): number {
    return this.costPer1K.input + this.costPer1K.output;
  }

  /**
   * Get the OpenAI client safely
   * Returns null if not initialized
   */
  getClient(): OpenAI | null {
    if (!this.isInitialized) {
      this.logger.warn('OpenAI provider not initialized - check OPENAI_API_KEY');
      return null;
    }
    return this.client;
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats(): {
    state: string;
    failureCount: number;
    successCount: number;
    isAvailable: boolean;
  } {
    return this.circuitBreaker.getStats();
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen(): boolean {
    return this.circuitBreaker.getState() === CircuitBreakerState.OPEN;
  }

  /**
   * Execute AI generation with circuit breaker protection
   */
  async generateWithCircuitBreaker(prompt: string): Promise<string> {
    return this.circuitBreaker.execute(async () => {
      return this.generate(prompt);
    });
  }

  /**
   * Generate AI response with retry logic
   */
  async generate(prompt: string): Promise<string> {
    if (!this.isInitialized || !this.client) {
      throw new Error(ERROR_MESSAGES.AI_SERVICE_UNAVAILABLE);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: AI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: AI_CONFIG.TEMPERATURE,
        max_tokens: AI_CONFIG.MAX_TOKENS,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error(ERROR_MESSAGES.AI_RESPONSE_EMPTY);
      }

      return content;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Incorrect API key')) {
          this.logger.error('OpenAI API key is incorrect');
          throw new Error(ERROR_MESSAGES.AI_INVALID_KEY);
        }
        if (error.message.includes('rate limit')) {
          this.logger.warn('OpenAI rate limit exceeded');
          throw new Error(ERROR_MESSAGES.AI_RATE_LIMIT);
        }
      }
      throw error;
    }
  }

  /**
   * Estimate cost for token usage
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    return (
      (inputTokens / 1000) * this.costPer1K.input +
      (outputTokens / 1000) * this.costPer1K.output
    );
  }
}
