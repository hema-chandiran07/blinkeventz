import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConversationService } from './conversation.service';
import type { AIProvider } from '../ai-planner/ai-providers/ai-provider.interface';
import { AI_PROVIDER_TOKEN } from '../ai-planner/openai.module';
import { AIPlannerQueue } from '../ai-planner/queue/ai-planner.queue';
import { AIPlannerService } from '../ai-planner/ai-planner.service';
import { InputSanitizer } from '../ai-planner/utils/input-sanitizer';
import {
  ConversationState,
  ConversationIntent,
  isStateComplete,
  getMissingFields,
  toFrontendStatus,
} from './types/conversation-state.type';
import {
  EntityExtractionResult,
  buildEntityExtractionPrompt,
} from './prompts/entity-extraction.prompt';
import {
  buildResponseGenerationPrompt,
} from './prompts/response-generation.prompt';
import { cleanAndParseJSON } from '../ai-planner/utils/json-cleaner';
import { DemoChatResponseDto } from './dto/chat-message.dto';

/**
 * Sanitize tempState from guest users - NEVER trust client input directly
 */
function sanitizeState(state: any): ConversationState {
  if (!state || typeof state !== 'object') {
    return {};
  }
  
  return {
    budget: typeof state.budget === 'number' && state.budget > 0 && state.budget <= 100000000 
      ? state.budget 
      : undefined,
    guestCount: typeof state.guestCount === 'number' && state.guestCount > 0 && state.guestCount <= 10000 
      ? state.guestCount 
      : undefined,
    city: typeof state.city === 'string' && state.city.length > 0 && state.city.length <= 50 
      ? state.city.trim() 
      : undefined,
    area: typeof state.area === 'string' && state.area.length > 0 && state.area.length <= 50 
      ? state.area.trim() 
      : undefined,
    eventType: typeof state.eventType === 'string' && state.eventType.length > 0 && state.eventType.length <= 100 
      ? state.eventType.trim() 
      : undefined,
    preferences: state.preferences && typeof state.preferences === 'object' 
      ? {
          exclude: Array.isArray(state.preferences.exclude) 
            ? state.preferences.exclude.filter((item: any) => typeof item === 'string').slice(0, 10)
            : undefined,
          priority: Array.isArray(state.preferences.priority) 
            ? state.preferences.priority.filter((item: any) => typeof item === 'string').slice(0, 10)
            : undefined,
        }
      : undefined,
  };
}

/**
 * AI Chat Service
 * 
 * Core service for conversational AI event planning.
 * Handles message processing, entity extraction, and plan generation.
 */
@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    private readonly conversationService: ConversationService,
    @Inject(AI_PROVIDER_TOKEN) private readonly openAIProvider: AIProvider,
    private readonly aiPlannerQueue: AIPlannerQueue,
    private readonly aiPlannerService: AIPlannerService,
  ) {}

  /**
   * Handle incoming message
   * Main entry point for conversation flow
   */
  async handleMessage(
    userId: number,
    message: string,
    conversationId?: string,
    requestId?: string,
  ): Promise<{
    conversationId: string;
    reply: string;
    status: string;
    planId?: number;
    state?: ConversationState;
    requiresAuth?: boolean;
    jobId?: string;
  }> {
    const sanitizedMessage = InputSanitizer.sanitizeForPrompt(message, 1000);
    this.logger.log(`[${requestId || 'unknown'}] Processing message for user ${userId}: ${sanitizedMessage.substring(0, 50)}...`);

    // Get or create conversation
    let conversation;
    if (conversationId) {
      try {
        conversation = await this.conversationService.getConversation(conversationId, userId);
      } catch (error) {
        // Conversation not found, create new one
        conversation = await this.conversationService.createConversation(userId);
      }
    } else {
      conversation = await this.conversationService.createConversation(userId);
    }

    this.logger.debug(`Conversation ${conversation.id} status: ${conversation.status}`);

    // Handle based on current status
    switch (conversation.status) {
      case 'COLLECTING':
      case 'READY':
        return this.handleCollectingPhase(userId, sanitizedMessage, conversation);

      case 'GENERATING':
        return {
          conversationId: conversation.id,
          reply: 'Your plan is still being generated. Please wait a moment and try again.',
          status: toFrontendStatus(conversation.status),
        };

      case 'GENERATED':
      case 'MODIFYING':
        return this.handleGeneratedPhase(userId, sanitizedMessage, conversation);

      case 'ACCEPTED':
        return {
          conversationId: conversation.id,
          reply: 'Your plan has already been converted to a cart. You can start a new conversation to plan another event!',
          status: toFrontendStatus(conversation.status),
        };

      case 'FAILED':
        // Reset and start over
        await this.conversationService.updateStatus(conversation.id, 'COLLECTING', userId);
        return this.handleCollectingPhase(userId, sanitizedMessage, {
          ...conversation,
          status: 'COLLECTING',
        });

      default:
        return this.handleCollectingPhase(userId, sanitizedMessage, conversation);
    }
  }

  /**
   * Handle COLLECTING/READY phase - collecting user information
   */
  private async handleCollectingPhase(
    userId: number,
    message: string,
    conversation: {
      id: string;
      state: ConversationState;
      status: string;
      planId?: number;
    },
  ): Promise<{
    conversationId: string;
    reply: string;
    status: string;
    planId?: number;
    state?: ConversationState;
    jobId?: string;
  }> {
    // Step 1: Extract entities from message
    const extraction = await this.extractEntities(message, conversation.state);

    // Check if service is unavailable
    if (extraction.intent === ConversationIntent.SERVICE_UNAVAILABLE) {
      return {
        conversationId: conversation.id,
        reply: 'Currently the service is unavailable. Please try again later.',
        status: 'COLLECTING',
        state: conversation.state,
      };
    }

    // Step 2: Merge extracted entities into state
    const newState: ConversationState = {
      ...conversation.state,
      budget: extraction.budget ?? conversation.state.budget,
      guestCount: extraction.guestCount ?? conversation.state.guestCount,
      city: extraction.city ?? conversation.state.city,
      area: extraction.area ?? conversation.state.area,
      eventType: extraction.eventType ?? conversation.state.eventType,
      preferences: {
        ...conversation.state.preferences,
        exclude: extraction.preferences?.exclude ?? conversation.state.preferences?.exclude,
        priority: extraction.preferences?.priority ?? conversation.state.preferences?.priority,
      },
    };

    // Step 3: Update conversation state
    await this.conversationService.updateState(conversation.id, newState, userId);

    // Step 4: Handle intent
    if (extraction.intent === ConversationIntent.ACCEPT_PLAN && conversation.planId) {
      return this.handleAcceptPlan(conversation, userId);
    }

    if (extraction.intent === ConversationIntent.REJECT_PLAN) {
      await this.conversationService.updateStatus(conversation.id, 'COLLECTING', userId);
      return {
        conversationId: conversation.id,
        reply: "No problem! Let's start fresh. What type of event are you planning?",
        status: 'COLLECTING',
      };
    }

    // Step 5: Check if we have all required fields
    const missingFields = getMissingFields(newState);
    
    if (isStateComplete(newState)) {
      // All fields collected - trigger plan generation
      await this.conversationService.updateStatus(conversation.id, 'READY', userId);
      
      // Generate the plan
      const planResult = await this.triggerPlanGeneration(conversation.id, newState, userId);
      
      return {
        conversationId: conversation.id,
        reply: planResult.reply,
        status: planResult.status,
        planId: planResult.planId,
        state: newState,
        jobId: planResult.jobId,
      };
    }

    // Step 6: Generate response asking for next field
    const response = await this.generateResponse({
      message,
      state: newState,
      intent: extraction.intent,
      missingFields,
    });

    return {
      conversationId: conversation.id,
      reply: response,
      status: isStateComplete(newState) ? 'READY' : 'COLLECTING',
      state: newState,
    };
  }

  /**
   * Handle GENERATED/MODIFYING phase - plan modifications and acceptance
   */
  private async handleGeneratedPhase(
    userId: number,
    message: string,
    conversation: {
      id: string;
      state: ConversationState;
      status: string;
      planId?: number;
    },
  ): Promise<{
    conversationId: string;
    reply: string;
    status: string;
    planId?: number;
    jobId?: string;
  }> {
    // Extract intent from message
    const extraction = await this.extractEntities(message, conversation.state);

    if (extraction.intent === ConversationIntent.ACCEPT_PLAN && conversation.planId) {
      return this.handleAcceptPlan(conversation, userId);
    }

    if (extraction.intent === ConversationIntent.MODIFY_PLAN && conversation.planId) {
      return this.handleModifyPlan(conversation, message, userId);
    }

    if (extraction.intent === ConversationIntent.REJECT_PLAN) {
      // Start fresh
      await this.conversationService.updateStatus(conversation.id, 'COLLECTING', userId);
      await this.conversationService.updateState(conversation.id, {}, userId);
      
      return {
        conversationId: conversation.id,
        reply: "Let's start fresh! What type of event would you like to plan?",
        status: 'COLLECTING',
      };
    }

    // General response about the plan
    return {
      conversationId: conversation.id,
      reply: "I've generated your event plan. Would you like to make any changes, or should we proceed with booking? You can say things like 'remove DJ' or 'reduce catering budget' to modify the plan.",
      status: 'GENERATED',
      planId: conversation.planId,
    };
  }

  /**
   * Accept plan and create cart
   */
  private async handleAcceptPlan(
    conversation: {
      id: string;
      state: ConversationState;
      planId?: number;
    },
    userId: number,
  ): Promise<{
    conversationId: string;
    reply: string;
    status: string;
    planId?: number;
  }> {
    if (!conversation.planId) {
      throw new BadRequestException('No plan to accept');
    }

    // Check idempotency - prevent duplicate cart creation
    const alreadyAccepted = await this.conversationService.isPlanAccepted(conversation.planId);
    if (alreadyAccepted) {
      return {
        conversationId: conversation.id,
        reply: 'This plan has already been converted to a cart.',
        status: 'ACCEPTED',
        planId: conversation.planId,
      };
    }

    try {
      // Create cart using existing ai-planner service
      await this.aiPlannerService.createCartFromAIPlan(userId, conversation.planId);
      
      await this.conversationService.updateStatus(conversation.id, 'ACCEPTED', userId);

      return {
        conversationId: conversation.id,
        reply: 'Your plan has been converted to a cart successfully! You can now proceed to checkout.',
        status: 'ACCEPTED',
        planId: conversation.planId,
      };
    } catch (error) {
      this.logger.error(`Failed to create cart: ${error}`);
      return {
        conversationId: conversation.id,
        reply: 'Sorry, there was an issue creating your cart. Please try again.',
        status: 'GENERATED',
        planId: conversation.planId,
      };
    }
  }

  /**
   * Modify plan (local modification without regenerating)
   */
  private async handleModifyPlan(
    conversation: {
      id: string;
      state: ConversationState;
      planId?: number;
    },
    message: string,
    userId: number,
  ): Promise<{
    conversationId: string;
    reply: string;
    status: string;
    planId?: number;
  }> {
    // This is a simplified implementation
    // In production, you'd parse the modification request and update planJson directly
    this.logger.log(`Handling modify plan request: ${message}`);

    // For now, offer to regenerate
    return {
      conversationId: conversation.id,
      reply: "I understand you'd like to modify your plan. Would you like me to regenerate with different preferences, or would you prefer to start over?",
      status: 'MODIFYING',
      planId: conversation.planId,
    };
  }

  /**
   * Extract entities from user message using LLM
   */
  private async extractEntities(
    message: string,
    currentState: ConversationState,
  ): Promise<EntityExtractionResult> {
    const prompt = buildEntityExtractionPrompt(message, currentState);
    
    try {
      const rawResponse = await this.openAIProvider.generate(prompt);
      const result = cleanAndParseJSON<EntityExtractionResult>(rawResponse);
      
      // Validate intent
      if (!Object.values(ConversationIntent).includes(result.intent)) {
        result.intent = ConversationIntent.COLLECT_INFO;
      }

      return result;
    } catch (error) {
      this.logger.error(`Entity extraction failed: ${error}`);
      
      // Check if it's a quota/service unavailable error
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        errorMsg.includes('quota') ||
        errorMsg.includes('billing') ||
        errorMsg.includes('insufficient') ||
        errorMsg.includes('SERVICE_UNAVAILABLE') ||
        errorMsg.includes('Currently the service is unavailable')
      ) {
        // Return a special result that triggers fallback in the chat
        return {
          intent: ConversationIntent.SERVICE_UNAVAILABLE,
          confidence: 0,
        };
      }
      
      // Return default on failure
      return {
        intent: ConversationIntent.COLLECT_INFO,
        confidence: 0,
      };
    }
  }

  /**
   * Generate conversational response
   */
  private async generateResponse(input: {
    message: string;
    state: ConversationState;
    intent: string;
    missingFields: (keyof ConversationState)[];
    planGenerated?: boolean;
    planId?: number;
    errorMessage?: string;
  }): Promise<string> {
    // Check if service is unavailable
    if (input.intent === ConversationIntent.SERVICE_UNAVAILABLE) {
      return "Currently the service is unavailable. Please try again later.";
    }
    
    const prompt = buildResponseGenerationPrompt(input);

    try {
      const response = await this.openAIProvider.generate(prompt);
      return response.trim();
    } catch (error) {
      this.logger.error(`Response generation failed: ${error}`);
      
      // Check if it's a quota/service unavailable error
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        errorMsg.includes('quota') ||
        errorMsg.includes('billing') ||
        errorMsg.includes('insufficient') ||
        errorMsg.includes('SERVICE_UNAVAILABLE') ||
        errorMsg.includes('Currently the service is unavailable')
      ) {
        return "Currently the service is unavailable. Please try again later.";
      }
      
      // Fallback responses
      const fieldQuestions: Record<string, string> = {
        budget: "What is your total budget for the event?",
        guestCount: "How many guests are you expecting?",
        city: "Which city will the event be held in?",
        eventType: "What type of event are you planning?",
      };

      if (input.missingFields.length > 0) {
        return fieldQuestions[input.missingFields[0]] || "Could you provide more details?";
      }

      return "I've received your information. Let me generate your plan now!";
    }
  }

  private async triggerPlanGeneration(
    conversationId: string,
    state: ConversationState,
    userId: number,
  ): Promise<{
    reply: string;
    status: string;
    planId?: number;
    jobId?: string;
  }> {
    await this.conversationService.updateStatus(conversationId, 'GENERATING', userId);

    try {
      // Generate idempotency key from state
      const stateHash = createHash('sha256')
        .update(JSON.stringify(state))
        .digest('hex')
        .substring(0, 16);

      // Add job to queue with idempotency
      const { jobId } = await this.aiPlannerQueue.addGeneratePlanJob({
        userId,
        conversationId,
        budget: state.budget!,
        eventType: state.eventType!,
        city: state.city!,
        area: state.area || '',
        guestCount: state.guestCount!,
        // Note: We're not using eventId here since this is a new plan
      });

      this.logger.log(`Triggered plan generation job ${jobId} for conversation ${conversationId}`);

      // Return immediate response - frontend should poll for completion
      return {
        reply: "I've received all the details! Your event plan is being generated. This will take a moment. You can check back shortly!",
        status: 'GENERATING',
        jobId: jobId,
      };
    } catch (error) {
      this.logger.error(`Failed to trigger plan generation: ${error}`);
      await this.conversationService.updateStatus(conversationId, 'FAILED', userId);

      return {
        reply: "Sorry, I encountered an issue generating your plan. Please try again.",
        status: 'FAILED',
      };
    }
  }

  /**
   * Handle webhook/callback when plan is ready
   * Called by the queue processor when plan generation completes
   */
  async onPlanGenerated(conversationId: string, planId: number, userId: number): Promise<void> {
    await this.conversationService.attachPlan(conversationId, planId, userId);
    this.logger.log(`Plan ${planId} attached to conversation ${conversationId}`);
  }

  /**
   * Get conversation status
   */
  async getConversationStatus(
    conversationId: string,
    userId: number,
  ): Promise<{
    id: string;
    status: string;
    planId?: number;
    state?: ConversationState;
  }> {
    const conversation = await this.conversationService.getConversation(conversationId, userId);
    
    return {
      id: conversation.id,
      status: toFrontendStatus(conversation.status),
      planId: conversation.planId,
      state: conversation.state,
    };
  }

  /**
   * Get demo response for public preview
   * Returns a sample chatbot response without authentication
   */
  async getDemoResponse(): Promise<DemoChatResponseDto> {
    return {
      conversationId: 'demo-conversation-id',
      reply: "Welcome to the AI Event Planner demo! This is a sample response showing what the chatbot can do. Try saying 'I want to plan a wedding for 300 guests in Mumbai with 5 lakh budget' to see how it works. Login to start planning your actual event!",
      status: 'COLLECTING',
      isDemo: true,
      state: {
        budget: 500000,
        guestCount: 300,
        city: 'Mumbai',
        eventType: 'Wedding',
      },
    };
  }

  /**
   * Handle guest message (unauthenticated user)
   * Extracts state from message but does NOT persist to database
   * Returns tempState that can be used after login
   */
  async handleGuestMessage(
    message: string,
    initialStateParam?: {
      budget?: number;
      guestCount?: number;
      city?: string;
      area?: string;
      eventType?: string;
    },
  ): Promise<{
    conversationId: string;
    reply: string;
    status: string;
    planId?: number;
    state?: ConversationState;
    requiresAuth: boolean;
    tempState?: ConversationState;
    jobId?: string;
  }> {
    const sanitizedMessage = InputSanitizer.sanitizeForPrompt(message, 1000);
    this.logger.log(`Processing GUEST message: ${sanitizedMessage.substring(0, 50)}...`);

    // Start with initialState if provided (from login resume)
    // ALWAYS sanitize - never trust client input
    const initialState = sanitizeState(initialStateParam);
    let currentState: ConversationState = initialState;

    // Extract entities from message
    const extraction = await this.extractEntities(message, currentState);

    // Check if service is unavailable
    if (extraction.intent === ConversationIntent.SERVICE_UNAVAILABLE) {
      return {
        conversationId: 'guest-session',
        reply: 'Currently the service is unavailable. Please try again later.',
        status: 'COLLECTING',
        requiresAuth: true,
        tempState: currentState,
      };
    }

    // Merge extracted entities into state (but don't persist)
    currentState = {
      ...currentState,
      budget: extraction.budget ?? currentState.budget,
      guestCount: extraction.guestCount ?? currentState.guestCount,
      city: extraction.city ?? currentState.city,
      area: extraction.area ?? currentState.area,
      eventType: extraction.eventType ?? currentState.eventType,
      preferences: {
        ...currentState.preferences,
        exclude: extraction.preferences?.exclude ?? currentState.preferences?.exclude,
        priority: extraction.preferences?.priority ?? currentState.preferences?.priority,
      },
    };

    // Check if state is complete
    const missingFields = getMissingFields(currentState);
    const complete = isStateComplete(currentState);

    // Generate response
    let reply: string;
    let status = 'COLLECTING';

    if (complete) {
      reply = "I've received all the details! Your event plan is ready. Please login to generate and save your plan.";
      status = 'READY';
    } else {
      reply = await this.generateResponse({
        message,
        state: currentState,
        intent: extraction.intent,
        missingFields,
      });
    }

    return {
      conversationId: 'guest-session',
      reply,
      status,
      requiresAuth: true,
      tempState: currentState, // Return state for frontend to store
    };
  }
}
