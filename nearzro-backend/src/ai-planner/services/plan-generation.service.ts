import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AIProvider } from '../ai-providers/ai-provider.interface';
import { AI_PROVIDER_TOKEN } from '../openai.module';
import { CreateAIPlanDto } from '../dto/create-ai-plan.dto';
import { budgetSplitPrompt } from '../prompts/budget-split.prompt';
import { cleanAndParseJSON } from '../utils/json-cleaner';
import { InputSanitizer } from '../utils/input-sanitizer';
import {
  CACHE_CONFIG,
  BUDGET_CONFIG,
  ERROR_MESSAGES,
} from '../constants/ai-planner.constants';
import type { Cache } from 'cache-manager';

/**
 * Plan Generation Service
 * 
 * Responsible for:
 * - Creating AI prompts from user input
 * - Calling OpenAI API
 * - Validating and parsing AI responses
 * - Persisting generated plans
 * - Managing caching
 */
@Injectable()
export class PlanGenerationService {
  private readonly logger = new Logger(PlanGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
  ) {}

  /**
   * Generate an AI plan from user input
   * 
   * Flow:
   * 1. Sanitize inputs
   * 2. Check cache
   * 3. Call AI or throw error
   * 4. Validate response
   * 5. Persist to database
   * 6. Cache result
   */
  async generatePlan(
    userId: number,
    dto: CreateAIPlanDto,
    cache: Cache,
  ): Promise<any> {
    // Step 1: Sanitize all inputs
    const sanitized = InputSanitizer.sanitizeAIPlanInput(dto);
    this.logger.log(`Generating AI plan for user ${userId} - ${sanitized.eventType} in ${sanitized.city}`);

    // Step 2: Generate cache key from sanitized input
    const cacheKey = this.generateCacheKey(userId, sanitized);

    // Step 3: Check cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return cached;
    }

    // Step 4: Generate AI plan
    let planJson: any;
    let isFallbackPlan = false;
    
    try {
      planJson = await this.generateAIPlan(sanitized);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check if it's a quota error and we got a fallback
      if (
        errorMsg.includes('quota') ||
        errorMsg.includes('billing') ||
        errorMsg.includes('insufficient') ||
        errorMsg.includes('SERVICE_UNAVAILABLE') ||
        errorMsg.includes('Currently the service is unavailable') ||
        errorMsg.includes('AI_QUOTA_EXCEEDED')
      ) {
        // generateAIPlan already returns fallback, continue with it
        planJson = await this.generateAIPlan(sanitized);
        isFallbackPlan = true;
      } else {
        throw error;
      }
    }

    // Step 5: Validate budget allocation (skip for fallback plans)
    if (!isFallbackPlan) {
      this.validateBudgetAllocation(planJson, sanitized.budget);
    } else {
      this.logger.log('Skipping validation for fallback plan');
    }

    // Step 6: Persist to database
    const plan = await this.persistPlan(userId, sanitized, planJson);

    // Step 7: Cache the result
    await cache.set(cacheKey, plan, CACHE_CONFIG.AI_PLAN_TTL);

    this.logger.log(`AI plan generated successfully: ${plan.id}`);
    return plan;
  }

  /**
   * Generate AI plan by calling OpenAI
   */
  private async generateAIPlan(
    sanitized: ReturnType<typeof InputSanitizer.sanitizeAIPlanInput>,
  ): Promise<any> {
    // Check if AI provider is available
    if (!this.aiProvider.isAvailable()) {
      throw new Error(ERROR_MESSAGES.AI_SERVICE_UNAVAILABLE);
    }

    // Build and execute prompt
    const prompt = budgetSplitPrompt(sanitized);
    
    try {
      const aiRaw = await this.aiProvider.generate(prompt);
      // Parse and validate response
      return cleanAndParseJSON(aiRaw);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check for quota/billing errors - return graceful fallback
      if (
        errorMsg.includes('quota') ||
        errorMsg.includes('billing') ||
        errorMsg.includes('insufficient') ||
        errorMsg.includes('SERVICE_UNAVAILABLE') ||
        errorMsg.includes('Currently the service is unavailable') ||
        errorMsg.includes('AI_QUOTA_EXCEEDED')
      ) {
        this.logger.error(`OpenAI quota exceeded - returning fallback plan`);
        // Return a mock plan so the queue doesn't crash
        return this.generateFallbackPlan(sanitized);
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Generate a fallback plan when OpenAI is unavailable
   * Provides basic budget allocation without AI
   */
  private generateFallbackPlan(
    sanitized: ReturnType<typeof InputSanitizer.sanitizeAIPlanInput>,
  ): any {
    const budget = sanitized.budget;
    const guestCount = sanitized.guestCount;
    
    // Default allocation percentages for Indian events
    const allocations = [
      { category: 'Venue & Decor', amount: Math.round(budget * 0.30), notes: 'Basic venue with standard decoration' },
      { category: 'Catering', amount: Math.round(budget * 0.35), notes: 'Vegetarian & non-vegetarian options' },
      { category: 'Photography/Videography', amount: Math.round(budget * 0.12), notes: 'Professional coverage' },
      { category: 'Music & Entertainment', amount: Math.round(budget * 0.08), notes: 'DJ or live band' },
      { category: 'Invitations & Stationery', amount: Math.round(budget * 0.03), notes: 'Digital + physical invites' },
      { category: 'Flowers & Gifts', amount: Math.round(budget * 0.05), notes: 'Floral arrangements & return gifts' },
      { category: 'Contingency', amount: Math.round(budget * 0.07), notes: 'Emergency buffer' },
    ];

    return {
      summary: {
        eventType: sanitized.eventType,
        city: sanitized.city,
        guestCount: guestCount,
        totalBudget: budget,
      },
      allocations,
    };
  }

  /**
   * Validate that AI budget allocation matches total budget
   * Uses tolerance for rounding errors
   */
  private validateBudgetAllocation(
    planJson: any,
    expectedBudget: number,
  ): void {
    if (!planJson?.allocations?.length) {
      throw new Error(ERROR_MESSAGES.BUDGET_ALLOCATION_MISMATCH);
    }

    const total = planJson.allocations.reduce(
      (sum: number, item: any) => sum + (item.amount || 0),
      0,
    );

    const tolerance = expectedBudget * BUDGET_CONFIG.ALLOCATION_TOLERANCE_PERCENT;
    const difference = Math.abs(total - expectedBudget);

    if (difference > tolerance) {
      this.logger.error(
        `Budget mismatch: expected ${expectedBudget}, got ${total}, difference ${difference}`,
      );
      throw new Error(ERROR_MESSAGES.BUDGET_ALLOCATION_MISMATCH);
    }

    this.logger.debug(
      `Budget validated: expected ${expectedBudget}, got ${total} (within tolerance)`,
    );
  }

  /**
   * Persist plan to database
   */
  private async persistPlan(
    userId: number,
    dto: CreateAIPlanDto,
    planJson: any,
  ): Promise<any> {
    return this.prisma.aIPlan.create({
      data: {
        userId,
        EventId: dto.eventId ?? null,
        budget: dto.budget,
        city: dto.city,
        area: dto.area,
        guestCount: dto.guestCount,
        planJson,
      },
    });
  }

  /**
   * Generate cache key from user input
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

    // Fallback to simple key (not recommended for large inputs)
    return `${CACHE_CONFIG.AI_PLAN_PREFIX}${userId}:${sanitized.budget}:${sanitized.city}:${sanitized.guestCount}`;
  }
}
