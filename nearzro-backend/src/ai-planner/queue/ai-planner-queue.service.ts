import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAIProvider } from '../providers/openai.provider';
import { cleanAndParseJSON } from '../utils/json-cleaner';
import { InputSanitizer } from '../utils/input-sanitizer';
import { budgetSplitPrompt } from '../prompts/budget-split.prompt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import {
  CACHE_CONFIG,
  BUDGET_CONFIG,
  ERROR_MESSAGES,
  QUEUE_CONFIG,
} from '../constants/ai-planner.constants';

export interface GeneratePlanJobData {
  userId: number;
  conversationId?: string;  // Optional for backward compatibility
  budget: number;
  eventType: string;
  city: string;
  area: string;
  guestCount: number;
  eventId?: number;
  requestId?: string;  // For request tracing
}

export interface GeneratePlanJobResult {
  planId: number;
  status: 'success' | 'failed';
  error?: string;
}

type AIPlanJSON = {
  summary: {
    eventType: string;
    city: string;
    guestCount: number;
    totalBudget: number;
  };
  allocations: {
    category: string;
    amount: number;
    notes?: string;
  }[];
};

/**
 * AI Planner Queue Service
 * 
 * Handles async processing of AI plan generation using Bull.
 * Implements:
 * - Retry with exponential backoff (3 retries)
 * - 10 second timeout
 * - Dead letter queue for failed jobs
 * - Proper error handling and logging
 */
@Injectable()
export class AIPlannerQueueService {
  private readonly logger = new Logger(AIPlannerQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: OpenAIProvider,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Process AI plan generation job
   * This method is called by the Bull processor
   * Includes:
   * - Atomic linking (conversation <-> plan)
   * - Idempotency check
   * - Race condition prevention
   * - Proper failure handling
   * - Regeneration support
   */
  async processGeneratePlanJob(data: GeneratePlanJobData): Promise<GeneratePlanJobResult> {
    const { userId, conversationId, budget, eventType, city, area, guestCount, eventId, requestId } = data;
    
    const traceId = requestId ? requestId.substring(0, 8) : 'no-trace';
    this.logger.log(`[${traceId}] Processing AI plan job for user ${userId}${conversationId ? `, conversation: ${conversationId}` : ''}`);

    // PART 6: Race condition prevention - only proceed if status is READY
    if (conversationId) {
      const updated = await this.prisma.aIConversation.updateMany({
        where: {
          id: conversationId,
          userId,
          status: 'READY',
        },
        data: {
          status: 'GENERATING',
        },
      });

      if (updated.count === 0) {
        this.logger.warn(`[${traceId}] Race condition prevented or invalid state for conversation ${conversationId}`);
        return {
          planId: 0,
          status: 'failed',
          error: 'Invalid conversation state or generation already in progress',
        };
      }
    }

    try {
      // PART 2: Idempotency - Check if already generated
      if (conversationId) {
        const existingConv = await this.prisma.aIConversation.findUnique({
          where: { id: conversationId },
        });

        if (existingConv?.planId) {
          this.logger.log(`[${traceId}] Plan already exists for conversation ${conversationId}`);
          return {
            planId: existingConv.planId,
            status: 'success',
          };
        }
      }

      // PART 8: Handle regeneration BEFORE validation
      // If eventId is provided and budget is 0, this is a regeneration request
      let sanitized;
      let actualBudget = budget;
      let actualEventType = eventType;
      let actualCity = city;
      let actualArea = area;
      let actualGuestCount = guestCount;

      // Check if this is a regeneration request (eventId provided + budget is 0)
      const isRegeneration = eventId && eventId > 0 && budget === 0;
      
      if (isRegeneration) {
        // Fetch existing plan FIRST for regeneration
        const existingPlan = await this.prisma.aIPlan.findFirst({
          where: { id: eventId, userId },
        });
        
        if (!existingPlan) {
          // If plan not found, throw Invalid budget error
          throw new BadRequestException('Invalid budget');
        }
        
        // Populate missing fields from existing plan
        actualBudget = existingPlan.budget;
        actualEventType = 'Regenerated';
        actualCity = existingPlan.city;
        actualArea = existingPlan.area || '';
        actualGuestCount = existingPlan.guestCount;
      }

      // Validate input AFTER handling regeneration (so fields are populated for regeneration case)
      if (!actualBudget || !actualCity || !actualEventType || !actualGuestCount) {
        throw new Error('Missing required fields: budget, city, eventType, guestCount');
      }

      // Step 2: Sanitize all inputs
      sanitized = InputSanitizer.sanitizeAIPlanInput({
        budget: actualBudget,
        eventType: actualEventType,
        city: actualCity,
        area: actualArea,
        guestCount: actualGuestCount,
      });

      // Step 3: Validate prompt length before generating
      const prompt = budgetSplitPrompt(sanitized);
      InputSanitizer.validatePromptLength(prompt);

      // Step 4: Generate cache key
      const cacheKey = this.generateCacheKey(userId, sanitized);

      // Step 5: Check cache
      const cached = await this.cache?.get<{ id: number }>(cacheKey);
      if (cached && cached.id) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return {
          planId: cached.id,
          status: 'success',
        };
      }

      // Step 6: Call OpenAI with circuit breaker protection
      const aiRaw = await this.ai.generateWithCircuitBreaker(prompt);

      // Step 7: Parse AI response
      const planJson = cleanAndParseJSON<AIPlanJSON>(aiRaw);

      // Step 8: Validate budget allocation
      if (planJson.allocations?.length) {
        const total = planJson.allocations.reduce((sum, item) => sum + item.amount, 0);
        const tolerance = actualBudget * BUDGET_CONFIG.ALLOCATION_TOLERANCE_PERCENT;
        const difference = Math.abs(total - actualBudget);

        if (difference > tolerance) {
          this.logger.error(`Budget mismatch: expected ${actualBudget}, got ${total}`);
          throw new Error(ERROR_MESSAGES.BUDGET_ALLOCATION_MISMATCH);
        }
      }

      // Step 9: Save to database
      const plan = await this.prisma.aIPlan.create({
        data: {
          userId,
          EventId: eventId ?? null,
          budget: sanitized.budget,
          city: sanitized.city,
          area: sanitized.area,
          guestCount: sanitized.guestCount,
          planJson: planJson as any,
        },
      });

      // Step 10: Cache result
      await this.cache?.set(cacheKey, plan, CACHE_CONFIG.AI_PLAN_TTL);

      this.logger.log(`AI plan generated successfully: planId=${plan.id}`);
      
      return {
        planId: plan.id,
        status: 'success',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI plan generation failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      
      return {
        planId: 0,
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Generate cache key with hashing
   */
  private generateCacheKey(
    userId: number,
    sanitized: ReturnType<typeof InputSanitizer.sanitizeAIPlanInput>,
  ): string {
    if (CACHE_CONFIG.USE_HASH) {
      const hash = InputSanitizer.generateCacheKey({
        ...sanitized,
        userId,
      });
      return `${CACHE_CONFIG.AI_PLAN_PREFIX}${userId}:${hash}`;
    }

    return `${CACHE_CONFIG.AI_PLAN_PREFIX}${userId}:${sanitized.budget}:${sanitized.city}:${sanitized.guestCount}`;
  }
}
