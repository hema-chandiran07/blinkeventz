import {
  Controller,
  Patch,
  Get,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycService } from './kyc.service';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { KycStatus } from '@prisma/client';
import { Request } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

interface AdminRequest extends Request {
  user: { userId: number; email: string; role: string };
}

// ─────────────────────────────────────────────────────────────
// Admin KYC Controller — Approval / Rejection endpoints
// ─────────────────────────────────────────────────────────────

@ApiTags('Admin KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@Roles('ADMIN')
@Controller('admin/kyc')
export class AdminKycController {
  constructor(private readonly kycService: KycService) {}

  @Get()
  @ApiOperation({ summary: 'List all KYC submissions with pagination (admin)' })
  @ApiQuery({ name: 'status', required: false, enum: KycStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listAll(
    @Query('status') status?: KycStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    const safeLimit = Math.min(limit, 100);
    return this.kycService.getAllKyc(status, page, safeLimit);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a KYC submission' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AdminRequest,
  ) {
    return this.kycService.updateKycStatus(
      id,
      KycStatus.VERIFIED,
      req.user.userId,
    );
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a KYC submission' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKycStatusDto,
    @Req() req: AdminRequest,
  ) {
    return this.kycService.updateKycStatus(
      id,
      KycStatus.REJECTED,
      req.user.userId,
      dto.rejectionReason,
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update KYC status (generic)' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKycStatusDto,
    @Req() req: AdminRequest,
  ) {
    return this.kycService.updateKycStatus(
      id,
      dto.status,
      req.user.userId,
      dto.rejectionReason,
    );
  }
}
