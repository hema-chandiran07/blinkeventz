import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VenuesService } from '../venues.service';
import { VendorsService } from '../../vendors/vendors.service';

@ApiTags('availability')
@ApiBearerAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(
    private availabilityService: AvailabilityService,
    private venuesService: VenuesService,
    private vendorsService: VendorsService,
  ) {}

  // ============================================================================
  // VENUE AVAILABILITY ENDPOINTS
  // ============================================================================

  // CREATE AVAILABILITY (VENUE OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Post()
  @ApiOperation({ summary: 'Create venue availability slot' })
  async createAvailability(@Body() body: any, @Req() req: any) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);

    if (venues.length === 0) {
      throw new Error('No venues found for this owner');
    }

    const venueId = body.entityId || body.venueId || venues[0].id;
    const entityType = body.entityType || 'VENUE';

    return this.availabilityService.createWithEntity(
      entityType,
      Number(venueId),
      new Date(body.date),
      body.timeSlot,
    );
  }

  // GET AVAILABILITY BY VENUE - Original endpoint
  @UseGuards(JwtAuthGuard)
  @Get(':venueId')
  @ApiOperation({ summary: 'Get venue availability (original endpoint)' })
  getAvailability(@Param('venueId') venueId: string) {
    return this.availabilityService.findByVenue(Number(venueId));
  }

  // ALIAS: GET /venues/:venueId/availability (frontend expects this)
  @UseGuards(JwtAuthGuard)
  @Get('venues/:venueId/availability')
  @ApiOperation({ summary: 'Get venue availability (alias for frontend)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getVenueAvailability(
    @Param('venueId') venueId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const availability = await this.availabilityService.findByVenue(Number(venueId));
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return availability.filter(slot => {
        const slotDate = new Date(slot.date);
        return slotDate >= start && slotDate <= end;
      });
    }
    
    return availability;
  }

  // CHECK AVAILABILITY FOR SPECIFIC DATE AND TIME SLOT
  @Get('venues/:venueId/availability/check')
  @ApiOperation({ summary: 'Check if specific slot is available' })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'timeSlot', required: true })
  async checkSlotAvailability(
    @Param('venueId') venueId: string,
    @Query('date') date: string,
    @Query('timeSlot') timeSlot: string,
  ) {
    const availability = await this.availabilityService.findByVenue(Number(venueId));
    const slot = availability.find(
      s => s.date.toISOString().split('T')[0] === date && s.timeSlot === timeSlot
    );

    return {
      available: slot ? slot.status === 'AVAILABLE' : false,
      status: slot ? slot.status : 'NOT_FOUND',
      date,
      timeSlot,
    };
  }

  // GET AVAILABILITY FOR SPECIFIC DATE
  @Get('venues/:venueId/availability/date')
  @ApiOperation({ summary: 'Get availability for specific date' })
  @ApiQuery({ name: 'date', required: true })
  async getAvailabilityForDate(
    @Param('venueId') venueId: string,
    @Query('date') date: string,
  ) {
    const availability = await this.availabilityService.findByVenue(Number(venueId));
    const dateStr = date.split('T')[0];
    
    return availability.filter(slot => {
      const slotDate = slot.date.toISOString().split('T')[0];
      return slotDate === dateStr;
    });
  }

  // UPDATE AVAILABILITY SLOT (Block/Unblock)
  @Patch('slots/:slotId')
  @ApiOperation({ summary: 'Update availability slot status' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER, Role.ADMIN)
  async updateSlot(
    @Param('slotId') slotId: string,
    @Body() body: { status?: string; reason?: string },
    @Req() req: any,
  ) {
    return this.availabilityService.updateSlot(Number(slotId), body.status, body.reason);
  }

  // BLOCK MULTIPLE SLOTS (Venue Owner)
  @Post('venue-owner/blocked-slots')
  @ApiOperation({ summary: 'Block multiple availability slots' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  async blockSlots(@Body() body: any, @Req() req: any) {
    const { venueId, dates, timeSlots, reason } = body;
    
    const results: any[] = [];
    for (const date of dates) {
      for (const timeSlot of timeSlots) {
        const result = await this.availabilityService.blockSlot(
          Number(venueId),
          new Date(date),
          timeSlot,
          reason,
        );
        results.push(result);
      }
    }
    
    return { success: true, blocked: results.length };
  }

  // UNBLOCK SLOTS
  @Delete('venue-owner/blocked-slots')
  @ApiOperation({ summary: 'Unblock availability slots' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  async unblockSlots(
    @Body() body?: any,
    @Query('date') queryDate?: string,
    @Query('slot') querySlot?: string,
    @Query('venueId') queryVenueId?: string,
  ) {
    // Support both formats:
    // 1. Query params: ?date=2024-01-01&slot=MORNING (single unblock)
    // 2. Body: { venueId, dates: [], timeSlots: [] } (batch unblock)
    
    const results: any[] = [];
    
    if (queryDate && querySlot) {
      // Single unblock via query params (frontend format)
      const venues = await this.venuesService.getVenuesByOwner(queryVenueId ? 0 : 0);
      const venueId = queryVenueId ? Number(queryVenueId) : (venues.length > 0 ? venues[0].id : 0);
      
      const result = await this.availabilityService.unblockSlot(
        venueId,
        new Date(queryDate),
        querySlot,
      );
      results.push(result);
    } else if (body?.dates && body?.timeSlots) {
      // Batch unblock via body
      const venueId = body.venueId;
      for (const date of body.dates) {
        for (const timeSlot of body.timeSlots) {
          const result = await this.availabilityService.unblockSlot(
            Number(venueId),
            new Date(date),
            timeSlot,
          );
          results.push(result);
        }
      }
    } else {
      throw new BadRequestException('Either query params (date, slot) or body (venueId, dates, timeSlots) are required');
    }

    return { success: true, unblocked: results.length, results };
  }

  // GET BLOCKED SLOTS
  @Get('venue-owner/blocked-slots')
  @ApiOperation({ summary: 'Get blocked slots for venue owner' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  async getBlockedSlots(@Req() req: any) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    const venueIds = venues.map(v => v.id);
    
    const allAvailability: any[] = [];
    for (const venueId of venueIds) {
      const availability = await this.availabilityService.findByVenue(venueId);
      const blocked = availability.filter((s: any) => s.status === 'BLOCKED');
      allAvailability.push(...blocked);
    }
    
    return allAvailability;
  }

  // ============================================================================
  // VENDOR AVAILABILITY ENDPOINTS
  // ============================================================================

  // ALIAS: GET /vendors/:vendorId/availability (for vendor availability)
  @UseGuards(JwtAuthGuard)
  @Get('vendors/:vendorId/availability')
  @ApiOperation({ summary: 'Get vendor availability' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getVendorAvailability(
    @Param('vendorId') vendorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const availability = await this.availabilityService.findByVendor(Number(vendorId));
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return availability.filter(slot => {
        const slotDate = new Date(slot.date);
        return slotDate >= start && slotDate <= end;
      });
    }
    
    return availability;
  }

  // CREATE VENDOR AVAILABILITY
  @Post('vendors')
  @ApiOperation({ summary: 'Create vendor availability slot' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  async createVendorAvailability(@Body() body: any, @Req() req: any) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);
    
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }

    return this.availabilityService.createWithEntity(
      'VENDOR',
      vendor.id,
      new Date(body.date),
      body.timeSlot,
    );
  }
}
