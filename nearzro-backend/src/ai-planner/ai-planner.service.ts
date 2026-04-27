import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAIPlanDto } from './dto/create-ai-plan.dto';
import { z } from 'zod';

/**
 * AI Planner Service
 * 
 * Orchestrates:
 * - Queue job submission
 * - Plan retrieval
 * - Vendor Matching
 * - Cart Conversion
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

// Zod schema for validating AI plan JSON structure
const AIPlanSchema = z.object({
  summary: z.object({
    eventType: z.string(),
    city: z.string(),
    guestCount: z.number().int().positive(),
    totalBudget: z.number().nonnegative(),
  }),
  allocations: z.array(
    z.object({
      category: z.string(),
      amount: z.number().nonnegative(),
      notes: z.string().optional(),
    })
  ).min(1),
});

@Injectable()
export class AIPlannerService {
  private readonly logger = new Logger(AIPlannerService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get AI plan by ID with authorization
   */
  async getPlan(planId: number, userId: number) {
    const plan = await this.prisma.aIPlan.findFirst({
      where: {
        id: planId,
        userId,
      },
    });

    if (!plan) {
      throw new BadRequestException('AI Plan not found or access denied');
    }

    return plan;
  }

  /**
   * Get AI plan by ID without authorization (public preview)
   * Uses shareId and checks isPublic flag for security
   */
  async getPlanPublic(shareId: string) {
    const plan = await this.prisma.aIPlan.findUnique({
      where: {
        shareId,
      },
    });

    // Security: Only return plan if isPublic is true
    if (!plan || !plan.isPublic) {
      return null;
    }

    return {
      id: plan.id,
      budget: plan.budget,
      city: plan.city,
      area: plan.area,
      guestCount: plan.guestCount,
      planJson: plan.planJson,
      status: plan.status,
      createdAt: plan.createdAt,
    };
  }

  /**
   * Match vendors from AI plan
   * This is a synchronous operation for vendor matching
   */
  async matchVendorsFromPlan(planId: number, userId: number) {
    // SECURITY: Check both planId AND userId
    const plan = await this.prisma.aIPlan.findFirst({
      where: {
        id: planId,
        userId,
      },
    });

    if (!plan) {
      throw new BadRequestException('AI Plan not found or access denied');
    }

    // Find matching vendors
    const vendors = await this.prisma.vendorService.findMany({
      where: {
        isActive: true,
        vendor: {
          city: {
            equals: plan.city,
            mode: 'insensitive',
          },
          verificationStatus: 'VERIFIED',
        },
      },
      include: {
        vendor: true,
      },
      take: 10,
    });

    return vendors;
  }

  /**
   * Create cart from AI plan
   */
  async createCartFromAIPlan(userId: number, planId: number) {
    // SECURITY: Check both planId AND userId
    const plan = await this.prisma.aIPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan || !plan.planJson) {
      throw new BadRequestException('AI Plan not found or access denied');
    }

    const planJson = plan.planJson as unknown as AIPlanJSON;

    // Validate the AI plan structure using Zod
    const parseResult = AIPlanSchema.safeParse(planJson);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Invalid AI plan structure',
        errors: (parseResult.error as any).errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    if (!planJson.allocations?.length) {
      throw new BadRequestException('Cannot create cart from empty plan');
    }

    // Create cart with AI items
    const cart = await this.prisma.cart.create({
      data: {
        userId,
        status: 'ACTIVE',
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

    // Mark plan as accepted
    await this.prisma.aIPlan.update({
      where: { id: planId },
      data: { status: 'ACCEPTED' },
    });

    return cart;
  }
}
