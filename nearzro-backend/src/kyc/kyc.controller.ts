import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  UnauthorizedException,
  BadRequestException,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { CreateKycDto } from './dto/create-kyc.dto';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, KycStatus } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Audit, AUDIT_META_KEY } from '../audit/decorators/audit.decorator';
import { AuditSeverity, AuditSource } from '@prisma/client';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

// File filter function for security
const imageFileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only PDF, JPG, JPEG, and PNG files are allowed'), false);
  }
};

// Sanitize filename to prevent path traversal
const editFileName = (req: any, file: any, cb: any) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  // Remove any path components from original filename
  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  cb(null, `kyc-${uniqueSuffix}${extname(sanitizedName)}`);
};

@ApiTags('KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  // Customer KYC
  @Post('customer')
  @Audit({
    action: 'KYC_CUSTOMER_CREATE',
    entityType: 'KycDocument',
    severity: AuditSeverity.INFO,
    source: AuditSource.USER,
  })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit customer KYC document' })
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: './uploads/kyc',
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async createCustomerKyc(
    @Req() req: any,
    @Body() dto: CreateKycDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Extract user ID from token
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated. Please login again.');
    }

    if (!file) {
      throw new BadRequestException('Document file is required. Supported formats: PDF, JPEG, PNG');
    }

    return this.kycService.createCustomerKyc(userId, dto, file);
  }

  @Get('customer/me')
  @ApiOperation({ summary: 'Get current customer KYC status' })
  async getCustomerKyc(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.kycService.getCustomerKyc(userId);
  }

  // Vendor KYC
  @Post('vendor')
  @Audit({
    action: 'KYC_VENDOR_CREATE',
    entityType: 'KycDocument',
    severity: AuditSeverity.INFO,
    source: AuditSource.USER,
  })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit vendor KYC document' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: './uploads/kyc',
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async createVendorKyc(
    @Req() req: any,
    @Body() dto: CreateKycDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.id || req.user?.userId;
    
    if (!file) {
      throw new BadRequestException('Document file is required');
    }

    return this.kycService.createVendorKyc(userId, dto, file);
  }

  @Get('vendor/me')
  @ApiOperation({ summary: 'Get current vendor KYC status' })
  async getVendorKyc(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.kycService.getVendorKyc(userId);
  }

  // Venue Owner KYC
  @Post('venue-owner')
  @Audit({
    action: 'KYC_VENUE_OWNER_CREATE',
    entityType: 'KycDocument',
    severity: AuditSeverity.INFO,
    source: AuditSource.USER,
  })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit venue owner KYC document with optional bank details' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: './uploads/kyc',
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async createVenueOwnerKyc(
    @Req() req: any,
    @Body() dto: CreateKycDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.id || req.user?.userId;
    
    if (!file) {
      throw new BadRequestException('Document file is required');
    }

    return this.kycService.createVenueOwnerKyc(userId, dto, file);
  }

  @Get('venue-owner/me')
  @ApiOperation({ summary: 'Get current venue owner KYC status' })
  async getVenueOwnerKyc(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.kycService.getVenueOwnerKyc(userId);
  }

  // Admin - Get all KYC submissions with pagination
  @Roles(Role.ADMIN)
  @Get('admin/submissions')
  @ApiOperation({ summary: 'Get all KYC submissions (admin with pagination)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: KycStatus })
  async getAllKycSubmissions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: KycStatus,
  ) {
    // Limit max to 100
    const safeLimit = Math.min(limit, 100);
    return this.kycService.getAllKyc(status, page, safeLimit);
  }

  // Admin - Approve/Reject KYC
  @Roles(Role.ADMIN)
  @Patch('admin/:id/status')
  @Audit({
    action: 'KYC_STATUS_UPDATE',
    entityType: 'KycDocument',
    severity: AuditSeverity.WARNING,
    source: AuditSource.ADMIN,
  })
  @ApiOperation({ summary: 'Update KYC status (approve/reject)' })
  async updateKycStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKycStatusDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.userId || req.user?.id;
    return this.kycService.updateKycStatus(id, dto.status, adminId, dto.rejectionReason);
  }

  // Admin - Get KYC by ID
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  @ApiOperation({ summary: 'Get KYC by ID (admin)' })
  async getKycById(@Param('id', ParseIntPipe) id: number) {
    return this.kycService.getKycById(id);
  }

  // Admin - Get Pending KYC submissions
  @Roles(Role.ADMIN)
  @Get('pending')
  @ApiOperation({ summary: 'Get pending KYC submissions (admin with pagination)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPendingKyc(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const safeLimit = Math.min(limit, 100);
    return this.kycService.getPendingKyc(page, safeLimit);
  }
}
