import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import type { AuthRequest } from '../../auth/auth-request.interface';

@ApiTags('Booking')
@ApiBearerAuth()
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // Create a new booking
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new booking for venue or vendor service' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['entityType', 'entityId', 'date', 'timeSlot'],
      properties: {
        entityType: { type: 'string', enum: ['VENUE', 'VENDOR_SERVICE'], example: 'VENUE' },
        entityId: { type: 'number', example: 1 },
        date: { type: 'string', format: 'date', example: '2026-04-15' },
        timeSlot: { type: 'string', enum: ['MORNING', 'EVENING', 'FULL_DAY'], example: 'EVENING' },
        guestCount: { type: 'number', example: 200 },
        specialRequests: { type: 'string', example: 'Need extra chairs' },
        eventId: { type: 'number', example: 1 },
      }
    }
  })
  async createBooking(
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {
    // Validate required fields
    if (!body.entityType || !body.entityId || !body.date || !body.timeSlot) {
      throw new BadRequestException('entityType, entityId, date, and timeSlot are required');
    }

    return this.bookingService.createBooking({
      ...body,
      customerId: req.user.userId,
    });
  }

  // Create booking (alias for /booking/create)
  @UseGuards(JwtAuthGuard)
  @Post('create')
  @ApiOperation({ summary: 'Create a new booking (alias for POST /)' })
  async createBookingAlias(
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {
    if (!body.entityType || !body.entityId || !body.date || !body.timeSlot) {
      throw new BadRequestException('entityType, entityId, date, and timeSlot are required');
    }

    return this.bookingService.createBooking({
      ...body,
      customerId: req.user.userId,
    });
  }

  // Get bookings for venue owner
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('owner')
  @ApiOperation({ summary: 'Get bookings for venue owner' })
  getVenueOwnerBookings(@Req() req: AuthRequest) {
    return this.bookingService.getVenueOwnerBookings(req.user.userId);
  }

  // Get bookings for customer (my bookings)
  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiOperation({ summary: 'Get my bookings (customer)' })
  getMyBookings(@Req() req: AuthRequest) {
    return this.bookingService.getCustomerBookings(req.user.userId);
  }

  // Get booking by ID
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Booking ID' })
  @ApiOperation({ summary: 'Get booking by ID' })
  async getBookingById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.bookingService.getBookingById(id, req.user.userId, req.user.role);
  }

  // Update booking status (for venue owner to accept/reject bookings)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER, Role.ADMIN)
  @Patch(':id/status')
  @ApiParam({ name: 'id', type: Number, description: 'Booking ID' })
  @ApiOperation({ summary: 'Update booking status (accept/reject)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] },
        reason: { type: 'string' }
      }
    }
  })
  async updateBookingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; reason?: string },
    @Req() req: any,
  ) {
    return this.bookingService.updateBookingStatus(
      id,
      body.status.toUpperCase(),
      req.user.userId,
      req.user.role as string
    );
  }

  // Cancel booking (customer can cancel their own booking)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  @ApiParam({ name: 'id', type: Number, description: 'Booking ID' })
  @ApiOperation({ summary: 'Cancel booking' })
  async cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.bookingService.cancelBooking(id, req.user.userId);
  }

  // Mark booking as complete (venue owner)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER, Role.ADMIN)
  @Patch(':id/complete')
  @ApiParam({ name: 'id', type: Number, description: 'Booking ID' })
  @ApiOperation({ summary: 'Mark booking as complete' })
  async completeBooking(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.bookingService.completeBooking(id, req.user.userId, req.user.role as string);
  }

  // Delete booking
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER, Role.ADMIN)
  @Delete(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Booking ID' })
  @ApiOperation({ summary: 'Delete booking' })
  async deleteBooking(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.bookingService.deleteBooking(id, req.user.userId, req.user.role as string);
  }
}
