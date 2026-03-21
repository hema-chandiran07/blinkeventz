import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Patch,
  Param,
  Query,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueQueryDto, VenueSearchQueryDto } from './dto/venue-query.dto';
import { ApiBearerAuth, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { VenueOwnerGuard } from './guards/venue-owner.guard';

// Define Role locally
const Role = {
  CUSTOMER: 'CUSTOMER',
  VENDOR: 'VENDOR',
  VENUE_OWNER: 'VENUE_OWNER',
  ADMIN: 'ADMIN',
  EVENT_MANAGER: 'EVENT_MANAGER',
  SUPPORT: 'SUPPORT',
} as const;
export type Role = typeof Role[keyof typeof Role];

@ApiTags('Venues')
@ApiBearerAuth()
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /// 👤 PUBLIC → Get paginated list of approved venues
  @Public()
  @Get()
  getApprovedVenues(@Query() query: VenueQueryDto) {
    return this.venuesService.getApprovedVenues(query);
  }

  /// 👤 PUBLIC → Search venues
  @Public()
  @Get('search')
  searchVenues(@Query() query: VenueSearchQueryDto) {
    return this.venuesService.searchVenues(query);
  }

  // ============================================
  // VENUE OWNER ENDPOINTS
  // ============================================

  /// 🏢 VENUE OWNER → Create venue
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Post()
  createVenue(@Req() req: any, @Body() dto: CreateVenueDto) {
    return this.venuesService.createVenue(dto, req.user.userId);
  }

  /// 🏢 VENUE OWNER → Get my venues
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('owner/my-venues')
  getMyVenues(@Req() req: any) {
    return this.venuesService.getVenuesByOwner(req.user.userId);
  }

  // ============================================
  // ADMIN ENDPOINTS (must be BEFORE :id routes)
  // ============================================

  /// 👑 ADMIN → Approve venue
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  async approveVenue(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.venuesService.approveVenue(id);
    } catch (error: any) {
      console.error('Error approving venue:', error);
      throw error;
    }
  }

  /// 👑 ADMIN → Reject venue
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  async rejectVenue(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    try {
      return await this.venuesService.rejectVenue(id, reason);
    } catch (error: any) {
      console.error('Error rejecting venue:', error);
      throw error;
    }
  }

  // ============================================
  // DYNAMIC :id ROUTES (must be AFTER specific routes)
  // ============================================

  /// 🏢 VENUE OWNER → Update venue (ownership guard)
  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Patch(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  updateVenue(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() dto: Partial<CreateVenueDto>,
  ) {
    return this.venuesService.updateVenue(id, dto, req.user.userId);
  }

  /// 🏢 VENUE OWNER → Delete venue (ownership guard)
  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Delete(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  deleteVenue(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.venuesService.deleteVenue(id, req.user.userId);
  }

  /// 👤 PUBLIC → Get single venue by ID (MUST BE LAST)
  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  getVenueById(@Param('id', ParseIntPipe) id: number) {
    return this.venuesService.findById(id);
  }

  // ============================================
  // MISC ENDPOINTS
  // ============================================

  /// Get current user profile (debug)
  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  getProfile(@Req() req) {
    return req.user;
  }

  // ============================================
  // ALIAS ENDPOINTS FOR FRONTEND COMPATIBILITY
  // ============================================

  /// ALIAS: Get my venues (frontend expects /venues/my)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('my')
  getMyVenuesAlias(@Req() req: any) {
    return this.venuesService.getVenuesByOwner(req.user.userId);
  }

  /// Get venue owner stats (frontend expects /venues/owner/stats)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('owner/stats')
  getVenueOwnerStats(@Req() req: any) {
    return this.venuesService.getVenueOwnerStats(req.user.userId);
  }

  /// Update venue availability
  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Patch(':id/availability')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  updateAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { availability: { date: string; timeSlot: string; status: string }[] },
  ) {
    return this.venuesService.updateAvailability(id, req.user.userId, body.availability);
  }
}
