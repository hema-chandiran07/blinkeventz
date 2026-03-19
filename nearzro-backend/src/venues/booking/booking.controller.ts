import { Controller, Post, UseGuards, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import{ApiBearerAuth,ApiTags} from '@nestjs/swagger';
@ApiTags('Booking')
@ApiBearerAuth()
@Controller('booking')
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  book(
    @Req() req: Request & { user: { sub: number } },
    @Body('availabilitySlotId') availabilitySlotId: number,
  ) {
    return this.bookingService.book(req.user.sub, availabilitySlotId);
  }

  // Create booking with venue, date, and time slot (for frontend checkout)
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createBooking(
    @Req() req: Request & { user: { sub: number } },
    @Body() body: {
      venueId: number;
      date: string;
      timeSlot: string;
    },
  ) {
    return this.bookingService.createBookingWithSlot(
      req.user.sub,
      body.venueId,
      new Date(body.date),
      body.timeSlot,
    );
  }
}
