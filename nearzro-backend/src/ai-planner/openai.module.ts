import { Module, Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAIProvider } from './providers/openai.provider';
import { MockAIProvider } from './ai-providers/mock-ai.provider';
import { AIProvider } from './ai-providers/ai-provider.interface';

/**
 * Injection token for AI Provider
 * Used for dependency injection to allow swapping between providers
 */
export const AI_PROVIDER_TOKEN = 'AI_PROVIDER';

/**
 * AI Provider Factory
 * 
 * Factory that creates the appropriate AI provider based on configuration.
 * Waits for OpenAIProvider to complete initialization before deciding which provider to use.
 */
@Injectable()
class AIProviderFactory implements OnModuleInit {
  private readonly logger = new Logger(AIProviderFactory.name);
  private aiProvider: AIProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly openAIProvider: OpenAIProvider,
    private readonly mockAIProvider: MockAIProvider,
  ) {
    this.logger.log('🔧 AIProviderFactory constructor called');
  }

  async onModuleInit(): Promise<void> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    
    this.logger.log(`🔍 Config check - OPENAI_API_KEY: ${apiKey ? 'present' : 'MISSING'}`);
    
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_')) {
      this.logger.warn(
        '⚠️  OPENAI_API_KEY not configured or invalid!\n' +
        'Using MockAIProvider for development.'
      );
      this.aiProvider = this.mockAIProvider;
      return;
    }

    // Wait for OpenAIProvider to complete initialization
    // NestJS may run onModuleInit hooks in any order, so we poll until ready
    this.logger.log('⏳ Waiting for OpenAIProvider to initialize...');
    
    const maxWaitTime = 15000; // 15 seconds max wait
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      // Small delay between checks
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (this.openAIProvider.isAvailable()) {
        this.logger.log('✅ OpenAIProvider is available - using OpenAIProvider');
        this.aiProvider = this.openAIProvider;
        return;
      }
      
      this.logger.debug('OpenAIProvider not ready yet, waiting...');
    }
    
    // If we get here, OpenAIProvider didn't become available in time
    this.logger.warn(
      '⚠️  OpenAIProvider did not become available in time!\n' +
      'Falling back to MockAIProvider.'
    );
    this.aiProvider = this.mockAIProvider;
  }

  getAIProvider(): AIProvider {
    if (!this.aiProvider) {
      this.logger.error('❌ getAIProvider called before onModuleInit - using MockAIProvider');
      return this.mockAIProvider;
    }
    return this.aiProvider;
  }
}

/**
 * OpenAI Module
 * 
 * Centralized module for AI provider management.
 * Provides AI capabilities to other modules in the application.
 * 
 * Features:
 * - Automatic provider selection based on configuration
 * - Singleton AI client management
 * - Graceful degradation with MockAIProvider when API key is missing
 * - Circuit breaker protection (for OpenAIProvider)
 * 
 * Usage:
 * Import this module in any module that needs AI capabilities:
 * 
 * @Module({
 *   imports: [OpenAIModule],
 *   providers: [MyService],
 * })
 * export class MyModule {}
 * 
 * Then inject AIProvider in your service:
 * 
 * constructor(private readonly aiProvider: AIProvider) {}
 */
@Module({
  imports: [
    // ConfigModule is needed for AIProviderFactory to access ConfigService
    ConfigModule,
  ],
  providers: [
    // IMPORTANT: OpenAIProvider must be FIRST so its onModuleInit runs before AIProviderFactory
    OpenAIProvider,
    MockAIProvider,
    // AIProviderFactory must come AFTER OpenAIProvider to ensure proper initialization order
    AIProviderFactory,
    {
      provide: AI_PROVIDER_TOKEN,
      useFactory: (factory: AIProviderFactory) => factory.getAIProvider(),
      inject: [AIProviderFactory],
    },
  ],
  exports: [
    OpenAIProvider,
    MockAIProvider,
    AI_PROVIDER_TOKEN,
  ],
})
export class OpenAIModule {}
