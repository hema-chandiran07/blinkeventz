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
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { Audit, AUDIT_META_KEY } from '../audit/decorators/audit.decorator';
import { AuditSeverity, AuditSource } from '@prisma/client';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// Simple crypto helpers
function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function encrypt(data: string): string {
  return Buffer.from(data).toString('base64');
}

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
  constructor(
    private readonly kycService: KycService,
    private readonly prisma: PrismaService,
  ) {}

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
      storage: memoryStorage(),
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
      storage: memoryStorage(),
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

    // Create KYC document
    const kycResult = await this.kycService.createVendorKyc(userId, dto, file);

    // If bank details are provided, create bank account
    if (dto.bankAccountNumber && dto.ifscCode && dto.bankName && dto.accountHolder) {
      try {
        const accountNumberHash = hash(dto.bankAccountNumber);
        const encryptedAccountNumber = encrypt(dto.bankAccountNumber);

        await this.prisma.bankAccount.create({
          data: {
            userId,
            accountHolder: dto.accountHolder,
            accountNumber: encryptedAccountNumber,
            accountNumberHash,
            ifsc: dto.ifscCode,
            bankName: dto.bankName,
            branchName: dto.branchName || null,
            referenceId: randomUUID(),
          },
        });
      } catch (error: any) {
        // If bank account creation fails, log but don't fail the whole request
        console.error('Failed to create bank account:', error.message);
      }
    }

    return {
      ...kycResult,
      bankDetailsSubmitted: !!(dto.bankAccountNumber && dto.ifscCode && dto.bankName),
    };
  }

  @Get('vendor/me')
  @ApiOperation({ summary: 'Get current vendor KYC status' })
  async getVendorKyc(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.kycService.getVendorKyc(userId);
  }

  @Get('vendor/status')
  @ApiOperation({ summary: 'Get current vendor KYC status (simplified)' })
  async getVendorKycStatus(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    const kyc = await this.kycService.getVendorKyc(userId);
    return {
      status: kyc?.status || 'NOT_SUBMITTED',
      docType: kyc?.docType || null,
      submittedAt: kyc?.createdAt || null,
    };
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
      storage: memoryStorage(),
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

  @Get('venue-owner/status')
  @ApiOperation({ summary: 'Get current venue owner KYC status (simplified)' })
  async getVenueOwnerKycStatus(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId;
    try {
      const kyc = await this.kycService.getVenueOwnerKyc(userId);
      return {
        status: kyc?.status || 'NOT_SUBMITTED',
        docType: kyc?.docType || null,
        submittedAt: kyc?.createdAt || null,
        hasBankAccount: false, // Will be implemented when bank account relation is added
      };
    } catch (error) {
      return {
        status: 'NOT_SUBMITTED',
        docType: null,
        submittedAt: null,
        hasBankAccount: false,
      };
    }
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
    @Query('status') status?: string,
  ) {
    // Map frontend status values to Prisma enum
    // Frontend may send: APPROVED -> VERIFIED, REJECTED -> REJECTED, PENDING -> PENDING
    let statusEnum: KycStatus | undefined;
    if (status) {
      const statusUpper = status.toUpperCase();
      if (statusUpper === 'APPROVED') {
        statusEnum = KycStatus.VERIFIED;
      } else if (statusUpper === 'VERIFIED') {
        statusEnum = KycStatus.VERIFIED;
      } else if (statusUpper === 'REJECTED') {
        statusEnum = KycStatus.REJECTED;
      } else if (statusUpper === 'PENDING') {
        statusEnum = KycStatus.PENDING;
      } else {
        throw new BadRequestException(
          `Invalid status filter: "${status}". Expected one of: PENDING, VERIFIED (or APPROVED), REJECTED`,
        );
      }
    }

    // Limit max to 100
    const safeLimit = Math.min(limit, 100);
    return this.kycService.getAllKyc(statusEnum, page, safeLimit);
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
