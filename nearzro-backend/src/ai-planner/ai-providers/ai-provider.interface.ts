/**
 * AI Provider Interface
 * 
 * Defines the contract for AI providers.
 * Supports multiple AI backends (OpenAI, Anthropic, Gemini).
 */
export interface AIProvider {
  /**
   * Generate AI response from prompt
   */
  generate(prompt: string): Promise<string>;

  /**
   * Check if provider is available
   */
  isAvailable(): boolean;

  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Get estimated cost per 1K tokens
   */
  getCostPer1KTokens(): number;
  
  /**
   * Check if circuit breaker allows requests (optional - for backward compatibility)
   */
  isCircuitOpen?(): boolean;
}

/**
 * AI Provider Types
 */
export enum AIProviderType {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GEMINI = 'GEMINI',
}

/**
 * AI Request options
 */
export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * AI Response
 */
export interface AIResponse {
  content: string;
  provider: AIProviderType;
  tokensUsed: number;
  cost: number;
}

/**
 * AI Provider with Circuit Breaker Support
 */
export interface AICircuitBreakerProvider extends AIProvider {
  /**
   * Execute with circuit breaker protection
   */
  generateWithCircuitBreaker(prompt: string): Promise<string>;
  
  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats(): {
    state: string;
    failureCount: number;
    successCount: number;
    isAvailable: boolean;
  };
}
