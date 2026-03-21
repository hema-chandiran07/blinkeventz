import { Controller, Post, Get, UseGuards, Body, Req, Param, ParseIntPipe } from '@nestjs/common';
import { Request } from 'express';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import{ApiBearerAuth,ApiTags,ApiParam} from '@nestjs/swagger';
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

  // Get bookings for a specific venue
  @UseGuards(JwtAuthGuard)
  @Get('venue/:venueId')
  @ApiParam({ name: 'venueId', type: Number })
  getVenueBookings(@Param('venueId', ParseIntPipe) venueId: number) {
    return this.bookingService.getVenueBookings(venueId);
  }

  // Get bookings for venue owner
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENUE_OWNER')
  @Get('owner')
  getVenueOwnerBookings(@Req() req: Request & { user: { userId: number } }) {
    return this.bookingService.getVenueOwnerBookings(req.user.userId);
  }
}
