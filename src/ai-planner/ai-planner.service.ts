import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIProviderService } from './ai/ai-provider.service';
import { CreateAIPlanDto } from './dto/create-ai-plan.dto';
import { splitBudget } from './ai/ai-budget-splitter';
import { AIPlanStatus } from '@prisma/client';

@Injectable()
export class AIPlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AIProviderService,
  ) {}

  async generatePlan(dto: CreateAIPlanDto, userId: number) {
    if (dto.budget <= 0) {
      throw new BadRequestException('Budget must be greater than zero');
    }

    const budgetSplit = splitBudget(dto.budget, dto.guestCount);

    const aiResult = await this.aiProvider.generatePlan({
      ...dto,
      budgetSplit,
    });

    return this.prisma.aIPlan.create({
      data: {
        userId,
        tempEventId: dto.tempEventId,
        budget: dto.budget,
        city: dto.city,
        area: dto.area,
        guestCount: dto.guestCount,
        planJson: aiResult,
      },
    });
  }

  async acceptPlan(planId: number, accept: boolean) {
    return this.prisma.aIPlan.update({
      where: { id: planId },
      data: {
        status: accept
          ? AIPlanStatus.ACCEPTED
          : AIPlanStatus.REJECTED,
      },
    });
  }

  async regeneratePlan(planId: number) {
    const oldPlan = await this.prisma.aIPlan.findUnique({
      where: { id: planId },
    });

    if (!oldPlan) {
      throw new BadRequestException('Plan not found');
    }

    if (oldPlan.status !== AIPlanStatus.GENERATED) {
      throw new BadRequestException(
        'Cannot regenerate accepted/rejected plan',
      );
    }

    const budgetSplit = splitBudget(
      oldPlan.budget,
      oldPlan.guestCount,
    );

    const aiResult = await this.aiProvider.generatePlan({
      budget: oldPlan.budget,
      city: oldPlan.city,
      area: oldPlan.area,
      guestCount: oldPlan.guestCount,
      budgetSplit,
    });

    return this.prisma.aIPlan.update({
      where: { id: planId },
      data: { planJson: aiResult },
    });
  }
}
