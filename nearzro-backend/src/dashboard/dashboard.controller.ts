import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(Role.ADMIN)
  @Get('admin/stats')
  async getAdminStats() {
    return this.dashboardService.getAdminStats();
  }

  @Roles(Role.ADMIN)
  @Get('admin/revenue')
  async getRevenueAnalytics() {
    return this.dashboardService.getRevenueAnalytics();
  }

  @Roles(Role.ADMIN)
  @Get('admin/activity')
  async getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }

  @Roles(Role.CUSTOMER)
  @Get('customer/stats')
  async getCustomerStats(@Req() req) {
    return this.dashboardService.getCustomerStats(req.user.userId);
  }

  @Roles(Role.VENDOR, Role.VENUE_OWNER)
  @Get('provider/stats')
  async getProviderStats(@Req() req) {
    return this.dashboardService.getProviderStats(req.user.userId, req.user.role);
  }

  // ============================================
  // NEW: Separate Vendor and Venue Dashboard Stats
  // ============================================

  /// 🧑‍🔧 VENDOR → Get vendor dashboard stats
  @Roles(Role.VENDOR)
  @Get('vendor/stats')
  async getVendorStats(@Req() req) {
    return this.dashboardService.getVendorStats(req.user.userId);
  }

  /// 🏢 VENUE OWNER → Get venue dashboard stats
  @Roles(Role.VENUE_OWNER)
  @Get('venue/stats')
  async getVenueStats(@Req() req) {
    return this.dashboardService.getVenueStats(req.user.userId);
  }
}

