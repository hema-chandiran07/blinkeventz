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
  UploadedFile,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { VenuesService } from './venues.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseStorageService } from '../storage/database-storage.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueQueryDto, VenueSearchQueryDto } from './dto/venue-query.dto';
import { ApiBearerAuth, ApiTags, ApiParam, ApiQuery, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { VenueOwnerGuard } from './guards/venue-owner.guard';
import { PhotoCategory } from '@prisma/client';

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
  constructor(
    private readonly venuesService: VenuesService,
    private readonly prisma: PrismaService,
    private readonly storageService: DatabaseStorageService,
  ) { }

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

  /// Update my venue profile (Frontend Alias for PATCH /venues/me)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Patch('me')
  async updateMyVenueProfile(@Req() req: any, @Body() dto: Partial<CreateVenueDto>, @UploadedFiles() files: any) {
    return this.updateMyVenue(req, dto, files);
  }

  /// Get my venue availability (Frontend Alias for GET /venues/me/availability)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('me/availability')
  async getMyVenueAvailability(@Req() req: any) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    if (!venues || venues.length === 0) return [];

    return this.prisma.availabilitySlot.findMany({
      where: { venueId: { in: venues.map(v => v.id) } },
      orderBy: { date: 'asc' },
    });
  }

  /// Get my venue earnings (Frontend Alias for GET /venues/me/earnings)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('me/earnings')
  async getMyVenueEarnings(@Req() req: any) {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({ where: { ownerId: userId }, select: { id: true } });
    if (venues.length === 0) return { totalEarnings: 0, currency: 'INR' };

    const venueIds = venues.map(v => v.id);
    const payments = await this.prisma.payment.findMany({
      where: { cart: { items: { some: { venueId: { in: venueIds } } } }, status: 'CAPTURED' },
      include: { cart: { include: { items: true } } },
    });

    let totalEarnings = 0;
    payments.forEach((p: any) => {
      const items = p.cart.items.filter((i: any) => venueIds.includes(i.venueId));
      totalEarnings += items.reduce((sum, i) => sum + (Number(i.unitPrice) || 0) * (i.quantity || 1), 0);
    });

    return { totalEarnings, netEarnings: totalEarnings * 0.95, platformFees: totalEarnings * 0.05, currency: 'INR' };
  }

  /// Get my venue reviews (Frontend Alias for GET /venues/me/reviews)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('me/reviews')
  async getMyVenueReviews(@Req() req: any) {
    // This is essentially what VenueReviewsController.getMyReviews does
    // Redirect logic would be better but simple fetch is safer for connectivity check
    const venues = await this.prisma.venue.findMany({ where: { ownerId: req.user.userId }, select: { id: true } });
    if (venues.length === 0) return { reviews: [] };

    const reviews = await this.prisma.review.findMany({
      where: { venueId: { in: venues.map(v => v.id) } },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { reviews };
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'venueImages', maxCount: 10 },
      { name: 'kycDocFiles', maxCount: 5 },
      { name: 'venueGovtCertificateFiles', maxCount: 5 },
    ], {
      storage: memoryStorage(),
    }),
  )
  async createVenue(
    @Req() req: any,
    @Body() dto: CreateVenueDto,
    @UploadedFiles() files: { venueImages?: Express.Multer.File[], kycDocFiles?: Express.Multer.File[], venueGovtCertificateFiles?: Express.Multer.File[] },
  ) {
    const ownerId = req.user.userId;

    // Helper to parse Base64 or existing URLs from DTO
    const parseBodyUrls = (field: any): string[] => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field.split(',').map((u: string) => u.trim()).filter((u: string) => u);
        }
      }
      return [];
    };

    // 1. Process Venue Images
    const uploadedImageUrls = files?.venueImages
      ? await Promise.all(files.venueImages.map(f => this.storageService.storeFile(f)))
      : [];
    const bodyImageUrls = parseBodyUrls((dto as any).venueImages);
    const finalImageUrls = [...new Set([...bodyImageUrls, ...uploadedImageUrls])];

    // 2. Process KYC Documents
    const uploadedKycUrls = files?.kycDocFiles
      ? await Promise.all(files.kycDocFiles.map(f => this.storageService.storeFile(f)))
      : [];
    const bodyKycUrls = parseBodyUrls((dto as any).kycDocFiles);
    const finalKycUrls = [...new Set([...bodyKycUrls, ...uploadedKycUrls])];

    // 3. Process Government Certificates
    const uploadedGovtUrls = files?.venueGovtCertificateFiles
      ? await Promise.all(files.venueGovtCertificateFiles.map(f => this.storageService.storeFile(f)))
      : [];
    const bodyGovtUrls = parseBodyUrls((dto as any).venueGovtCertificateFiles);
    const finalGovtUrls = [...new Set([...bodyGovtUrls, ...uploadedGovtUrls])];

    return this.venuesService.createVenue(dto, ownerId, finalImageUrls, finalKycUrls, finalGovtUrls);
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
      storage: memoryStorage(),
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

    // Helper to parse Base64 or existing URLs from DTO
    const parseBodyUrls = (field: any): string[] => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field.split(',').map((u: string) => u.trim()).filter((u: string) => u);
        }
      }
      return [];
    };

    // 1. Process Venue Images
    const oldVenue = venues[0] as any;
    const oldImageUrls = oldVenue.venueImages || [];
    const uploadedImageUrls = files?.venueImages
      ? await Promise.all(files.venueImages.map(f => this.storageService.storeFile(f, 'venues')))
      : [];
    const bodyImageUrls = parseBodyUrls((dto as any).venueImages);
    const finalImageUrls = [...new Set([...bodyImageUrls, ...uploadedImageUrls])];

    // Purge orphaned venue images
    const orphanedImages = oldImageUrls.filter(url => !finalImageUrls.includes(url));
    for (const url of orphanedImages) {
      await this.storageService.deleteFile(url);
    }

    // 2. Process KYC Documents
    const oldKycUrls = oldVenue.kycDocFiles || [];
    const uploadedKycUrls = files?.kycDocFiles
      ? await Promise.all(files.kycDocFiles.map(f => this.storageService.storeFile(f, 'kyc')))
      : [];
    const bodyKycUrls = parseBodyUrls((dto as any).kycDocFiles);
    const finalKycUrls = [...new Set([...bodyKycUrls, ...uploadedKycUrls])];

    // Purge orphaned KYC docs
    const orphanedKyc = oldKycUrls.filter(url => !finalKycUrls.includes(url));
    for (const url of orphanedKyc) {
      await this.storageService.deleteFile(url);
    }

    // 3. Process Government Certificates
    const oldGovtUrls = oldVenue.venueGovtCertificateFiles || [];
    const uploadedGovtUrls = files?.venueGovtCertificateFiles
      ? await Promise.all(files.venueGovtCertificateFiles.map(f => this.storageService.storeFile(f, 'certificates')))
      : [];
    const bodyGovtUrls = parseBodyUrls((dto as any).venueGovtCertificateFiles);
    const finalGovtUrls = [...new Set([...bodyGovtUrls, ...uploadedGovtUrls])];

    // Purge orphaned Govt certificates
    const orphanedGovt = oldGovtUrls.filter(url => !finalGovtUrls.includes(url));
    for (const url of orphanedGovt) {
      await this.storageService.deleteFile(url);
    }

    return this.venuesService.updateVenue(venues[0].id, dto, ownerId, finalImageUrls, finalKycUrls, finalGovtUrls);
  }

  // ============================================
  // VENUE DASHBOARD ENDPOINTS (NEW)
  // ============================================

  /// 🏢 VENUE OWNER → Upload venue images (stores as base64 in database)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Post('upload-images')
  @ApiOperation({ summary: 'Upload venue images and return data URLs (stored in database)' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
    ], {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
          return callback(new BadRequestException('Only image files (JPG, JPEG, PNG, WEBP) are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadVenueImages(
    @Req() req: any,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ) {
    if (!files || !files.images || files.images.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }

    // Store images in database as base64 data URLs
    const urls = await Promise.all(
      files.images.map(file => this.storageService.storeFile(file))
    );

    return {
      success: true,
      urls,
      count: urls.length,
      message: `${urls.length} image(s) stored in database successfully`,
    };
  }

  /// 🏢 VENUE OWNER → Get my venue profile
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('me')
  async getMyVenue(@Req() req: any) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    return venues;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('me/bookings')
  getMyBookings(@Req() req: any) {
    return this.venuesService.getVenueOwnerBookings(req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Patch('me/bookings/:id/status')
  updateBookingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    return this.venuesService.updateVenueBookingStatus(id, body.status, req.user.userId);
  }

  /// 🏢 VENUE OWNER → Get my availability
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('me/availability')
  async getMyAvailability(@Req() req: any) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    const venueIds = venues.map(v => v.id);

    // Query AvailabilitySlot with venueId
    const availability = await this.prisma.availabilitySlot.findMany({
      where: {
        venueId: { in: venueIds },
      } as any,
      orderBy: { date: 'asc' },
    });
    return availability;
  }

  /// 🏢 VENUE OWNER → Get my analytics
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('me/analytics')
  async getMyAnalytics(@Req() req: any) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    const venueIds = venues.map(v => v.id);

    // Get booking stats by status
    const bookings = await this.prisma.booking.findMany({
      where: {
        slot: {
          venueId: { in: venueIds },
        } as any,
      },
      select: { status: true },
    });

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === "CONFIRMED").length;
    const completedBookings = bookings.filter(b => b.status === "COMPLETED").length;

    // Get revenue from payments (through cart)
    const revenue = await this.prisma.payment.aggregate({
      where: {
        cart: {
          items: {
            some: {
              venueId: { in: venueIds },
            },
          },
        },
        status: 'CAPTURED',
      },
      _sum: { amount: true },
    });

    return {
      totalVenues: venues.length,
      totalBookings,
      confirmedBookings,
      completedBookings,
      totalRevenue: revenue._sum.amount ? revenue._sum.amount / 100 : 0, // Convert paise to rupees
      currency: 'INR',
    };
  }

  // ============================================
  // VENUE ANALYTICS (must be BEFORE :id route to avoid route conflict)
  // These endpoints were in separate VenueAnalyticsController but route /venues/analytics
  // was being caught by /venues/:id in the running Docker container.
  // Moving them here ensures correct route ordering.
  // ============================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('analytics')
  @ApiOperation({ summary: 'Get comprehensive venue analytics' })
  async getVenueAnalytics(@Req() req: any) {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({ where: { ownerId: userId } });
    if (venues.length === 0) {
      return {
        totalRevenue: 0, completedRevenue: 0, totalBookings: 0, completedBookings: 0,
        pendingBookings: 0, cancelledBookings: 0, totalVenues: 0, currency: 'INR',
        monthlyRevenue: [], venuePerformance: [], eventTypeBreakdown: [],
      };
    }
    const venueIds = venues.map(v => v.id);
    const bookings = await this.prisma.booking.findMany({
      where: { slot: { venueId: { in: venueIds } } as any },
      include: { slot: { include: { venue: true } } },
    });

    const calculateBookingAmount = (b: any) => {
      const v = b.slot?.venue;
      if (!v) return 0;
      if (b.slot?.timeSlot === 'morning') return v.basePriceMorning || v.basePriceFullDay || 0;
      if (b.slot?.timeSlot === 'evening') return v.basePriceEvening || v.basePriceFullDay || 0;
      return v.basePriceFullDay || v.basePriceEvening || 0;
    };

    const totalRevenue = bookings.reduce((sum, b: any) => sum + calculateBookingAmount(b), 0);
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
    const completedRevenue = completedBookings.reduce((sum, b: any) => sum + calculateBookingAmount(b), 0);
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
    const pendingBookings = bookings.filter(b => b.status === 'PENDING');
    const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');

    // Monthly revenue
    const now = new Date();
    const monthlyRevenue: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthBookings = bookings.filter(b => {
        const bd = new Date(b.createdAt);
        return bd >= monthStart && bd <= monthEnd;
      });
      const monthRevenue = monthBookings.reduce((sum, b: any) => sum + calculateBookingAmount(b), 0);
      monthlyRevenue.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
        bookings: monthBookings.length,
        averageBookingValue: monthBookings.length > 0 ? Math.round(monthRevenue / monthBookings.length) : 0,
      });
    }

    // Venue performance
    const venuePerformance: any[] = await Promise.all(venues.map(async v => {
      const vBookings = bookings.filter(b => (b as any).slot?.venueId === v.id);
      const vRevenue = vBookings.reduce((sum, b: any) => sum + calculateBookingAmount(b), 0);
      return { id: v.id, name: v.name, bookings: vBookings.length, revenue: vRevenue };
    }));

    // Event type breakdown - use venue type as fallback since slot doesn't have eventType
    const eventTypeMap: Record<string, number> = {};
    bookings.forEach(b => {
      const type = (b as any).slot?.eventType || 'VENUE_BOOKING';
      eventTypeMap[type] = (eventTypeMap[type] || 0) + 1;
    });
    const eventTypeBreakdown = Object.entries(eventTypeMap).map(([type, count]) => ({ type, count }));

    const totalGross = totalRevenue;
    const platformFee = Math.round(totalGross * 0.05);
    const netRevenue = totalGross - platformFee;

    return {
      totalRevenue: totalGross,
      completedRevenue,
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      pendingBookings: pendingBookings.length,
      cancelledBookings: cancelledBookings.length,
      confirmedBookings: confirmedBookings.length,
      totalVenues: venues.length,
      activeVenues: venues.filter(v => v.status === 'ACTIVE').length,
      currency: 'INR',
      platformFee,
      netRevenue,
      effectiveFeeRate: totalGross > 0 ? Math.round((platformFee / totalGross) * 10000) / 100 : 0,
      monthlyRevenue,
      venuePerformance,
      eventTypeBreakdown,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get venue revenue analytics' })
  async getVenueRevenueAnalytics(@Req() req: any) {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({ where: { ownerId: userId } });
    if (venues.length === 0) {
      return { period: 'all', totalGrossRevenue: 0, totalPlatformFee: 0, totalNetRevenue: 0, effectiveFeeRate: 0, breakdown: [], trends: [], currency: 'INR' };
    }
    const venueIds = venues.map(v => v.id);
    const bookings = await this.prisma.booking.findMany({
      where: { slot: { venueId: { in: venueIds } } as any, status: { in: ['COMPLETED', 'CONFIRMED'] } },
      include: { slot: { include: { venue: true } } },
    });

    const calculateBookingAmount = (b: any) => {
      const v = b.slot?.venue;
      if (!v) return 0;
      if (b.slot?.timeSlot === 'morning') return v.basePriceMorning || v.basePriceFullDay || 0;
      if (b.slot?.timeSlot === 'evening') return v.basePriceEvening || v.basePriceFullDay || 0;
      return v.basePriceFullDay || v.basePriceEvening || 0;
    };

    const totalGrossRevenue = bookings.reduce((sum, b: any) => sum + calculateBookingAmount(b), 0);
    const totalPlatformFee = Math.round(totalGrossRevenue * 0.05);
    const totalNetRevenue = totalGrossRevenue - totalPlatformFee;

    // By venue breakdown
    const breakdown = venues.map(v => {
      const vBookings = bookings.filter(b => (b as any).slot?.venueId === v.id);
      const vRevenue = vBookings.reduce((sum, b: any) => sum + calculateBookingAmount(b), 0);
      return { venueId: v.id, venueName: v.name, grossRevenue: vRevenue, platformFee: Math.round(vRevenue * 0.05), netRevenue: vRevenue - Math.round(vRevenue * 0.05), bookings: vBookings.length };
    });

    // Monthly trends
    const now = new Date();
    const trends: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthBookings = bookings.filter(b => { const bd = new Date(b.createdAt); return bd >= monthStart && bd <= monthEnd; });
      const monthRevenue = monthBookings.reduce((sum, b: any) => sum + calculateBookingAmount(b), 0);
      trends.push({ month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: monthRevenue, bookings: monthBookings.length });
    }

    return { period: 'all', totalGrossRevenue, totalPlatformFee, totalNetRevenue, effectiveFeeRate: totalGrossRevenue > 0 ? Math.round((totalPlatformFee / totalGrossRevenue) * 10000) / 100 : 0, breakdown, trends, currency: 'INR' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('analytics/occupancy')
  @ApiOperation({ summary: 'Get venue occupancy analytics' })
  async getVenueOccupancyAnalytics(@Req() req: any) {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({ where: { ownerId: userId } });
    if (venues.length === 0) {
      return { totalSlots: 0, bookedSlots: 0, blockedSlots: 0, availableSlots: 0, occupancyRate: 0, currency: 'INR' };
    }
    const venueIds = venues.map(v => v.id);
    const totalSlots = venueIds.length * 3 * 30; // 3 slots/day * 30 days
    const bookings = await this.prisma.booking.findMany({
      where: { slot: { venueId: { in: venueIds } } as any, status: { in: ['COMPLETED', 'CONFIRMED'] } },
    });
    const bookedSlots = bookings.length;
    const occupancyRate = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 10000) / 100 : 0;
    return { totalSlots, bookedSlots, blockedSlots: 0, availableSlots: totalSlots - bookedSlots, occupancyRate, currency: 'INR' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('analytics/events')
  @ApiOperation({ summary: 'Get event type analytics' })
  async getVenueEventAnalytics(@Req() req: any) {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({ where: { ownerId: userId } });
    if (venues.length === 0) {
      return { eventTypes: [], currency: 'INR' };
    }
    const venueIds = venues.map(v => v.id);
    const bookings = await this.prisma.booking.findMany({
      where: { slot: { venueId: { in: venueIds } } as any },
      include: { slot: { include: { venue: true } } },
    });

    const calculateBookingAmount = (b: any) => {
      const v = b.slot?.venue;
      if (!v) return 0;
      if (b.slot?.timeSlot === 'morning') return v.basePriceMorning || v.basePriceFullDay || 0;
      if (b.slot?.timeSlot === 'evening') return v.basePriceEvening || v.basePriceFullDay || 0;
      return v.basePriceFullDay || v.basePriceEvening || 0;
    };

    const eventTypeMap: Record<string, { count: number; revenue: number }> = {};
    bookings.forEach(b => {
      const type = (b as any).slot?.eventType || 'VENUE_BOOKING';
      if (!eventTypeMap[type]) eventTypeMap[type] = { count: 0, revenue: 0 };
      eventTypeMap[type].count++;
      eventTypeMap[type].revenue += calculateBookingAmount(b);
    });
    const eventTypes = Object.entries(eventTypeMap).map(([type, data]) => ({ type, ...data }));
    return { eventTypes, currency: 'INR' };
  }

  // ============================================
  // VENUE PORTFOLIO ENDPOINTS - Advanced Portfolio Management
  // ============================================

  /// 🏢 VENUE OWNER → Get my venue portfolio (rich images with metadata)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('me/portfolio')
  async getMyPortfolio(@Req() req: any) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);

    // Get photos from all venues
    const venueIds = venues.map(v => v.id);
    const portfolioImages = await this.prisma.venuePhoto.findMany({
      where: { venueId: { in: venueIds }, isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    // Count by category
    const categoryCounts: Record<string, number> = {};
    portfolioImages.forEach(img => {
      categoryCounts[img.category] = (categoryCounts[img.category] || 0) + 1;
    });

    const coverImage = portfolioImages.find(img => img.isCover);

    return {
      venues: venues.map(v => ({ id: v.id, name: v.name })),
      totalImages: portfolioImages.length,
      coverImage: coverImage || null,
      images: portfolioImages.map(img => ({
        id: img.id,
        venueId: img.venueId,
        url: img.url,
        title: img.title,
        description: img.description,
        category: img.category,
        order: img.order,
        isCover: img.isCover,
        isFeatured: img.isFeatured,
        quality: img.quality,
        tags: img.tags,
        createdAt: img.createdAt,
      })),
      categories: categoryCounts,
    };
  }

  /// 🏢 VENUE OWNER → Add image to venue portfolio with metadata
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Post('me/portfolio/images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async addPortfolioImage(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { venueId: string; title?: string; description?: string; category?: string; imageUrl?: string; tags?: string; isFeatured?: string },
  ) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    const venue = venues.find(v => v.id === parseInt(body.venueId));

    if (!venue && venues.length > 0) {
      throw new NotFoundException('Venue not found');
    }

    const targetVenue = venue || venues[0];

    let imageUrl: string;

    if (file) {
      imageUrl = await this.storageService.storeFile(file);
    } else if (body.imageUrl) {
      imageUrl = body.imageUrl;
    } else {
      throw new BadRequestException('Either a file or imageUrl is required');
    }

    // Check image limit (max 50 per venue)
    const existingCount = await this.prisma.venuePhoto.count({
      where: { venueId: targetVenue.id, isActive: true },
    });

    if (existingCount >= 50) {
      throw new BadRequestException('Maximum 50 portfolio images allowed per venue');
    }

    // Parse tags if provided
    let tags: string[] = [];
    if (body.tags) {
      try {
        tags = JSON.parse(body.tags);
      } catch {
        tags = body.tags.split(',').map(t => t.trim());
      }
    }

    // Get max order for this venue
    const maxOrder = await this.prisma.venuePhoto.aggregate({
      where: { venueId: targetVenue.id },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order || 0) + 1;

    // Create venue photo with metadata
    const venuePhoto = await this.prisma.venuePhoto.create({
      data: {
        venueId: targetVenue.id,
        url: imageUrl,
        title: body.title || null,
        description: body.description || null,
        category: (body.category || 'GALLERY') as PhotoCategory,
        quality: 'HD',
        tags: tags,
        isCover: false,
        isFeatured: body.isFeatured === 'true',
        order: nextOrder,
      },
    });

    return {
      id: venuePhoto.id,
      url: venuePhoto.url,
      title: venuePhoto.title,
      description: venuePhoto.description,
      category: venuePhoto.category,
      order: venuePhoto.order,
      isCover: venuePhoto.isCover,
      isFeatured: venuePhoto.isFeatured,
      quality: venuePhoto.quality,
      tags: venuePhoto.tags,
      createdAt: venuePhoto.createdAt,
      message: 'Image added to venue portfolio successfully',
    };
  }

  /// 🏢 VENUE OWNER → Update portfolio image metadata
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Patch('me/portfolio/images/:id')
  async updatePortfolioImage(
    @Req() req: any,
    @Param('id', ParseIntPipe) imageId: number,
    @Body() body: { title?: string; description?: string; category?: string; tags?: string[]; isFeatured?: boolean },
  ) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    const venueIds = venues.map(v => v.id);

    const existingImage = await this.prisma.venuePhoto.findFirst({
      where: { id: imageId, venueId: { in: venueIds } },
    });

    if (!existingImage) {
      throw new NotFoundException('Venue photo not found');
    }

    // Validate category
    const validCategories = ['GALLERY', 'MAIN', 'CERTIFICATE', 'BEHIND_SCENES'];
    if (body.category && !validCategories.includes(body.category)) {
      throw new BadRequestException('Invalid category');
    }

    // If setting as cover, unset other covers for this venue
    if (body.category === 'MAIN') {
      await this.prisma.venuePhoto.updateMany({
        where: { venueId: existingImage.venueId, isCover: true, id: { not: imageId } },
        data: { isCover: false },
      });
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
    if (body.category === 'MAIN') updateData.isCover = true;

    updateData.updatedAt = new Date();

    const updatedImage = await this.prisma.venuePhoto.update({
      where: { id: imageId },
      data: updateData,
    });

    return {
      ...updatedImage,
      message: 'Venue photo updated successfully',
    };
  }

  /// 🏢 VENUE OWNER → Set cover image
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Post('me/portfolio/set-cover')
  async setCoverImage(
    @Req() req: any,
    @Body() body: { imageId: number },
  ) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    const venueIds = venues.map(v => v.id);

    const image = await this.prisma.venuePhoto.findFirst({
      where: { id: body.imageId, venueId: { in: venueIds } },
    });

    if (!image) {
      throw new NotFoundException('Venue photo not found');
    }

    // Unset all covers for this venue
    await this.prisma.venuePhoto.updateMany({
      where: { venueId: image.venueId, isCover: true },
      data: { isCover: false },
    });

    // Set new cover
    const updatedImage = await this.prisma.venuePhoto.update({
      where: { id: body.imageId },
      data: { isCover: true, updatedAt: new Date() },
    });

    return {
      success: true,
      message: 'Cover image updated successfully',
      coverImage: updatedImage,
    };
  }

  /// 🏢 VENUE OWNER → Reorder portfolio images
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Patch('me/portfolio/reorder')
  async reorderPortfolioImages(
    @Req() req: any,
    @Body() body: { venueId: number; imageIds: number[] },
  ) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    const venue = venues.find(v => v.id === body.venueId);

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    // Verify all images belong to this venue
    const images = await this.prisma.venuePhoto.findMany({
      where: {
        id: { in: body.imageIds },
        venueId: venue.id,
      },
      select: { id: true },
    });

    if (images.length !== body.imageIds.length) {
      throw new BadRequestException('Some images do not belong to this venue');
    }

    // Update order in transaction
    await this.prisma.$transaction(
      body.imageIds.map((imageId, index) =>
        this.prisma.venuePhoto.update({
          where: { id: imageId },
          data: { order: index, updatedAt: new Date() },
        }),
      ),
    );

    return {
      success: true,
      message: 'Portfolio reordered successfully',
      reorderedCount: body.imageIds.length,
    };
  }

  /// 🏢 VENUE OWNER → Remove image from portfolio (soft delete)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Delete('me/portfolio/images/:id')
  async removePortfolioImage(
    @Req() req: any,
    @Param('id', ParseIntPipe) imageId: number,
  ) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    const venueIds = venues.map(v => v.id);

    const existingImage = await this.prisma.venuePhoto.findFirst({
      where: { id: imageId, venueId: { in: venueIds } },
    });

    if (!existingImage) {
      throw new NotFoundException('Venue photo not found');
    }

    // Soft delete
    await this.prisma.venuePhoto.update({
      where: { id: imageId },
      data: { isActive: false, updatedAt: new Date() },
    });

    return {
      success: true,
      message: 'Image deleted successfully',
    };
  }

  /// 🏢 VENUE OWNER → Restore deleted portfolio image
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Patch('me/portfolio/images/:id/restore')
  async restorePortfolioImage(
    @Req() req: any,
    @Param('id', ParseIntPipe) imageId: number,
  ) {
    const venues = await this.venuesService.getVenuesByOwner(req.user.userId);
    const venueIds = venues.map(v => v.id);

    const existingImage = await this.prisma.venuePhoto.findFirst({
      where: { id: imageId, venueId: { in: venueIds } },
    });

    if (!existingImage) {
      throw new NotFoundException('Venue photo not found');
    }

    await this.prisma.venuePhoto.update({
      where: { id: imageId },
      data: { isActive: true, updatedAt: new Date() },
    });

    return {
      success: true,
      message: 'Image restored successfully',
    };
  }

  // ============================================
  // BLOCK 3: ADMIN ROUTES (ABSOLUTELY LAST BEFORE DYNAMIC :id)
  // ============================================

  /// 👑 ADMIN → Get all venues with full details
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  @ApiOperation({ summary: 'Get all venues (admin only)' })
  async getAllVenuesAdmin() {
    return this.venuesService.findAllAdmin();
  }

  /// 👑 ADMIN → Get single venue with full details and KYC
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  @ApiOperation({ summary: 'Get venue by ID with full admin details' })
  @ApiParam({ name: 'id', type: Number })
  async getVenueByIdAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.venuesService.findByIdAdmin(id);
  }

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

  // ============================================
  // DYNAMIC :id ROUTES (must be AFTER specific routes)
  // ============================================

  /// 🏢 VENUE OWNER → Update venue (ownership guard) with images and KYC
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Patch(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'venueImages', maxCount: 10 },
      { name: 'kycDocFiles', maxCount: 5 },
      { name: 'venueGovtCertificateFiles', maxCount: 5 },
    ], {
      storage: memoryStorage(),
    }),
  )
  async updateVenue(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() dto: Partial<CreateVenueDto>,
    @UploadedFiles() files: { venueImages?: Express.Multer.File[], kycDocFiles?: Express.Multer.File[], venueGovtCertificateFiles?: Express.Multer.File[] },
  ) {
    const ownerId = req.user.userId || req.user.id;

    // Helper to parse Base64 or existing URLs from DTO
    const parseBodyUrls = (field: any): string[] => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field.split(',').map((u: string) => u.trim()).filter((u: string) => u);
        }
      }
      return [];
    };

    // 1. Process Venue Images
    const uploadedImageUrls = files?.venueImages
      ? await Promise.all(files.venueImages.map(f => this.storageService.storeFile(f)))
      : [];
    const bodyImageUrls = parseBodyUrls((dto as any).venueImages);
    const finalImageUrls = [...new Set([...bodyImageUrls, ...uploadedImageUrls])];

    // 2. Process KYC Documents
    const uploadedKycUrls = files?.kycDocFiles
      ? await Promise.all(files.kycDocFiles.map(f => this.storageService.storeFile(f)))
      : [];
    const bodyKycUrls = parseBodyUrls((dto as any).kycDocFiles);
    const finalKycUrls = [...new Set([...bodyKycUrls, ...uploadedKycUrls])];

    // 3. Process Government Certificates
    const uploadedGovtUrls = files?.venueGovtCertificateFiles
      ? await Promise.all(files.venueGovtCertificateFiles.map(f => this.storageService.storeFile(f)))
      : [];
    const bodyGovtUrls = parseBodyUrls((dto as any).venueGovtCertificateFiles);
    const finalGovtUrls = [...new Set([...bodyGovtUrls, ...uploadedGovtUrls])];

    return this.venuesService.updateVenue(id, dto, ownerId, finalImageUrls, finalKycUrls, finalGovtUrls);
  }

  /// 🏢 VENUE OWNER → Delete venue (ownership guard)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, VenueOwnerGuard)
  @Delete(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  deleteVenue(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.venuesService.deleteVenue(id, req.user.userId);
  }

  /// 👤 PUBLIC → Get single venue by ID (MUST BE LAST - after all specific routes)
  // No @ApiBearerAuth() - this is a public endpoint
  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Venue ID' })
  getVenueById(@Param('id', ParseIntPipe) id: number) {
    return this.venuesService.findById(id);
  }

  // ============================================
  // MISC ENDPOINTS
  // ============================================

  // ============================================
  // ALIAS ENDPOINTS FOR FRONTEND COMPATIBILITY
  // ============================================

  /// ALIAS: Get my venues (frontend expects /venues/my)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('my')
  getMyVenuesAlias(@Req() req: any) {
    return this.venuesService.getVenuesByOwner(req.user.userId);
  }

  /// Update venue owner's venue availability (frontend expects /venues/me/availability)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Patch('me/availability')
  @ApiOperation({ summary: 'Update availability for venue owner venues' })
  async updateMyAvailability(
    @Req() req: any,
    @Body() body: { availability: { date: string; timeSlot: string; status: string }[] },
  ) {
    return this.venuesService.updateMyAvailability(req.user.userId, body.availability);
  }

  // ============================================
  // VENUE BLOCKED SLOTS (Calendar Management)
  // ============================================

  /// 🏢 VENUE OWNER → Get blocked slots
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Get('venue-owner/blocked-slots')
  @ApiOperation({ summary: 'Get all blocked slots for venue owner venues' })
  async getBlockedSlots(@Req() req: any) {
    return this.venuesService.getBlockedSlots(req.user.userId);
  }

  /// 🏢 VENUE OWNER → Block a time slot
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Post('venue-owner/blocked-slots')
  @ApiOperation({ summary: 'Block a time slot for venue owner venues' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['date', 'timeSlot'],
      properties: {
        date: { type: 'string', format: 'date' },
        timeSlot: { type: 'string', enum: ['MORNING', 'EVENING', 'FULL_DAY'] },
        reason: { type: 'string' },
        venueId: { type: 'number' }
      }
    }
  })
  async blockSlot(
    @Req() req: any,
    @Body() body: { date: string; timeSlot: string; reason?: string; venueId?: number },
  ) {
    return this.venuesService.blockTimeSlot(req.user.userId, body.date, body.timeSlot, body.reason);
  }

  /// 🏢 VENUE OWNER → Unblock a time slot
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Delete('venue-owner/blocked-slots')
  @ApiOperation({ summary: 'Unblock a time slot for venue owner venues' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['date', 'timeSlot'],
      properties: {
        date: { type: 'string', format: 'date' },
        timeSlot: { type: 'string', enum: ['MORNING', 'EVENING', 'FULL_DAY'] },
        venueId: { type: 'number' }
      }
    }
  })
  async unblockSlot(
    @Req() req: any,
    @Query('date') date: string,
    @Query('slot') slot: string,
    @Query('venueId') venueId?: number,
  ) {
    if (!date || isNaN(new Date(date).getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    // Map 'slot' from frontend to 'timeSlot' logic if needed, 
    // but the service handles the string. Ensure it's not undefined.
    const timeSlot = slot || 'FULL_DAY';

    await this.venuesService.unblockTimeSlot(req.user.userId, date, timeSlot);
    return { success: true, message: 'Slot unblocked successfully' };
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
}
