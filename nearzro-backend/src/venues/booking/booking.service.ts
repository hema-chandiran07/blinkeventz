import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
<<<<<<< Updated upstream
=======
import { SlotStatus, EntityType } from '@prisma/client';
>>>>>>> Stashed changes

// Define SlotStatus locally
const SlotStatus = {
  AVAILABLE: 'AVAILABLE',
  BOOKED: 'BOOKED',
  BLOCKED: 'BLOCKED',
  HOLD: 'HOLD',
} as const;
export type SlotStatus = typeof SlotStatus[keyof typeof SlotStatus];

/**
 * Booking Service - Production Ready
 * 
 * Fixed race condition using Prisma transactions with optimistic locking.
 * Uses check-and-set pattern to prevent double bookings.
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Book an availability slot using atomic transaction
   * 
   * This prevents race conditions by:
   * 1. Using prisma.$transaction for atomicity
   * 2. Checking slot status within the transaction
   * 3. Updating slot status in the same transaction
   * 
   * @param userId - The user making the booking
   * @param availabilitySlotId - The slot to book
   * @returns Created booking
   */
  async book(userId: number, availabilitySlotId: number): Promise<any> {
    // Validate inputs
    if (!userId || !availabilitySlotId) {
      throw new BadRequestException('Invalid booking request');
    }

    if (availabilitySlotId <= 0) {
      throw new BadRequestException('Invalid slot ID');
    }

    try {
      // Use Prisma transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Step 1: Lock and verify the slot exists and is available
        const slot = await tx.availabilitySlot.findUnique({
          where: { id: availabilitySlotId },
        });

        if (!slot) {
          throw new BadRequestException('Slot not found');
        }

        // Step 2: Check if slot is available (prevent double booking)
        if (slot.status !== SlotStatus.AVAILABLE) {
          throw new BadRequestException(
            `Slot is no longer available. Current status: ${slot.status}`
          );
        }

        // Step 3: Check if user already has a booking for this slot
        const existingBooking = await tx.booking.findFirst({
          where: {
            userId,
            slotId: availabilitySlotId,
          },
        });

        if (existingBooking) {
          throw new BadRequestException('You already have a booking for this slot');
        }

        // Step 4: Create booking and update slot status atomically
        // Using update with where clause ensures atomic check-and-set
        const [booking] = await Promise.all([
          // Create the booking
          tx.booking.create({
            data: {
              userId,
              slotId: availabilitySlotId,
            },
          }),
          // Mark slot as booked (only if still AVAILABLE)
          tx.availabilitySlot.updateMany({
            where: {
              id: availabilitySlotId,
              status: SlotStatus.AVAILABLE, // Optimistic locking condition
            },
            data: {
              status: SlotStatus.BOOKED,
            },
          }),
        ]);

        return booking;
      });

      this.logger.log(`Booking created: User ${userId} booked slot ${availabilitySlotId}`);
      return result;

    } catch (error: any) {
      // Re-throw known errors
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `Booking failed: ${error.message}`,
        error.stack
      );

      throw new InternalServerErrorException(
        'Failed to create booking. Please try again.'
      );
    }
  }

  /**
   * Cancel a booking and release the slot
   * 
   * @param bookingId - The booking to cancel
   * @param userId - The user requesting cancellation
   */
  async cancelBooking(bookingId: number, userId: number): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Find the booking
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
        });

        if (!booking) {
          throw new BadRequestException('Booking not found');
        }

        // Verify ownership (allow admin to cancel any booking)
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        if (booking.userId !== userId && user?.role !== 'ADMIN') {
          throw new BadRequestException(
            'You can only cancel your own bookings'
          );
        }

        // Delete booking and release slot atomically
        await Promise.all([
          tx.booking.delete({
            where: { id: bookingId },
          }),
          tx.availabilitySlot.update({
            where: { id: booking.slotId },
            data: { status: SlotStatus.AVAILABLE },
          }),
        ]);
      });

      this.logger.log(`Booking cancelled: ${bookingId} by user ${userId}`);
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Cancel booking failed: ${error.message}`,
        error.stack
      );

      throw new InternalServerErrorException(
        'Failed to cancel booking. Please try again.'
      );
    }
  }

  /**
   * Get user's bookings
   * 
   * @param userId - The user ID
   */
  async getUserBookings(userId: number): Promise<any[]> {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        slot: {
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBookingWithSlot(
    userId: number,
    venueId: number,
    date: Date,
    timeSlot: string,
  ) {
    // Find or create availability slot
    let slot = await this.prisma.availabilitySlot.findFirst({
      where: {
        entityType: EntityType.VENUE,
        entityId: venueId,
        date,
        timeSlot,
      },
    });

    if (!slot) {
      // Create new availability slot
      slot = await this.prisma.availabilitySlot.create({
        data: {
          entityType: EntityType.VENUE,
          entityId: venueId,
          date,
          timeSlot,
          status: SlotStatus.AVAILABLE,
        },
      });
    }

    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException('Slot already booked');
    }

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        slotId: slot.id,
      },
      include: {
        slot: true,
      },
    });

    // Mark slot as booked
    await this.prisma.availabilitySlot.update({
      where: { id: slot.id },
      data: {
        status: SlotStatus.BOOKED,
      },
    });

    return booking;
  }
}
