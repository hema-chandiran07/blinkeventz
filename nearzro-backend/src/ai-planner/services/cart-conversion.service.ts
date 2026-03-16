import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ERROR_MESSAGES, PLAN_STATUS } from '../constants/ai-planner.constants';

/**
 * Cart Conversion Service
 * 
 * Responsible for:
 * - Converting AI plan allocations to cart items
 * - Authorization verification
 * - Plan status management
 */
@Injectable()
export class CartConversionService {
  private readonly logger = new Logger(CartConversionService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Convert an AI plan to a cart with items
   * 
   * Flow:
   * 1. Verify plan exists and belongs to user (AUTHORIZATION)
   * 2. Validate plan has allocations
   * 3. Create cart with AI plan items
   * 4. Update plan status to ACCEPTED
   */
  async convertPlanToCart(
    planId: number,
    userId: number,
  ): Promise<any> {
    this.logger.log(`Converting plan ${planId} to cart for user ${userId}`);

    // Step 1: Verify plan belongs to user (AUTHORIZATION FIX)
    const plan = await this.prisma.aIPlan.findFirst({
      where: {
        id: planId,
        userId,
      },
    });

    if (!plan) {
      this.logger.warn(`Unauthorized cart conversion: user ${userId} tried to access plan ${planId}`);
      throw new Error(ERROR_MESSAGES.PLAN_NOT_FOUND);
    }

    // Step 2: Validate plan has allocations
    const planJson = plan.planJson as any;
    if (!planJson?.allocations?.length) {
      throw new Error(ERROR_MESSAGES.CART_CREATION_FAILED);
    }

    // Step 3: Create cart with AI items
    const cart = await this.prisma.cart.create({
      data: {
        userId,
        status: 'ACTIVE',
        items: {
          create: planJson.allocations.map((item: any) => ({
            itemType: 'ADDON',
            quantity: 1,
            unitPrice: item.amount,
            totalPrice: item.amount,
            meta: {
              category: item.category,
              notes: item.notes || '',
              source: 'AI_PLAN',
              planId: plan.id,
            },
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Step 4: Mark plan as accepted
    await this.prisma.aIPlan.update({
      where: { id: planId },
      data: { status: PLAN_STATUS.ACCEPTED },
    });

    this.logger.log(`Successfully created cart ${cart.id} from plan ${planId}`);
    return cart;
  }
}
