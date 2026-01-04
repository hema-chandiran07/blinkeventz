import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SlotStatus } from '@prisma/client';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  async book(userId: number, availabilitySlotId: number) {
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: availabilitySlotId },
    });

    if (!slot) {
      throw new BadRequestException('Slot not found');
    }

    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException('Slot already booked');
    }

    // create booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        slotId: availabilitySlotId,
      },
    });

    // mark slot as booked
    await this.prisma.availabilitySlot.update({
      where: { id: availabilitySlotId },
      data: {
        status: SlotStatus.BOOKED,
      },
    });

    return booking;
  }
}
