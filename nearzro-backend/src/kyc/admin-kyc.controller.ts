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

interface AdminRequest extends Request {
  user: { userId: number; email: string; role: string };
}

// ─────────────────────────────────────────────────────────────
// Admin KYC Controller — Approval / Rejection endpoints
// ─────────────────────────────────────────────────────────────

@ApiTags('Admin KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/kyc')
export class AdminKycController {
  constructor(private readonly kycService: KycService) {}

  @Get()
  @ApiOperation({ summary: 'List all KYC submissions (admin)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: KycStatus,
  })
  async listAll(@Query('status') status?: KycStatus) {
    return this.kycService.getAllKyc(status);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a KYC submission' })
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
