import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpressDto } from './dto/create-express.dto';
import { ExpressStatus } from '@prisma/client';

@Injectable()
export class ExpressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CREATE EXPRESS 50 REQUEST
   */
  async create(dto: CreateExpressDto) {
    const tempEvent = await this.prisma.tempEvent.findUnique({
      where: { id: dto.tempEventId },
      include: { expressRequest: true },
    });

    if (!tempEvent) {
      throw new BadRequestException('Temp event not found');
    }

    if (tempEvent.expressRequest) {
      throw new BadRequestException('Express already created for this event');
    }

    // ⏱️ 6 hours rule
    const now = new Date();
    const eventDate = new Date(tempEvent.eventDate);
    const diffHours =
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 6) {
      throw new BadRequestException(
        'Express not allowed less than 6 hrs',
      );
    }

    // 💰 Express pricing (can be config driven later)
    const expressFee = dto.planType === 'FIXED' ? 50000 : 80000;

    const startedAt = now;
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour SLA

    return this.prisma.expressRequest.create({
      data: {
        tempEventId: dto.tempEventId,
        planType: dto.planType,
        status: ExpressStatus.PENDING,
        startedAt,
        expiresAt,
        expressFee,
      },
    });
  }

  /**
   * GET EXPRESS BY TEMP EVENT
   */
  async getByTempEvent(tempEventId: number) {
    const express = await this.prisma.expressRequest.findUnique({
      where: { tempEventId },
    });

    if (!express) {
      throw new BadRequestException(
        'No express request found for this event',
      );
    }

    return express;
  }
}
