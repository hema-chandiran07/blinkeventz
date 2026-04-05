import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req, ParseIntPipe, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import {ApiBearerAuth,ApiTags, ApiParam } from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth-request.interface';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Public } from '../common/decorators/public.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

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
    return this.vendorsService.createVendor(req.user.userId,dto);
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
  updateMyVendor(
    @Req() req: AuthRequest,
    @Body() dto: Partial<CreateVendorDto>,
    @UploadedFiles() files: { businessImages?: Express.Multer.File[], kycDocFiles?: Express.Multer.File[], foodLicenseFiles?: Express.Multer.File[] },
  ) {
    const businessImageUrls = files?.businessImages?.map(f => `/uploads/${f.filename}`) || [];
    const kycDocUrls = files?.kycDocFiles?.map(f => `/uploads/${f.filename}`) || [];
    const foodLicenseUrls = files?.foodLicenseFiles?.map(f => `/uploads/${f.filename}`) || [];
    return this.vendorsService.updateVendorByUserId(req.user.userId, dto, businessImageUrls, kycDocUrls, foodLicenseUrls);
  }

  // ADMIN routes - must be BEFORE :id route
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  @ApiParam({ name: 'id', type: Number, description: 'Vendor ID' })
  async approveVendor(@Param('id', ParseIntPipe) id: string) {
    try {
      return this.vendorsService.approveVendor(+id);
    } catch (error: any) {
      console.error('Error approving vendor:', error);
      throw error;
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  @ApiParam({ name: 'id', type: Number, description: 'Vendor ID' })
  async rejectVendor(@Param('id', ParseIntPipe) id: string, @Body('reason') reason?: string) {
    try {
      return this.vendorsService.rejectVendor(+id, reason);
    } catch (error: any) {
      console.error('Error rejecting vendor:', error);
      throw error;
    }
  }

  // 👤 PUBLIC → view single vendor (must be LAST)
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
