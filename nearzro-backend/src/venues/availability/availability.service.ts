import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityType, SlotStatus } from '@prisma/client';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // CREATE AVAILABILITY
  // ============================================================================

  // CREATE AVAILABILITY (Legacy - venueId only)
  async create(venueId: number, date: Date, timeSlot: string) {
    return this.createWithEntity('VENUE', venueId, date, timeSlot);
  }

  // CREATE AVAILABILITY WITH ENTITY TYPE (New - supports VENUE or VENDOR)
  // FIX: Atomic check-and-create using SERIALIZABLE transaction with row lock
  async createWithEntity(entityType: string, entityId: number, date: Date, timeSlot: string) {
    const isVenue = entityType === 'VENUE';
    const column = isVenue ? 'venueId' : 'vendorId';

    // Wrap in SERIALIZABLE transaction to prevent race conditions
    return this.prisma.$transaction(async (tx) => {
      // Lock any existing slot for this entity/date/time (SELECT ... FOR UPDATE)
      const existingSlots = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT * FROM "AvailabilitySlot"
        WHERE "${column}" = ${entityId}
          AND "date" = ${date}
          AND "timeSlot" = ${timeSlot}
          FOR UPDATE
      `;

      if ((existingSlots as Array<any>).length > 0) {
        throw new BadRequestException('Slot already exists');
      }

      return tx.availabilitySlot.create({
        data: {
          entityType: isVenue ? EntityType.VENUE : EntityType.VENDOR,
          ...(isVenue ? { venueId: entityId } : { vendorId: entityId }),
          date,
          timeSlot,
          status: SlotStatus.AVAILABLE,
        },
      });
    }, { isolationLevel: 'Serializable' });
  }

  // ============================================================================
  // GET AVAILABILITY
  // ============================================================================

  // GET AVAILABILITY BY VENUE
  async findByVenue(venueId: number) {
    return this.prisma.availabilitySlot.findMany({
      where: {
        venueId,
      },
      orderBy: { date: 'asc' },
    });
  }

  // GET AVAILABILITY BY VENDOR
  async findByVendor(vendorId: number) {
    return this.prisma.availabilitySlot.findMany({
      where: {
        vendorId,
      },
      orderBy: { date: 'asc' },
    });
  }

  // GET AVAILABILITY BY ENTITY (New - supports VENUE or VENDOR)
  async findByEntity(entityType: string, entityId: number) {
    const isVenue = entityType === 'VENUE';
    return this.prisma.availabilitySlot.findMany({
      where: {
        ...(isVenue ? { venueId: entityId } : { vendorId: entityId }),
      },
      orderBy: { date: 'asc' },
    });
  }

  // ============================================================================
  // UPDATE AVAILABILITY
  // ============================================================================

  // UPDATE SLOT STATUS
  async updateSlot(slotId: number, status?: string, reason?: string) {
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    // Cannot update a booked slot
    if (slot.status === SlotStatus.BOOKED) {
      throw new BadRequestException('Cannot update a booked slot');
    }

    return this.prisma.availabilitySlot.update({
      where: { id: slotId },
      data: {
        status: status as SlotStatus,
      },
    });
  }

  // BLOCK SLOT
  async blockSlot(entityId: number, date: Date, timeSlot: string, reason?: string) {
    // Find or create the slot
    let slot = await this.prisma.availabilitySlot.findFirst({
      where: {
        venueId: entityId,
        date,
        timeSlot,
      },
    });

    if (!slot) {
      // Create the slot as blocked
      slot = await this.prisma.availabilitySlot.create({
        data: {
          entityType: EntityType.VENUE,
          venueId: entityId,
          date,
          timeSlot,
          status: SlotStatus.BLOCKED,
        },
      });
    } else if (slot.status !== SlotStatus.BOOKED) {
      // Update to blocked if not booked
      slot = await this.prisma.availabilitySlot.update({
        where: { id: slot.id },
        data: {
          status: SlotStatus.BLOCKED,
        },
      });
    }

    return slot;
  }

  // UNBLOCK SLOT
  async unblockSlot(entityId: number, date: Date, timeSlot: string) {
    const slot = await this.prisma.availabilitySlot.findFirst({
      where: {
        venueId: entityId,
        date,
        timeSlot,
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.status === SlotStatus.BOOKED) {
      throw new BadRequestException('Cannot unblock a booked slot');
    }

    return this.prisma.availabilitySlot.update({
      where: { id: slot.id },
      data: {
        status: SlotStatus.AVAILABLE,
      },
    });
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  // CREATE MULTIPLE SLOTS
  async createBulk(entityType: string, entityId: number, slots: Array<{ date: Date; timeSlot: string }>) {
    const created: any[] = [];
    
    for (const slot of slots) {
      try {
        const result = await this.createWithEntity(entityType, entityId, slot.date, slot.timeSlot);
        created.push(result);
      } catch (error) {
        // Skip if already exists
        if (!(error instanceof BadRequestException)) {
          throw error;
        }
      }
    }
    
    return created;
  }

  // ============================================================================
  // AVAILABILITY CHECKS
  // ============================================================================

  // CHECK IF SLOT IS AVAILABLE
  async isSlotAvailable(entityType: string, entityId: number, date: Date, timeSlot: string) {
    const isVenue = entityType === 'VENUE';
    const slot = await this.prisma.availabilitySlot.findFirst({
      where: {
        ...(isVenue ? { venueId: entityId } : { vendorId: entityId }),
        date,
        timeSlot,
      },
    });

    if (!slot) {
      return false; // Slot doesn't exist
    }

    return slot.status === SlotStatus.AVAILABLE;
  }

  // GET AVAILABLE SLOTS FOR DATE RANGE
  async getAvailableSlots(entityType: string, entityId: number, startDate: Date, endDate: Date) {
    const isVenue = entityType === 'VENUE';
    return this.prisma.availabilitySlot.findMany({
      where: {
        ...(isVenue ? { venueId: entityId } : { vendorId: entityId }),
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: SlotStatus.AVAILABLE,
      },
      orderBy: { date: 'asc' },
    });
  }

  // GET BOOKED SLOTS FOR DATE RANGE
  async getBookedSlots(entityType: string, entityId: number, startDate: Date, endDate: Date) {
    const isVenue = entityType === 'VENUE';
    return this.prisma.availabilitySlot.findMany({
      where: {
        ...(isVenue ? { venueId: entityId } : { vendorId: entityId }),
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: SlotStatus.BOOKED,
      },
      orderBy: { date: 'asc' },
    });
  }

  // GET BLOCKED SLOTS FOR DATE RANGE
  async getBlockedSlots(entityType: string, entityId: number, startDate: Date, endDate: Date) {
    const isVenue = entityType === 'VENUE';
    return this.prisma.availabilitySlot.findMany({
      where: {
        ...(isVenue ? { venueId: entityId } : { vendorId: entityId }),
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: SlotStatus.BLOCKED,
      },
      orderBy: { date: 'asc' },
    });
  }
}
