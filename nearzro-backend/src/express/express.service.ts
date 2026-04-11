// src/express/express.service.ts
import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  async createForUser(userId: number, dto: CreateExpressDto) {
    const Event = await this.prisma.event.findUnique({
      where: { id: dto.EventId },
      include: { expressRequest: true },
    });

    if (!Event) {
      throw new BadRequestException(' event not found');
    }

    // 🔐 Ownership check
    if (Event.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (Event.expressRequest) {
      throw new BadRequestException('Express already created');
    }

    if (!Event.date) {
      throw new BadRequestException('Event date missing');
    }

    // ⏱ Time validation
    const now = new Date();
    const eventDate = new Date(Event.date);
    const diffHours =
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
if (!Event.area) {
  throw new BadRequestException('Event area is required for express booking');
}

    const minHours = getMinHoursForExpressByArea(Event.area);

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
        EventId: Event.id,
        userId,
        planType: dto.planType,
        status: ExpressStatus.PENDING,
        startedAt: now,
        expiresAt: new Date(
          now.getTime() + EXPRESS_SLA_HOURS * 60 * 60 * 1000,
        ),
        expressFee,
      },
      include: {
        Event: {
          select: {
            id: true,
            title: true,
            eventType: true,
            date: true,
            guestCount: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async getByEventForUser(userId: number, EventId: number) {
    const express = await this.prisma.expressRequest.findUnique({
      where: { EventId },
    });

    if (!express) return null;

    if (express.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return express;
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  async getAllExpressRequests() {
    return this.prisma.expressRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        Event: {
          select: {
            id: true,
            title: true,
            eventType: true,
            date: true,
            guestCount: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async getExpressRequestById(id: number) {
    const express = await this.prisma.expressRequest.findUnique({
      where: { id },
      include: {
        Event: {
          select: {
            id: true,
            title: true,
            eventType: true,
            date: true,
            guestCount: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!express) {
      throw new NotFoundException('Express request not found');
    }

    return express;
  }

  async updateExpressRequest(
    id: number,
    body: { status?: string; rejectionReason?: string }
  ) {
    const express = await this.prisma.expressRequest.findUnique({
      where: { id },
    });

    if (!express) {
      throw new NotFoundException('Express request not found');
    }

    const updateData: any = {};

    if (body.status) {
      updateData.status = body.status as ExpressStatus;
    }

    if (body.rejectionReason) {
      updateData.rejectionReason = body.rejectionReason;
    }

    return this.prisma.expressRequest.update({
      where: { id },
      data: updateData,
      include: {
        Event: {
          select: {
            id: true,
            title: true,
            eventType: true,
            date: true,
            guestCount: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }
}
