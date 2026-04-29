import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Roles(Role.ADMIN)
  @Get('pending')
  getPendingApprovals() {
    return this.approvalsService.findPending();
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  getApprovalById(@Param('id') id: string) {
    return this.approvalsService.findOne(+id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  approveApproval(@Param('id') id: string, @Body() body: { approvalType: string }, @Req() req: any) {
    const adminId = req.user?.id;
    return this.approvalsService.approve(+id, body.approvalType, adminId);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  rejectApproval(@Param('id') id: string, @Body() body: { approvalType: string; reason: string }, @Req() req: any) {
    const adminId = req.user?.id;
    return this.approvalsService.reject(+id, body.approvalType, body.reason, adminId);
  }
}
