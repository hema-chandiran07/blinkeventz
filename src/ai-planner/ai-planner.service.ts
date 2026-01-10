import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAIPlanDto } from './dto/create-ai-plan.dto';
import { AIProviderService } from './ai/ai-provider.service';
import { splitBudget } from './ai/ai-budget-splitter';
import { AIPlanStatus } from '@prisma/client';

@Injectable()
export class AIPlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AIProviderService,
  ) {}

  async generatePlan(dto: CreateAIPlanDto) {
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
        userId: dto.userId,
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
}
