import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityType, SlotStatus } from '@prisma/client';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  // CREATE AVAILABILITY
  async create(venueId: number, date: Date, timeSlot: string) {
    const overlap = await this.prisma.availabilitySlot.findFirst({
      where: {
        entityType: EntityType.VENUE,
        entityId: venueId,
        date,
        timeSlot,
      },
    });

    if (overlap) {
      throw new BadRequestException('Slot already exists');
    }

    return this.prisma.availabilitySlot.create({
      data: {
        entityType: EntityType.VENUE,
        entityId: venueId,
        date,
        timeSlot,
        status: SlotStatus.AVAILABLE,
      },
    });
  }

  // GET AVAILABILITY BY VENUE
  async findByVenue(venueId: number) {
    return this.prisma.availabilitySlot.findMany({
      where: {
        entityType: EntityType.VENUE,
        entityId: venueId,
      },
      orderBy: { date: 'asc' },
    });
  }
}
