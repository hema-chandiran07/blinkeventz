import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, AIProviderType, AIResponse } from './ai-provider.interface';
import { OpenAIProvider } from '../providers/openai.provider';

/**
 * AI Provider Factory
 * 
 * Manages multiple AI providers with automatic fallback.
 * Priority: OpenAI -> Anthropic -> Gemini
 */
@Injectable()
export class AIProviderFactory {
  private readonly logger = new Logger(AIProviderFactory.name);
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private primaryProvider: AIProviderType = AIProviderType.OPENAI;

  constructor(
    private readonly config: ConfigService,
    private readonly openAIProvider: OpenAIProvider,
  ) {
    this.initializeProviders();
  }

  /**
   * Initialize all available providers
   */
  private initializeProviders(): void {
    // Register OpenAI (primary)
    this.providers.set(AIProviderType.OPENAI, this.openAIProvider);

    // TODO: Register Anthropic when API key is configured
    // const anthropicKey = this.config.get('ANTHROPIC_API_KEY');
    // if (anthropicKey) {
    //   this.providers.set(AIProviderType.ANTHROPIC, new AnthropicProvider(anthropicKey));
    // }

    // TODO: Register Gemini when API key is configured
    // const geminiKey = this.config.get('GEMINI_API_KEY');
    // if (geminiKey) {
    //   this.providers.set(AIProviderType.GEMINI, new GeminiProvider(geminiKey));
    // }

    this.logger.log(`AI Providers initialized: ${Array.from(this.providers.keys()).join(', ')}`);
  }

  /**
   * Get the best available provider
   */
  getProvider(type?: AIProviderType): AIProvider {
    if (type && this.providers.has(type)) {
      return this.providers.get(type)!;
    }

    // Return primary provider if available
    const primary = this.providers.get(this.primaryProvider);
    if (primary?.isAvailable()) {
      return primary;
    }

    // Fallback to any available provider
    for (const [providerType, provider] of this.providers) {
      if (provider.isAvailable()) {
        this.logger.warn(`Primary provider unavailable, using fallback: ${providerType}`);
        return provider;
      }
    }

    throw new Error('No AI provider available');
  }

  /**
   * Generate with automatic fallback
   */
  async generateWithFallback(prompt: string): Promise<AIResponse> {
    const providers = [
      AIProviderType.OPENAI,
      AIProviderType.ANTHROPIC,
      AIProviderType.GEMINI,
    ];

    let lastError: Error | null = null;

    for (const providerType of providers) {
      const provider = this.providers.get(providerType);
      
      if (!provider || !provider.isAvailable()) {
        continue;
      }

      try {
        this.logger.debug(`Trying AI provider: ${providerType}`);
        
        const content = await provider.generate(prompt);
        
        // Calculate cost (rough estimate)
        const tokensUsed = Math.ceil(content.length / 4); // Rough estimate
        const cost = (tokensUsed / 1000) * provider.getCostPer1KTokens();

        return {
          content,
          provider: providerType,
          tokensUsed,
          cost,
        };
      } catch (error) {
        this.logger.warn(`Provider ${providerType} failed: ${error}`);
        lastError = error as Error;
        continue;
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): AIProviderType[] {
    const available: AIProviderType[] = [];
    
    for (const [type, provider] of this.providers) {
      if (provider.isAvailable()) {
        available.push(type);
      }
    }

    return available;
  }

  /**
   * Set primary provider
   */
  setPrimaryProvider(type: AIProviderType): void {
    if (!this.providers.has(type)) {
      throw new Error(`Provider ${type} not available`);
    }
    this.primaryProvider = type;
    this.logger.log(`Primary AI provider set to: ${type}`);
  }
}
