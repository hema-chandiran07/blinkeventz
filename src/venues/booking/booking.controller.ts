import { Controller, Post, UseGuards, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import{ApiTags} from '@nestjs/swagger';
@ApiTags('Booking')
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
}
