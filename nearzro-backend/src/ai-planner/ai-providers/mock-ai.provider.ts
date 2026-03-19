import { Logger, Injectable } from '@nestjs/common';
import { AIProvider, AICircuitBreakerProvider } from './ai-provider.interface';
import { CircuitBreakerState } from '../utils/circuit-breaker';

/**
 * Mock AI Provider
 * 
 * Fallback provider used when OpenAI API key is not configured.
 * Provides mock responses for development/testing without requiring API key.
 * 
 * This ensures the application can start even without OpenAI API key,
 * which is useful for:
 * - Local development without API key
 * - Production environments where AI features are optional
 * - CI/CD pipelines without API keys
 * 
 * WARNING: This should only be used as a fallback. Real AI responses
 * will not be generated in this mode.
 */
@Injectable()
export class MockAIProvider implements AICircuitBreakerProvider {
  private readonly logger = new Logger(MockAIProvider.name);

  /**
   * Check if the provider is available
   * Always returns true since this is a local mock
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'MockAI';
  }

  /**
   * Get estimated cost per 1K tokens
   * Returns 0 since no API calls are made
   */
  getCostPer1KTokens(): number {
    return 0;
  }

  /**
   * Get circuit breaker state
   * Always returns CLOSED since no actual calls are made
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return CircuitBreakerState.CLOSED;
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
    return {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      isAvailable: true,
    };
  }

  /**
   * Check if circuit breaker is open
   * Always returns false for mock provider
   */
  isCircuitOpen(): boolean {
    return false;
  }

  /**
   * Execute AI generation with circuit breaker protection
   * Returns a mock response
   */
  async generateWithCircuitBreaker(prompt: string): Promise<string> {
    return this.generate(prompt);
  }

  /**
   * Generate mock AI response
   * Returns a predefined response indicating AI is not available
   */
  async generate(prompt: string): Promise<string> {
    this.logger.warn(
      'MockAI provider is active - OpenAI API key not configured. ' +
      'AI features are disabled. Please configure OPENAI_API_KEY for real AI responses.'
    );

    // Return a mock response that indicates AI is unavailable
    return JSON.stringify({
      error: 'AI_SERVICE_UNAVAILABLE',
      message: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
      mock: true,
      // Provide some basic fallback data for testing
      fallback: {
        suggestions: [
          'Please configure OPENAI_API_KEY to enable AI features',
          'You can get an API key from https://platform.openai.com/api-keys'
        ]
      }
    });
  }

  /**
   * Estimate cost for token usage
   * Returns 0 since no actual API calls are made
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    return 0;
  }
}
