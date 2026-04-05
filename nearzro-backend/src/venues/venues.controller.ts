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
  UseInterceptors,
  UploadedFiles,
  NotFoundException,
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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

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
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  // ============================================
  // BLOCK 1: ALL STATIC GET ROUTES (MUST BE FIRST)
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

  /// 🏢 VENUE OWNER → Get my venues
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('owner/my-venues')
  getMyVenues(@Req() req: any) {
    return this.venuesService.getVenuesByOwner(req.user.userId);
  }

  /// Get current user profile (debug)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  getProfile(@Req() req) {
    return req.user;
  }

  /// 🏢 VENUE OWNER → Get my venue (Frontend Alias)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('my')
  async getMyVenueAlias(@Req() req: any) {
    const ownerId = req.user.userId;
    const venues = await this.venuesService.getVenuesByOwner(ownerId);
    return venues;
  }

  /// Get venue owner stats (frontend expects /venues/owner/stats)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('owner/stats')
  getVenueOwnerStats(@Req() req: any) {
    return this.venuesService.getVenueOwnerStats(req.user.userId);
  }

  // ============================================
  // BLOCK 2: ALL STATIC POST/PATCH ROUTES
  // ============================================

  /// 🏢 VENUE OWNER → Create venue
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Post()
  createVenue(@Req() req: any, @Body() dto: CreateVenueDto) {
    return this.venuesService.createVenue(dto, req.user.userId);
  }

  /// 🏢 VENUE OWNER → Update my venue (no ID param, uses JWT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Patch('my')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'venueImages', maxCount: 5 },
      { name: 'kycDocFiles', maxCount: 5 },
      { name: 'venueGovtCertificateFiles', maxCount: 5 },
    ], {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async updateMyVenue(
    @Req() req: any,
    @Body() dto: Partial<CreateVenueDto>,
    @UploadedFiles() files: { venueImages?: Express.Multer.File[], kycDocFiles?: Express.Multer.File[], venueGovtCertificateFiles?: Express.Multer.File[] },
  ) {
    const ownerId = req.user.userId;
    const venues = await this.venuesService.getVenuesByOwner(ownerId);
    if (!venues || venues.length === 0) throw new NotFoundException('No venue found for this owner');

    const venueImageUrls = files?.venueImages?.map(f => `/uploads/${f.filename}`) || [];
    const kycDocUrls = files?.kycDocFiles?.map(f => `/uploads/${f.filename}`) || [];
    const govtCertUrls = files?.venueGovtCertificateFiles?.map(f => `/uploads/${f.filename}`) || [];

    return this.venuesService.updateVenue(venues[0].id, dto, ownerId, venueImageUrls, kycDocUrls, govtCertUrls);
  }

  // ============================================
  // BLOCK 3: ALL DYNAMIC :id ROUTES (ABSOLUTELY LAST)
  // ============================================

  /// 👑 ADMIN → Approve venue
  @ApiBearerAuth()
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
  @ApiBearerAuth()
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

  /// Update venue availability
  @ApiBearerAuth()
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

  /// 🏢 VENUE OWNER → Update venue (ownership guard) with images and KYC
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Patch(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'venueImages', maxCount: 5 },
      { name: 'kycDocFiles', maxCount: 5 },
      { name: 'venueGovtCertificateFiles', maxCount: 5 },
    ], {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  updateVenue(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() dto: Partial<CreateVenueDto>,
    @UploadedFiles() files: { venueImages?: Express.Multer.File[], kycDocFiles?: Express.Multer.File[], venueGovtCertificateFiles?: Express.Multer.File[] },
  ) {
    const venueImageUrls = files?.venueImages?.map(f => `/uploads/${f.filename}`) || [];
    const kycDocUrls = files?.kycDocFiles?.map(f => `/uploads/${f.filename}`) || [];
    const govtCertUrls = files?.venueGovtCertificateFiles?.map(f => `/uploads/${f.filename}`) || [];
    return this.venuesService.updateVenue(id, dto, req.user.userId, venueImageUrls, kycDocUrls, govtCertUrls);
  }

  /// 🏢 VENUE OWNER → Delete venue (ownership guard)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Delete(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  deleteVenue(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.venuesService.deleteVenue(id, req.user.userId);
  }

  // ============================================
  // 👤 PUBLIC → Get single venue by ID (TRULY LAST)
  // ============================================
  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  getVenueById(@Param('id', ParseIntPipe) id: number) {
    return this.venuesService.findById(id);
  }
}
