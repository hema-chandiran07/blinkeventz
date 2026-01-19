import { Controller, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycService } from './kyc.service';
import { KycStatus } from '@prisma/client';

@ApiTags('Admin KYC') // 🔥 REQUIRED
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/kyc')
export class AdminKycController {
  constructor(private readonly kycService: KycService) {}

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.kycService.updateKycStatus(
      +id,
      KycStatus.VERIFIED,
    );
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.kycService.updateKycStatus(
      +id,
      KycStatus.REJECTED,
    );
  }
  
}
