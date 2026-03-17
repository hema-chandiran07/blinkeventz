import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Patch,
  Param,
<<<<<<< Updated upstream
  Query,
  Delete,
  ParseIntPipe,
=======
  Put,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
>>>>>>> Stashed changes
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueQueryDto, VenueSearchQueryDto, VenueIdParamDto } from './dto/venue-query.dto';
import { ApiBearerAuth, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
<<<<<<< Updated upstream
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
=======
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

// DTOs for blocked slots
export class CreateBlockedSlotDto {
  @IsString()
  date: string;

  @IsString()
  timeSlot: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DeleteBlockedSlotQuery {
  @IsString()
  date: string;

  @IsString()
  slot: string;
}
>>>>>>> Stashed changes

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

  /// 👤 PUBLIC → Get single venue by ID
  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  getVenueById(@Param('id', ParseIntPipe) id: number) {
    return this.venuesService.findById(id);
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

  // ============================================
  // ADMIN ENDPOINTS
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

<<<<<<< Updated upstream
  // ============================================
  // MISC ENDPOINTS
  // ============================================

  /// Get current user profile (debug)
  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  getProfile(@Req() req) {
    return req.user;
  }
=======
  // 🟢 FIX: Change Role.OWNER to Role.VENUE_OWNER
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER)
@Get('my')
getMyVenues(@Req() req: any) {
  return this.venuesService.getVenuesByOwner(req.user.userId);
}

// Venue Owner - Get bookings for their venues
@UseGuards(JwtAuthGuard)
@Get('venue-owner/bookings')
async getVenueOwnerBookings(@Req() req: any) {
  return this.venuesService.getVenueOwnerBookings(req.user.userId);
}

// Venue Owner - Get dashboard stats
@UseGuards(JwtAuthGuard)
@Get('venue-owner/stats')
async getVenueOwnerStats(@Req() req: any) {
  return this.venuesService.getVenueOwnerStats(req.user.userId);
}

// Venue Owner - Get blocked slots
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER)
@Get('venue-owner/blocked-slots')
async getBlockedSlots(@Req() req: any) {
  return this.venuesService.getBlockedSlots(req.user.userId);
}

// Venue Owner - Create blocked slot
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER)
@Post('venue-owner/blocked-slots')
async createBlockedSlot(@Req() req: any, @Body() dto: CreateBlockedSlotDto) {
  return this.venuesService.createBlockedSlot(req.user.userId, dto);
}

// Venue Owner - Delete blocked slot
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER)
@Delete('venue-owner/blocked-slots')
async deleteBlockedSlot(@Req() req: any, @Body() query: DeleteBlockedSlotQuery) {
  return this.venuesService.deleteBlockedSlot(req.user.userId, query.date, query.slot);
}

// Venue Owner - Get analytics
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER)
@Get('venue-owner/analytics')
async getVenueOwnerAnalytics(@Req() req: any, @Query('timeRange') timeRange?: string) {
  return this.venuesService.getVenueOwnerAnalytics(req.user.userId, timeRange || '6m');
}

@UseGuards(JwtAuthGuard)
@Get('me')
getProfile(@Req() req) {
  return req.user;
}

// Update venue
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER)
@Put(':id')
async updateVenue(
  @Req() req: any,
  @Param('id') id: string,
  @Body() dto: CreateVenueDto,
) {
  return this.venuesService.updateVenue(+id, req.user.userId, dto);
}

// Delete venue
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER)
@Delete(':id')
async deleteVenue(
  @Req() req: any,
  @Param('id') id: string,
) {
  return this.venuesService.deleteVenue(+id, req.user.userId);
}

// Upload venue photo
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER)
@Post(':id/photos')
@UseInterceptors(
  FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads/venues',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `venue-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only image files are allowed'), false);
      }
    },
  }),
)
async uploadPhoto(
  @Req() req: any,
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
  @Body('isCover') isCover: string,
) {
  return this.venuesService.uploadVenuePhoto(
    +id,
    req.user.userId,
    file,
    isCover === 'true',
  );
}
>>>>>>> Stashed changes
}
