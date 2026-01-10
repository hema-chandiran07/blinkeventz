import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpressDto } from './dto/create-express.dto';
import { ExpressStatus } from '@prisma/client';
import {
  EXPRESS_BASE_FEE,
  EXPRESS_SLA_HOURS,
  EXPRESS_PAID_ENABLED,
} from './express.constants';
import { getMinHoursForExpressByArea } from './express.rules';

@Injectable()
export class ExpressService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpressDto) {
    const tempEvent = await this.prisma.tempEvent.findUnique({
      where: { id: dto.tempEventId },
      include: { expressRequest: true },
    });

    if (!tempEvent) {
      throw new BadRequestException('Temp event not found');
    }

    if (tempEvent.expressRequest) {
      throw new BadRequestException('Express already created');
    }

    if (!tempEvent.eventDate) {
      throw new BadRequestException('Event date missing');
    }

    // ⏱ Time validation
    const now = new Date();
    const eventDate = new Date(tempEvent.eventDate);
    const diffHours =
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const minHours = getMinHoursForExpressByArea(tempEvent.area);

    if (diffHours < minHours) {
      throw new BadRequestException(
        `Express requires minimum ${minHours} hours before event`,
      );
    }

    // 💰 Fee logic
    const expressFee = EXPRESS_PAID_ENABLED
      ? EXPRESS_BASE_FEE[dto.planType]
      : 0;

    return this.prisma.expressRequest.create({
      data: {
        tempEventId: dto.tempEventId,
        userId: tempEvent.userId,
        planType: dto.planType,
        status: ExpressStatus.PENDING,
        startedAt: now,
        expiresAt: new Date(
          now.getTime() + EXPRESS_SLA_HOURS * 60 * 60 * 1000,
        ),
        expressFee,
      },
    });
  }

  async getByTempEvent(tempEventId: number) {
    return this.prisma.expressRequest.findUnique({
      where: { tempEventId },
    });
  }
}
