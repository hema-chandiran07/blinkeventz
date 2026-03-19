import { Module } from '@nestjs/common';
import { AIChatController } from './ai-chat.controller';
import { AIChatService } from './ai-chat.service';
import { ConversationService } from './conversation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIPlannerModule } from '../ai-planner/ai-planner.module';
import { OpenAIModule } from '../ai-planner/openai.module';

/**
 * AI Chatbot Module
 * 
 * Provides conversational AI interface for event planning.
 * Integrates with ai-planner for plan generation and cart conversion.
 * 
 * Dependencies:
 * - PrismaModule: Database access
 * - AIPlannerModule: Plan generation, vendor matching, cart conversion
 */
@Module({
  imports: [
    PrismaModule,
    AIPlannerModule,  // Reuse existing AI planner services
    OpenAIModule,     // Import OpenAI provider for AIChatService
  ],
  controllers: [AIChatController],
  providers: [
    AIChatService,
    ConversationService,
  ],
  exports: [
    AIChatService,
    ConversationService,
  ],
})
export class AIChatModule {}
