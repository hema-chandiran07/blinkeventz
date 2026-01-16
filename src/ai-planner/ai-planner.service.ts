import {
  Injectable,
  BadRequestException,
  Inject,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { OpenAIProvider } from './providers/openai.provider';
import { CreateAIPlanDto } from './dto/create-ai-plan.dto';
import { budgetSplitPrompt } from './prompts/budget-split.prompt';
import { cleanAndParseJSON } from './utils/json-cleaner';

/**
 * CACHE_MANAGER is OPTIONAL
 * If Redis is not configured, app will still work
 */
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Internal type to safely read Prisma Json
 */
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

@Injectable()
export class AIPlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: OpenAIProvider,

    // 🔥 Redis Cache (SAFE injection)
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // =========================================================
  // 1️⃣ GENERATE AI PLAN (CACHE + FALLBACK + VALIDATION)
  // =========================================================
  async generatePlan(userId: number, dto: CreateAIPlanDto) {
    /**
     * Cache key based on user input
     * Same input → same AI plan
     */
    const cacheKey = `ai-plan:${userId}:${JSON.stringify(dto)}`;

    // 🔹 1. Check Redis cache
    const cached = await this.cache?.get(cacheKey);
    if (cached) {
      return cached;
    }

    let planJson: AIPlanJSON;

    try {
      // 🔹 2. Build AI prompt
      const prompt = budgetSplitPrompt(dto);

      // 🔹 3. Call OpenAI
      const aiRaw = await this.ai.generate(prompt);

      // 🔹 4. Parse + sanitize AI JSON
      planJson = cleanAndParseJSON<AIPlanJSON>(aiRaw);
    } catch (error) {
      /**
       * 🧯 FALLBACK LOGIC
       * If AI fails, still create a valid empty plan
       */
      planJson = {
        summary: {
          eventType: dto.eventType,
          city: dto.city,
          guestCount: dto.guestCount,
          totalBudget: dto.budget,
        },
        allocations: [],
      };
    }

    // =========================================================
    // 🔐 COST SANITY VALIDATION
    // =========================================================
    if (planJson.allocations?.length) {
      const total = planJson.allocations.reduce(
        (sum, item) => sum + item.amount,
        0,
      );

      if (total !== dto.budget) {
        throw new BadRequestException(
          'AI generated budget does not match total budget',
        );
      }
    }

    // =========================================================
    // 💾 SAVE AI PLAN
    // =========================================================
    const plan = await this.prisma.aIPlan.create({
      data: {
        userId,
        EventId: dto.eventId ?? null,
        budget: dto.budget,
        city: dto.city,
        area: dto.area,
        guestCount: dto.guestCount,
        planJson: planJson as any, // Prisma Json safe cast
      },
    });

    // 🔹 Cache result for future
    await this.cache?.set(cacheKey, plan, 60 * 10); // 10 mins

    return plan;
  }

  // =========================================================
  // 2️⃣ REGENERATE AI PLAN (VERSIONING READY)
  // =========================================================
  async regenerate(planId: number, userId: number) {
    const existingPlan = await this.prisma.aIPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!existingPlan) {
      throw new BadRequestException('AI Plan not found');
    }

    /**
     * Creates a NEW plan
     * Old plan remains for version history
     */
    return this.generatePlan(userId, {
      budget: existingPlan.budget,
      city: existingPlan.city,
      area: existingPlan.area,
      guestCount: existingPlan.guestCount,
      eventType: 'Regenerated',
      eventId: existingPlan.EventId ?? undefined,
    });
  }

  // =========================================================
  // 3️⃣ AUTO‑MATCH VENDORS BASED ON AI PLAN
  // =========================================================
  async matchVendorsFromPlan(planId: number) {
    const plan = await this.prisma.aIPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new BadRequestException('AI Plan not found');
    }

    /**
     * Simple industry heuristic:
     * - Same city & area
     * - Verified vendors
     * - Budget friendly services
     */
    return this.prisma.vendorService.findMany({
      where: {
        isActive: true,
        vendor: {
          city: plan.city,
          area: plan.area,
          verificationStatus: 'VERIFIED',
        },
        baseRate: {
          lte: Math.floor(plan.budget / 3),
        },
      },
      include: {
        vendor: true,
      },
      take: 10,
    });
  }

  // =========================================================
  // 4️⃣ CREATE CART FROM AI PLAN (ONE‑CLICK ADD)
  // =========================================================
  async createCartFromAIPlan(userId: number, planId: number) {
    const plan = await this.prisma.aIPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan || !plan.planJson) {
      throw new BadRequestException('Invalid AI Plan');
    }

    const planJson = plan.planJson as unknown as AIPlanJSON;

    if (!planJson.allocations?.length) {
      throw new BadRequestException(
        'AI plan has no allocations to add to cart',
      );
    }

    // =========================================================
    // 🛒 CREATE CART WITH AI ITEMS
    // =========================================================
    const cart = await this.prisma.cart.create({
      data: {
        userId,
        items: {
          create: planJson.allocations.map((item) => ({
            itemType: 'ADDON',
            quantity: 1,
            unitPrice: item.amount,
            totalPrice: item.amount,
            meta: {
              category: item.category,
              notes: item.notes,
              source: 'AI_PLAN',
            },
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // =========================================================
    // ✅ MARK PLAN AS ACCEPTED
    // =========================================================
    await this.prisma.aIPlan.update({
      where: { id: planId },
      data: { status: 'ACCEPTED' },
    });

    return cart;
  }
}
