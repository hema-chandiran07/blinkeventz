import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VendorServicesService } from './vendor-services.service';
import { CreateVendorServiceDto } from './dto/create-vendor-service.dto';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody, ApiParam, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthRequest } from '../../auth/auth-request.interface';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { DatabaseStorageService } from '../../storage/database-storage.service';

@ApiTags('Vendor Services')
@Controller('vendor-services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorServicesController {
  constructor(
    private readonly vendorServicesService: VendorServicesService,
    private readonly storageService: DatabaseStorageService,
  ) {}

  /**
   * Create a new vendor service with optional image uploads
   */
  @ApiBearerAuth()
  @Roles(Role.VENDOR)
  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 10 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'serviceType', 'pricingModel', 'baseRate'],
      properties: {
        name: { type: 'string', example: 'Wedding Photography' },
        serviceType: { type: 'string', enum: ['PHOTOGRAPHY', 'CATERING', 'DECOR', 'MAKEUP', 'DJ', 'MUSIC', 'CAR_RENTAL', 'PRIEST', 'ENTERTAINMENT', 'OTHER'] },
        pricingModel: { type: 'string', enum: ['PER_EVENT', 'PER_PERSON', 'PER_DAY', 'PACKAGE'] },
        baseRate: { type: 'number', example: 50000 },
        minGuests: { type: 'number', example: 100 },
        maxGuests: { type: 'number', example: 500 },
        description: { type: 'string', example: 'Full day coverage' },
        inclusions: { type: 'string', example: 'Album, drone shots' },
        exclusions: { type: 'string', example: 'Travel charges excluded' },
        isActive: { type: 'boolean', example: true },
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  async create(
    @Req() req: AuthRequest,
    @Body() dto: any,
    @UploadedFiles() files?: { images?: Express.Multer.File[] },
  ) {
    // Manually parse numeric/boolean fields from multipart form data (strings)
    const baseRate = typeof dto.baseRate === 'string' ? parseInt(dto.baseRate, 10) : dto.baseRate;
    const minGuests = dto.minGuests !== undefined && dto.minGuests !== null
      ? (typeof dto.minGuests === 'string' ? parseInt(dto.minGuests, 10) : dto.minGuests)
      : undefined;
    const maxGuests = dto.maxGuests !== undefined && dto.maxGuests !== null
      ? (typeof dto.maxGuests === 'string' ? parseInt(dto.maxGuests, 10) : dto.maxGuests)
      : undefined;
    const isActive = typeof dto.isActive === 'string'
      ? dto.isActive === 'true'
      : (dto.isActive ?? true);

    // Store images in database as base64 if provided
    let imageUrls: string[] = [];
    if (files?.images && files.images.length > 0) {
      const uploadPromises = files.images.map(file => this.storageService.uploadVendorServiceImage(file));
      imageUrls = await Promise.all(uploadPromises);
    }

    // Also accept image URLs from DTO (for backward compatibility with external URLs like Unsplash)
    const existingImageUrls = dto.images || [];

    // Validate external URLs if provided
    for (const url of existingImageUrls) {
      if (url && !url.startsWith('data:') && !this.storageService.validateImageUrl(url)) {
        throw new BadRequestException(`Invalid image URL: ${url}`);
      }
    }

    return this.vendorServicesService.create(req.user.userId, {
      ...dto,
      baseRate: baseRate || 0,
      minGuests: minGuests || undefined,
      maxGuests: maxGuests || undefined,
      isActive,
      images: [...existingImageUrls, ...imageUrls],
    });
  }

  /**
   * Update vendor service with optional image uploads
   */
  @ApiBearerAuth()
  @Roles(Role.VENDOR, Role.ADMIN)
  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images', maxCount: 10 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Wedding Photography' },
        serviceType: { type: 'string', enum: ['PHOTOGRAPHY', 'CATERING', 'DECOR', 'MAKEUP', 'DJ', 'MUSIC', 'CAR_RENTAL', 'PRIEST', 'ENTERTAINMENT', 'OTHER'] },
        pricingModel: { type: 'string', enum: ['PER_EVENT', 'PER_PERSON', 'PER_DAY', 'PACKAGE'] },
        baseRate: { type: 'number', example: 50000 },
        minGuests: { type: 'number', example: 100 },
        maxGuests: { type: 'number', example: 500 },
        description: { type: 'string', example: 'Full day coverage' },
        inclusions: { type: 'string', example: 'Album, drone shots' },
        exclusions: { type: 'string', example: 'Travel charges excluded' },
        isActive: { type: 'boolean', example: true },
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() dto: any,
    @UploadedFiles() files?: { images?: Express.Multer.File[] },
  ) {
    const isAdmin = req.user.role === Role.ADMIN;

    // Manually parse numeric/boolean fields from multipart form data (strings)
    const parsedDto: Partial<CreateVendorServiceDto> = { ...dto };
    
    if (dto.baseRate !== undefined) {
      parsedDto.baseRate = typeof dto.baseRate === 'string' ? parseInt(dto.baseRate, 10) : dto.baseRate;
    }
    if (dto.minGuests !== undefined && dto.minGuests !== null) {
      parsedDto.minGuests = typeof dto.minGuests === 'string' ? parseInt(dto.minGuests, 10) : dto.minGuests;
    }
    if (dto.maxGuests !== undefined && dto.maxGuests !== null) {
      parsedDto.maxGuests = typeof dto.maxGuests === 'string' ? parseInt(dto.maxGuests, 10) : dto.maxGuests;
    }
    if (dto.isActive !== undefined) {
      parsedDto.isActive = typeof dto.isActive === 'string' ? dto.isActive === 'true' : dto.isActive;
    }

    // Upload new images to database if provided
    let newImageUrls: string[] = [];
    if (files?.images && files.images.length > 0) {
      const uploadPromises = files.images.map(file => this.storageService.uploadVendorServiceImage(file));
      newImageUrls = await Promise.all(uploadPromises);
    }

    // Merge with existing images if provided in DTO
    const existingImageUrls = dto.images || [];

    // Validate external URLs if provided
    for (const url of existingImageUrls) {
      if (url && !url.startsWith('data:') && !this.storageService.validateImageUrl(url)) {
        throw new BadRequestException(`Invalid image URL: ${url}`);
      }
    }

    const allImages = [...existingImageUrls, ...newImageUrls];

    return this.vendorServicesService.update(+id, req.user.userId, {
      ...parsedDto,
      images: allImages.length > 0 ? allImages : undefined,
    }, isAdmin);
  }

  /**
   * Get a single vendor service by ID
   * Used by service detail page
   */
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get vendor service by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Service ID' })
  async findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.vendorServicesService.findByIdWithDetails(+id);
  }

  /**
   * Delete a vendor service
   * Only the owner vendor or admin can delete
   * Cannot delete if service has existing bookings
   */
  @ApiBearerAuth()
  @Roles(Role.VENDOR, Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vendor service' })
  @ApiParam({ name: 'id', type: Number, description: 'Service ID' })
  async deleteService(@Param('id') id: string, @Req() req: AuthRequest) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.vendorServicesService.delete(+id, req.user.userId, isAdmin);
  }

  /**
   * Get all services for a vendor (public endpoint)
   */
  @Public()
  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId') vendorId: string) {
    return this.vendorServicesService.findByVendor(+vendorId);
  }

  // ALIAS: Get vendor services (frontend expects /vendors/:id/services)
  @Public()
  @Get('by-vendor/:vendorId')
  findByVendorAlias(@Param('vendorId') vendorId: string) {
    return this.vendorServicesService.findByVendor(+vendorId);
  }

  /**
   * Activate a vendor service
   * VENDOR can only activate their own services
   * ADMIN can activate any service
   */
  @ApiBearerAuth()
  @Roles(Role.VENDOR, Role.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id') id: string, @Req() req: AuthRequest) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.vendorServicesService.activate(+id, req.user.userId, isAdmin);
  }

  /**
   * Deactivate a vendor service
   * VENDOR can only deactivate their own services
   * ADMIN can deactivate any service
   */
  @ApiBearerAuth()
  @Roles(Role.VENDOR, Role.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @Req() req: AuthRequest) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.vendorServicesService.deactivate(+id, req.user.userId, isAdmin);
  }

  /**
   * ADMIN: Approve a vendor service
   * Changes service status to active and notifies vendor
   */
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Admin approve a vendor service' })
  @ApiParam({ name: 'id', type: Number, description: 'Service ID' })
  async approveService(@Param('id') id: string, @Req() req: AuthRequest, @Body('reason') reason?: string) {
    return this.vendorServicesService.approveByAdmin(+id, req.user.userId, reason);
  }

  /**
   * ADMIN: Reject a vendor service
   * Keeps service inactive and records rejection reason
   */
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Admin reject a vendor service' })
  @ApiParam({ name: 'id', type: Number, description: 'Service ID' })
  @ApiBody({ schema: { properties: { reason: { type: 'string', example: 'Service does not meet quality standards' } } } })
  async rejectService(@Param('id') id: string, @Req() req: AuthRequest, @Body('reason') reason: string) {
    return this.vendorServicesService.rejectByAdmin(+id, req.user.userId, reason);
  }

  /**
   * ADMIN: Get all pending services for approval
   */
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('admin/pending')
  @ApiOperation({ summary: 'Get all pending vendor services for approval' })
  async getPendingServices() {
    return this.vendorServicesService.findPendingForApproval();
  }

  /**
   * ADMIN: Get service by ID with full details
   */
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  @ApiOperation({ summary: 'Get vendor service by ID for admin review' })
  @ApiParam({ name: 'id', type: Number, description: 'Service ID' })
  async getServiceById(@Param('id') id: string) {
    return this.vendorServicesService.findByIdWithDetails(+id);
  }
}
