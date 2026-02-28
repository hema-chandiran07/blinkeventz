import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { AddEventServiceDto } from './dto/add-event-service.dto';
import { EventStatus } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  // GET ALL EVENTS (PUBLIC)
  async findAll() {
    return this.prisma.event.findMany({
      include: {
        venue: true,
        services: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // CREATE EVENT
  async createEvent(userId: number, dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        customerId: userId,
        eventType: dto.eventType,
        title: dto.title,
        date: new Date(dto.date),
        timeSlot: dto.timeSlot,
        city: dto.city,
        area: dto.area,
        guestCount: dto.guestCount,

        status: EventStatus.CONFIRMED,

        subtotal: 0,
        discount: 0,
        platformFee: 0,
        tax: 0,
        totalAmount: 0,
      },
    });
  }

  // GET MY EVENTS
  async getMyEvents(userId: number) {
    return this.prisma.event.findMany({
      where: { customerId: userId },
      include: {
        services: true,
        venue: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ADD SERVICE TO EVENT
  async addService(eventId: number, dto: AddEventServiceDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException('Event not found');

    const service = await this.prisma.eventService.create({
      data: {
        eventId,
        itemType: dto.itemType,
        venueId: dto.venueId,
        vendorServiceId: dto.vendorServiceId,
        serviceType: dto.serviceType,
        finalPrice: dto.finalPrice,
        notes: dto.notes,
      },
    });

    // Recalculate pricing
    const services = await this.prisma.eventService.findMany({
      where: { eventId },
    });

    const subtotal = services.reduce((sum, s) => sum + s.finalPrice, 0);

    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        subtotal,
        totalAmount: subtotal + event.platformFee + event.tax - event.discount,
      },
    });

    return service;
  }

  // ASSIGN EVENT MANAGER (ADMIN ONLY)
  async assignManager(eventId: number, managerId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new NotFoundException('Event not found');

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        assignedManagerId: managerId,
      },
    });
  }
}
