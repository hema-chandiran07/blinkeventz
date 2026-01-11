// src/ai-planner/ai-planner.service.ts
import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AIProviderService } from './ai/ai-provider.service';
import { CreateAIPlanDto } from './dto/create-ai-plan.dto';

@Injectable()
export class AIPlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AIProviderService,
  ) {}

  async createPlan(userId:number, dto: CreateAIPlanDto) {
    if (dto.budget <= 0) {
      throw new BadRequestException('Budget must be greater than zero');
    }

    const budgetSplit = this.splitBudget(dto.budget);

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

  async acceptPlan(id: number) {
    return this.prisma.aIPlan.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });
  }

  private splitBudget(budget: number) {
    return {
      venue: Math.round(budget * 0.4),
      catering: Math.round(budget * 0.3),
      decor: Math.round(budget * 0.15),
      misc: Math.round(budget * 0.15),
    };
  }
}
