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
  UseInterceptors,
  UploadedFile,
  UnauthorizedException,
  BadRequestException,
  Res,
  StreamableFile,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { CreateKycDto } from './dto/create-kyc.dto';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Audit, AUDIT_META_KEY } from '../audit/decorators/audit.decorator';
import { AuditSeverity, AuditSource } from '@prisma/client';
import * as fs from 'fs';

@ApiTags('KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: './uploads/kyc',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, `document-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Accept PDF, JPG, JPEG, PNG
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF, JPG, JPEG, and PNG files are allowed'), false);
        }
      },
    }),
  )
  async createCustomerKyc(
    @Req() req: any,
    @Body() dto: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('📄 KYC Request - Full req.user:', req.user);
    console.log('📄 KYC DTO:', dto);
    console.log('📄 File:', file);

    // Extract user ID from token manually (bypass guard for multipart)
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      console.error('❌ No user ID found in request');
      throw new UnauthorizedException('User not authenticated. Please login again.');
    }

    if (!file) {
      console.error('❌ No file uploaded');
      throw new BadRequestException('Document file is required. Supported formats: PDF, JPEG, PNG');
    }

    // Parse the DTO fields from the multipart form
    const kycDto: CreateKycDto = {
      docType: dto.docType,
      docNumber: dto.docNumber,
    };

    console.log('✅ Creating KYC for user:', userId);
    return this.kycService.createCustomerKyc(userId, kycDto, file);
  }

  @Get('customer/me')
  async getCustomerKyc(@Req() req: any) {
    return this.kycService.getCustomerKyc(req.user.id);
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
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: './uploads/kyc',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async createVendorKyc(
    @Req() req: any,
    @Body() dto: CreateKycDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.kycService.createVendorKyc(req.user.id, dto, file);
  }

  @Get('vendor/me')
  async getVendorKyc(@Req() req: any) {
    return this.kycService.getVendorKyc(req.user.id);
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
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: './uploads/kyc',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async createVenueOwnerKyc(
    @Req() req: any,
    @Body() dto: CreateKycDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.kycService.createVenueOwnerKyc(req.user.id, dto, file);
  }

  @Get('venue-owner/me')
  async getVenueOwnerKyc(@Req() req: any) {
    return this.kycService.getVenueOwnerKyc(req.user.id);
  }

  // Admin - Get all KYC submissions
  @Roles(Role.ADMIN)
  @Get('admin/submissions')
  async getAllKycSubmissions() {
    return this.kycService.getAllKycSubmissions();
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
  async updateKycStatus(
    @Param('id') id: string,
    @Body() dto: UpdateKycStatusDto,
    @Req() req: any,
  ) {
    return this.kycService.updateKycStatus(+id, dto.status, req.user.userId, dto.rejectionReason);
  }

  // Admin - Get KYC by ID
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  async getKycById(@Param('id') id: string) {
    return this.kycService.getKycById(+id);
  }

  // Admin - Get Pending KYC submissions
  @Roles(Role.ADMIN)
  @Get('pending')
  async getPendingKyc(@Query('page') page: string = '1', @Query('limit') limit: string = '20') {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    return this.kycService.getPendingKyc(pageNum, limitNum);
  }
}
