import {
  Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Req, ParseIntPipe,
  BadRequestException, NotFoundException, ForbiddenException, UseInterceptors, Query, UploadedFile, UploadedFiles
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorsService } from './vendors.service';
import { VendorServicesService } from './vendor-services/vendor-services.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseStorageService } from '../storage/database-storage.service';
import { ApiBearerAuth, ApiTags, ApiParam, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth-request.interface';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { PhotoCategory } from '@prisma/client';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly vendorServicesService: VendorServicesService,
    private readonly prisma: PrismaService,
    private readonly databaseStorageService: DatabaseStorageService,
  ) { }

  // 👤 PUBLIC → view all vendors
  @Public()
  @Get()
  getAllVendors() {
    return this.vendorsService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyVendor(@Req() req: AuthRequest) {
    return this.vendorsService.getVendorByUserId(req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Post()
  createVendor(
    @Req() req: AuthRequest,
    @Body() dto: CreateVendorDto,
  ) {
    return this.vendorsService.createVendor(req.user.userId, dto);
  }

  /**
   * Update vendor profile (JSON only, no file uploads)
   * This endpoint is for simple profile updates without images/files
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Patch('me/profile')
  @ApiOperation({ summary: 'Update vendor profile (JSON only)' })
  async updateVendorProfile(
    @Req() req: AuthRequest,
    @Body() dto: Partial<CreateVendorDto>,
  ) {
    return this.vendorsService.updateVendorProfile(req.user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Patch('me')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'businessImages', maxCount: 5 },
      { name: 'kycDocFiles', maxCount: 5 },
      { name: 'foodLicenseFiles', maxCount: 5 },
    ], {
      storage: memoryStorage(),
    }),
  )
  async updateMyVendor(
    @Req() req: AuthRequest,
    @Body() dto: Partial<CreateVendorDto>,
    @UploadedFiles() files: { businessImages?: Express.Multer.File[], kycDocFiles?: Express.Multer.File[], foodLicenseFiles?: Express.Multer.File[] },
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);
    const oldBusinessImages = vendor.businessImages || [];

    const businessImageUrls = files?.businessImages
      ? await Promise.all(files.businessImages.map(f => this.databaseStorageService.storeFile(f, 'vendors')))
      : [];
    
    // Parse which existing images to keep from the body
    const bodyImages = typeof dto.businessImages === 'string' 
      ? [dto.businessImages] 
      : (Array.isArray(dto.businessImages) ? dto.businessImages : []);
    
    const finalBusinessImages = [...new Set([...bodyImages, ...businessImageUrls])];

    // Purge orphaned physical files
    const orphaned = oldBusinessImages.filter(url => !finalBusinessImages.includes(url));
    for (const url of orphaned) {
      await this.databaseStorageService.deleteFile(url);
    }

    const kycDocUrls = files?.kycDocFiles
      ? await Promise.all(files.kycDocFiles.map(f => this.databaseStorageService.storeFile(f, 'kyc')))
      : [];
    const foodLicenseUrls = files?.foodLicenseFiles
      ? await Promise.all(files.foodLicenseFiles.map(f => this.databaseStorageService.storeFile(f, 'licenses')))
      : [];

    return this.vendorsService.updateVendorByUserId(req.user.userId, dto, finalBusinessImages, kycDocUrls, foodLicenseUrls);
  }

  // ============================================
  // VENDOR DASHBOARD ENDPOINTS
  // ============================================

  /// 🧑‍🔧 VENDOR → Get dashboard stats
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Get('me/dashboard-stats')
  @ApiOperation({ summary: 'Get vendor dashboard statistics' })
  async getDashboardStats(@Req() req: AuthRequest) {
    return this.getDashboardStatsLegacy(req);
  }

  /// 🧑‍🔧 VENDOR → Get my analytics
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Get('me/analytics')
  @ApiOperation({ summary: 'Get detailed vendor analytics' })
  async getMyAnalytics(@Req() req: AuthRequest) {
    return this.vendorsService.getVendorAnalytics(req.user.userId);
  }

  // Get bookings for this vendor
  async getDashboardStatsLegacy(@Req() req: AuthRequest) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    const bookings = await this.prisma.booking.findMany({
      where: {
        slot: {
          vendorId: vendor.id,
        } as any,
      },
      include: {
        slot: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Get services
    const services = await this.vendorServicesService.findByVendorUserId(req.user.userId);

    // Calculate stats
    const totalServices = services.length;
    const activeServices = services.filter((s: any) => s.isActive).length;
    const activeBookings = bookings.filter(
      (b: any) => b.status === 'PENDING' || b.status === 'CONFIRMED'
    ).length;
    const pendingRequests = bookings.filter(
      (b: any) => b.status === 'PENDING'
    ).length;

    // Calculate total earnings from completed bookings
    const totalEarnings = bookings
      .filter((b: any) => b.status === 'COMPLETED' || b.status === 'CONFIRMED')
      .reduce((sum: number, booking: any) => {
        const service = services.find((s: any) => booking.slot && booking.slot.vendorId === vendor.id);
        return sum + (service?.baseRate || vendor.basePrice || 0);
      }, 0);

    return {
      totalServices,
      activeServices,
      activeBookings,
      pendingRequests,
      totalEarnings,
      totalBookings: bookings.length,
      completedBookings: bookings.filter((b: any) => b.status === 'COMPLETED').length,
      cancelledBookings: bookings.filter((b: any) => b.status === 'CANCELLED').length,
    };
  }

  /// 🧑‍🔧 VENDOR → Get my services
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Get('me/services')
  getMyServices(@Req() req: AuthRequest) {
    return this.vendorServicesService.findByVendorUserId(req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Get('me/bookings')
  getMyBookings(@Req() req: any) {
    return this.vendorsService.getVendorBookings(req.user.userId);
  }
  /// 🧑‍🔧 VENDOR → Get my earnings
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Get('me/earnings')
  async getMyEarnings(@Req() req: AuthRequest) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    // Get all bookings for this vendor
    const bookings = await this.prisma.booking.findMany({
      where: {
        slot: {
          vendorId: vendor.id,
        } as any,
      },
      include: {
        slot: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Calculate earnings from bookings
    const PLATFORM_FEE_PERCENTAGE = 5; // 5% platform fee

    // Total earnings from completed bookings
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CONFIRMED');
    const pendingBookings = bookings.filter(b => b.status === 'PENDING');

    // Calculate based on service baseRate for each booking
    const totalGrossEarnings = completedBookings.reduce((sum, booking: any) => {
      // Find the vendor service for this booking
      const service = vendor.services?.find(s =>
        (booking as any).slot && (booking as any).slot.vendorId === vendor.id
      );
      return sum + (service?.baseRate || 0);
    }, 0);

    const pendingEarnings = pendingBookings.reduce((sum, booking: any) => {
      const service = vendor.services?.find(s =>
        (booking as any).slot && (booking as any).slot.vendorId === vendor.id
      );
      return sum + (service?.baseRate || 0);
    }, 0);

    const platformFee = Math.round(totalGrossEarnings * (PLATFORM_FEE_PERCENTAGE / 100));
    const netEarnings = totalGrossEarnings - platformFee;

    // Get vendor's base price from profile for fallback calculation
    const fallbackRate = vendor.basePrice || 0;

    // If no services found, use vendor base price
    const totalEarnings = totalGrossEarnings > 0 ? totalGrossEarnings : (completedBookings.length * fallbackRate);
    const pendingTotal = pendingEarnings > 0 ? pendingEarnings : (pendingBookings.length * fallbackRate);

    return {
      totalEarnings: totalEarnings,
      pendingEarnings: pendingTotal,
      platformFees: Math.round(totalEarnings * (PLATFORM_FEE_PERCENTAGE / 100)),
      netEarnings: totalEarnings - Math.round(totalEarnings * (PLATFORM_FEE_PERCENTAGE / 100)),
      currency: 'INR',
      bookingCount: completedBookings.length,
      pendingBookingCount: pendingBookings.length,
      totalBookings: bookings.length,
      averageBookingValue: bookings.length > 0 ? Math.round(totalEarnings / bookings.length) : 0,
    };
  }

  /// Get my vendor reviews (Frontend Alias for GET /vendors/me/reviews)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Get('me/reviews')
  async getMyVendorReviews(@Req() req: AuthRequest) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);
    const reviews = await this.prisma.review.findMany({
      where: { vendorId: vendor.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { reviews };
  }

  /// 🧑‍🔧 VENDOR → Get my availability
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Get('me/availability')
  async getMyAvailability(@Req() req: AuthRequest) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    // Query AvailabilitySlot with vendorId
    const availability = await this.prisma.availabilitySlot.findMany({
      where: {
        vendorId: vendor.id,
      } as any,
      orderBy: { date: 'asc' },
    });
    return availability;
  }

  /// 🧑‍🔧 VENDOR → Update my availability (frontend expects PATCH /vendors/me/availability)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Patch('me/availability')
  @ApiOperation({ summary: 'Update vendor availability slots' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['availability'],
      properties: {
        availability: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              timeSlot: { type: 'string', enum: ['MORNING', 'EVENING', 'FULL_DAY'] },
              status: { type: 'string', enum: ['AVAILABLE', 'BLOCKED', 'BOOKED'] }
            }
          }
        }
      }
    }
  })
  async updateMyAvailability(
    @Req() req: AuthRequest,
    @Body() body: { availability: { date: string; timeSlot: string; status: string }[] }
  ) {
    return this.vendorsService.updateMyAvailability(req.user.userId, body.availability);
  }

  // ============================================
  // VENDOR CALENDAR BLOCKING (CRITICAL BUSINESS LOGIC)
  // ============================================

  /// 🧑‍🔧 VENDOR → Block a time slot (make unavailable)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Post('me/availability/block')
  @ApiOperation({ summary: 'Block a time slot (make unavailable)' })
  @ApiBody({ schema: { type: 'object', required: ['date', 'timeSlot'], properties: { date: { type: 'string', format: 'date' }, timeSlot: { type: 'string', enum: ['MORNING', 'EVENING', 'FULL_DAY'] }, reason: { type: 'string' } } } })
  async blockTimeSlot(
    @Req() req: AuthRequest,
    @Body() body: { date: string; timeSlot: string; reason?: string }
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    // Create or update availability slot to BLOCKED
    const existingSlot = await this.prisma.availabilitySlot.findFirst({
      where: {
        vendorId: vendor.id,
        date: new Date(body.date),
        timeSlot: body.timeSlot,
      } as any,
    });

    if (existingSlot) {
      // Update existing slot to BLOCKED
      const updatedSlot = await this.prisma.availabilitySlot.update({
        where: { id: existingSlot.id },
        data: {
          status: 'BLOCKED',
        },
      });
      return updatedSlot;
    } else {
      // Create new BLOCKED slot
      const newSlot = await this.prisma.availabilitySlot.create({
        data: {
          entityType: 'VENDOR',
          vendorId: vendor.id,
          date: new Date(body.date),
          timeSlot: body.timeSlot,
          status: 'BLOCKED',
        },
      });
      return newSlot;
    }
  }
  /// 🧑‍🔧 VENDOR → Unblock a time slot (make available)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Delete('me/availability/:slotId')
  @ApiOperation({ summary: 'Unblock a time slot (make available)' })
  @ApiParam({ name: 'slotId', type: Number, description: 'Availability Slot ID' })
  async unblockTimeSlot(
    @Req() req: AuthRequest,
    @Param('slotId', ParseIntPipe) slotId: number
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    // Verify slot belongs to this vendor
    const slot = await this.prisma.availabilitySlot.findFirst({
      where: {
        id: slotId,
        vendorId: vendor.id,
      } as any,
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    // Update to AVAILABLE
    const updatedSlot = await this.prisma.availabilitySlot.update({
      where: { id: slotId },
      data: {
        status: 'AVAILABLE',
      },
    });

    return updatedSlot;
  }

  /// 🧑‍🔧 VENDOR → Create availability slot
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Post('me/availability')
  @ApiOperation({ summary: 'Create availability slot' })
  @ApiBody({ schema: { type: 'object', required: ['date', 'timeSlot'], properties: { date: { type: 'string', format: 'date' }, timeSlot: { type: 'string', enum: ['MORNING', 'EVENING', 'FULL_DAY'] }, status: { type: 'string', enum: ['AVAILABLE', 'BLOCKED'], default: 'AVAILABLE' } } } })
  async createAvailabilitySlot(
    @Req() req: AuthRequest,
    @Body() body: { date: string; timeSlot: string; status?: string }
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    // Check if slot already exists
    const existingSlot = await this.prisma.availabilitySlot.findFirst({
      where: {
        vendorId: vendor.id,
        date: new Date(body.date),
        timeSlot: body.timeSlot,
      } as any,
    });

    if (existingSlot) {
      throw new BadRequestException('Availability slot already exists for this date and time');
    }

    // Create new slot
    const newSlot = await this.prisma.availabilitySlot.create({
      data: {
        entityType: 'VENDOR',
        vendorId: vendor.id,
        date: new Date(body.date),
        timeSlot: body.timeSlot,
        status: (body.status as any) || 'AVAILABLE',
      },
    });

    return newSlot;
  }

  // ============================================
  // VENDOR BOOKING STATUS UPDATE (CRITICAL BUSINESS LOGIC)
  // ============================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Patch('me/bookings/:id/status')
  updateBookingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    return this.vendorsService.updateVendorBookingStatus(id, body.status, req.user.userId);
  }

  // ============================================
  // VENDOR PORTFOLIO ENDPOINTS - ENHANCED with PortfolioImage model
  // ============================================

  /// 🧑‍🔧 VENDOR → Get my portfolio (rich images with metadata)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Get('me/portfolio')
  async getMyPortfolio(@Req() req: AuthRequest) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    // Get rich portfolio images from PortfolioImage model
    const portfolioImages = await this.prisma.portfolioImage.findMany({
      where: { vendorId: vendor.id, isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    // Count by category
    const categoryCounts: Record<string, number> = {};
    portfolioImages.forEach(img => {
      categoryCounts[img.category] = (categoryCounts[img.category] || 0) + 1;
    });

    const coverImage = portfolioImages.find(img => img.isCover);

    return {
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      totalImages: portfolioImages.length,
      coverImage: coverImage || null,
      images: portfolioImages.map(img => ({
        id: img.id,
        url: img.imageUrl,
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

  /// 🧑‍🔧 VENDOR → Add image to portfolio with metadata
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Post('me/portfolio/images')
  @UseInterceptors(FileInterceptor('file'))
  async addPortfolioImage(
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; description?: string; category?: string; imageUrl?: string; tags?: string; isFeatured?: string },
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    let imageUrl: string;

    if (file) {
      // Handle file upload - convert to base64 data URL
      imageUrl = await this.databaseStorageService.storeFile(file);
    } else if (body.imageUrl) {
      // Fallback: accept URL if provided (for backward compatibility)
      imageUrl = body.imageUrl;
    } else {
      throw new BadRequestException('Either a file or imageUrl is required');
    }

    // Check image limit (max 50)
    const existingCount = await this.prisma.portfolioImage.count({
      where: { vendorId: vendor.id, isActive: true },
    });

    if (existingCount >= 50) {
      throw new BadRequestException('Maximum 50 portfolio images allowed');
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

    // Validate and normalize category
    const validCategories = [
      'GALLERY', 'MAIN', 'CERTIFICATE', 'BEHIND_SCENES', 'WORK_SAMPLE', // System categories
      'WEDDING', 'ENGAGEMENT', 'RECEPTION', 'PREWEDDING', 'CORPORATE', 'BIRTHDAY', 'OTHER' // Event categories
    ];
    const normalizedCategory = body.category?.toUpperCase() || 'GALLERY';

    if (!validCategories.includes(normalizedCategory)) {
      throw new BadRequestException(
        `Invalid category: "${body.category}". Must be one of: ${validCategories.join(', ')}`
      );
    }

    // Get max order for this vendor
    const maxOrder = await this.prisma.portfolioImage.aggregate({
      where: { vendorId: vendor.id },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order || 0) + 1;

    // Create portfolio image with metadata
    const portfolioImage = await this.prisma.portfolioImage.create({
      data: {
        vendorId: vendor.id,
        imageUrl,
        title: body.title || null,
        description: body.description || null,
        category: normalizedCategory as PhotoCategory,
        quality: 'HD',
        tags: tags,
        isCover: false,
        isFeatured: body.isFeatured === 'true',
        order: nextOrder,
      },
    });

    return {
      id: portfolioImage.id,
      url: portfolioImage.imageUrl,
      title: portfolioImage.title,
      description: portfolioImage.description,
      category: portfolioImage.category,
      order: portfolioImage.order,
      isCover: portfolioImage.isCover,
      isFeatured: portfolioImage.isFeatured,
      quality: portfolioImage.quality,
      tags: portfolioImage.tags,
      createdAt: portfolioImage.createdAt,
      message: 'Image added to portfolio successfully',
    };
  }

  /// 🧑‍🔧 VENDOR → Update portfolio (reorder/set cover via image URLs array)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Patch('me/portfolio')
  async updatePortfolio(
    @Req() req: AuthRequest,
    @Body() body: { images?: string[] },
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
      throw new BadRequestException('Images array is required');
    }

    // Get all portfolio images for this vendor
    const allImages = await this.prisma.portfolioImage.findMany({
      where: { vendorId: vendor.id },
      orderBy: { order: 'asc' },
    });

    // Update order and cover status based on the provided image URLs
    const firstUrl = body.images[0];
    const updatePromises = allImages.map((img, index) => {
      const isCover = img.imageUrl === firstUrl;
      return this.prisma.portfolioImage.update({
        where: { id: img.id },
        data: {
          order: index,
          isCover,
        },
      });
    });

    await Promise.all(updatePromises);

    return {
      message: 'Portfolio updated successfully',
      coverImageUrl: firstUrl,
    };
  }

  /// 🧑‍🔧 VENDOR → Update portfolio image metadata
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Patch('me/portfolio/images/:id')
  async updatePortfolioImage(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) imageId: number,
    @Body() body: { title?: string; description?: string; category?: string; tags?: string[]; isFeatured?: boolean },
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    const existingImage = await this.prisma.portfolioImage.findUnique({
      where: { id: imageId },
    });

    if (!existingImage) {
      throw new NotFoundException('Portfolio image not found');
    }

    if (existingImage.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not have permission to modify this image');
    }

    // Validate category
    const validCategories = ['GALLERY', 'MAIN', 'CERTIFICATE', 'BEHIND_SCENES', 'WORK_SAMPLE'];
    if (body.category && !validCategories.includes(body.category)) {
      throw new BadRequestException('Invalid category');
    }

    // If setting as cover, unset other covers
    if (body.category === 'MAIN') {
      await this.prisma.portfolioImage.updateMany({
        where: { vendorId: vendor.id, isCover: true, id: { not: imageId } },
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

    const updatedImage = await this.prisma.portfolioImage.update({
      where: { id: imageId },
      data: updateData,
    });

    return {
      ...updatedImage,
      message: 'Portfolio image updated successfully',
    };
  }

  /// 🧑‍🔧 VENDOR → Set cover image
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Post('me/portfolio/set-cover')
  async setCoverImage(
    @Req() req: AuthRequest,
    @Body() body: { imageId: number },
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    const image = await this.prisma.portfolioImage.findUnique({
      where: { id: body.imageId },
    });

    if (!image) {
      throw new NotFoundException('Portfolio image not found');
    }

    if (image.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not have permission to modify this image');
    }

    // Unset all covers
    await this.prisma.portfolioImage.updateMany({
      where: { vendorId: vendor.id, isCover: true },
      data: { isCover: false },
    });

    // Set new cover
    const updatedImage = await this.prisma.portfolioImage.update({
      where: { id: body.imageId },
      data: { isCover: true, updatedAt: new Date() },
    });

    return {
      success: true,
      message: 'Cover image updated successfully',
      coverImage: updatedImage,
    };
  }

  /// 🧑‍🔧 VENDOR → Reorder portfolio images
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Patch('me/portfolio/reorder')
  async reorderPortfolioImages(
    @Req() req: AuthRequest,
    @Body() body: { imageIds: number[] },
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    // Verify all images belong to this vendor
    const images = await this.prisma.portfolioImage.findMany({
      where: {
        id: { in: body.imageIds },
        vendorId: vendor.id,
      },
      select: { id: true },
    });

    if (images.length !== body.imageIds.length) {
      throw new BadRequestException('Some images do not belong to your portfolio');
    }

    // Update order in transaction
    await this.prisma.$transaction(
      body.imageIds.map((imageId, index) =>
        this.prisma.portfolioImage.update({
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

  /// 🧑‍🔧 VENDOR → Remove image from portfolio (soft delete)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Delete('me/portfolio/images/:id')
  async removePortfolioImage(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) imageId: number,
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    const existingImage = await this.prisma.portfolioImage.findUnique({
      where: { id: imageId },
    });

    if (!existingImage) {
      throw new NotFoundException('Portfolio image not found');
    }

    if (existingImage.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not have permission to delete this image');
    }

    // 1. Physical purge (Best effort)
    if (existingImage.imageUrl) {
      await this.databaseStorageService.deleteFile(existingImage.imageUrl);
    }

    // 2. Soft/Hard delete in DB
    await this.prisma.portfolioImage.delete({
      where: { id: imageId },
    });

    return {
      success: true,
      message: 'Image deleted successfully',
    };
  }

  /// 🧑‍🔧 VENDOR → Restore deleted portfolio image
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Patch('me/portfolio/images/:id/restore')
  async restorePortfolioImage(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) imageId: number,
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);

    const existingImage = await this.prisma.portfolioImage.findUnique({
      where: { id: imageId },
    });

    if (!existingImage) {
      throw new NotFoundException('Portfolio image not found');
    }

    if (existingImage.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not have permission to restore this image');
    }

    await this.prisma.portfolioImage.update({
      where: { id: imageId },
      data: { isActive: true, updatedAt: new Date() },
    });

    return {
      success: true,
      message: 'Image restored successfully',
    };
  }
  // ============================================
  // VENDOR PROFILE UPDATE ENDPOINT (RENAMED to avoid conflict with file upload route)
  // ============================================

  /// 🧑‍🔧 VENDOR → Update my profile (without file uploads)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Patch('me/profile')
  async updateMyProfile(
    @Req() req: AuthRequest,
    @Body() dto: CreateVendorDto,
  ) {
    const vendor = await this.vendorsService.getVendorByUserId(req.user.userId);
    return this.vendorsService.updateVendor(vendor.id, dto);
  }

  // ============================================
  // ADMIN ROUTES - Must be BEFORE :id route
  // ============================================

  /// 👨‍💼 ADMIN → Get all vendors with full details
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  @ApiOperation({ summary: 'Get all vendors (admin only)' })
  async getAllVendorsAdmin() {
    return this.vendorsService.findAll();
  }

  /// 👨‍💼 ADMIN → Get single vendor with KYC and Bank accounts
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  @ApiOperation({ summary: 'Get vendor by ID with full admin details' })
  @ApiParam({ name: 'id', type: Number })
  async getVendorByIdAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.findByIdAdmin(id);
  }

  /// 👨‍💼 ADMIN → Approve vendor

  /// 👨‍💼 ADMIN → Approve vendor
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a vendor (admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Vendor ID' })
  async approveVendor(@Param('id', ParseIntPipe) id: string) {
    try {
      return this.vendorsService.approveVendor(+id);
    } catch (error: any) {
      console.error('Error approving vendor:', error);
      throw error;
    }
  }

  /// 👨‍💼 ADMIN → Reject vendor
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a vendor (admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Vendor ID' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  async rejectVendor(@Param('id', ParseIntPipe) id: string, @Body('reason') reason?: string) {
    try {
      return this.vendorsService.rejectVendor(+id, reason);
    } catch (error: any) {
      console.error('Error rejecting vendor:', error);
      throw error;
    }
  }

  /// 👨‍💼 ADMIN → Update vendor profile
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update vendor profile (admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Vendor ID' })
  async updateVendorByAdmin(
    @Param('id', ParseIntPipe) id: string,
    @Body() dto: CreateVendorDto,
  ) {
    return this.vendorsService.updateVendor(+id, dto);
  }

  // ============================================
  // DYNAMIC :id ROUTES (must be AFTER specific routes)
  // ============================================

  /// 👤 PUBLIC → view single vendor (must be LAST)
  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'Vendor ID' })
  getVendorById(@Param('id', ParseIntPipe) id: string) {
    return this.vendorsService.findById(+id);
  }

  // ALIAS: Get vendor services (frontend expects /vendors/:id/services)
  @Public()
  @Get(':id/services')
  @ApiParam({ name: 'id', type: Number, description: 'Vendor ID' })
  getVendorServices(@Param('id', ParseIntPipe) id: string) {
    return this.vendorsService.getVendorServices(+id);
  }
}

