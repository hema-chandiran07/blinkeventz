import { Injectable, Logger } from '@nestjs/common';
import { AIProvider, AICircuitBreakerProvider } from './ai-provider.interface';
import { OpenAIProvider } from '../providers/openai.provider';
import { MockAIProvider } from './mock-ai.provider';
import { CircuitBreakerState } from '../utils/circuit-breaker';

/**
 * Lazy AI Provider Proxy
 * 
 * This proxy resolves the provider at runtime rather than at DI initialization time,
 * completely bypassing the startup race condition where OpenAIProvider.onModuleInit()
 * hasn't finished validating the API key yet.
 * 
 * The proxy evaluates which provider to use at the EXACT moment a method is called,
 * allowing automatic hot-swapping from Mock to Live providers.
 */
@Injectable()
export class LazyAIProvider implements AICircuitBreakerProvider {
  private readonly logger = new Logger(LazyAIProvider.name);

  constructor(
    private readonly openAIProvider: OpenAIProvider,
    private readonly mockProvider: MockAIProvider,
  ) {
    this.logger.log('LazyAIProvider initialized - provider resolution deferred to runtime');
  }

  /**
   * Evaluates which provider to use at the EXACT moment a method is called.
   * This allows automatic hot-swapping from Mock to Live.
   */
  private getActiveProvider(): AICircuitBreakerProvider {
    if (this.openAIProvider.isAvailable()) {
      return this.openAIProvider as AICircuitBreakerProvider;
    }
    return this.mockProvider as AICircuitBreakerProvider;
  }

  // --- Delegate all interface methods to the active provider ---

  async generate(prompt: string): Promise<string> {
    return this.getActiveProvider().generate(prompt);
  }

  isAvailable(): boolean {
    return this.getActiveProvider().isAvailable();
  }

  getProviderName(): string {
    return this.getActiveProvider().getProviderName();
  }

  getCostPer1KTokens(): number {
    return this.getActiveProvider().getCostPer1KTokens();
  }

  // --- AICircuitBreakerProvider methods ---

  async generateWithCircuitBreaker(prompt: string): Promise<string> {
    return this.getActiveProvider().generateWithCircuitBreaker(prompt);
  }

  getCircuitBreakerStats(): {
    state: string;
    failureCount: number;
    successCount: number;
    isAvailable: boolean;
  } {
    return this.getActiveProvider().getCircuitBreakerStats();
  }

  getCircuitBreakerState(): CircuitBreakerState {
    // Cast to any to access provider-specific method not in interface
    const provider = this.getActiveProvider() as any;
    if (provider.getCircuitBreakerState) {
      return provider.getCircuitBreakerState();
    }
    return CircuitBreakerState.CLOSED;
  }

  isCircuitOpen(): boolean {
    const provider = this.getActiveProvider() as any;
    if (provider.isCircuitOpen) {
      return provider.isCircuitOpen();
    }
    return false;
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const provider = this.getActiveProvider() as any;
    if (provider.estimateCost) {
      return provider.estimateCost(inputTokens, outputTokens);
    }
    return 0;
  }
}
