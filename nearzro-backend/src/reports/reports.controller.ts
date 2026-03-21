import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Get revenue report
  @Roles(Role.ADMIN)
  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  @ApiResponse({ status: 200, description: 'Revenue report data' })
  async getRevenueReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.reportsService.getRevenueReport(
      startDate,
      endDate,
      page,
      limit,
    );
  }

  // Get users report
  @Roles(Role.ADMIN)
  @Get('users')
  @ApiOperation({ summary: 'Get users report' })
  @ApiResponse({ status: 200, description: 'Users report data' })
  async getUsersReport(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('role') role?: string,
  ) {
    return this.reportsService.getUsersReport(page, limit, role);
  }

  // Get venues report
  @Roles(Role.ADMIN)
  @Get('venues')
  @ApiOperation({ summary: 'Get venues report' })
  @ApiResponse({ status: 200, description: 'Venues report data' })
  async getVenuesReport(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getVenuesReport(page, limit, status);
  }

  // Get vendors report
  @Roles(Role.ADMIN)
  @Get('vendors')
  @ApiOperation({ summary: 'Get vendors report' })
  @ApiResponse({ status: 200, description: 'Vendors report data' })
  async getVendorsReport(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getVendorsReport(page, limit, status);
  }

  // Export revenue report
  @Roles(Role.ADMIN)
  @Get('revenue/export')
  @ApiOperation({ summary: 'Export revenue report to CSV' })
  async exportRevenueReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.exportRevenueReport(startDate, endDate);
  }

  // Export users report
  @Roles(Role.ADMIN)
  @Get('users/export')
  @ApiOperation({ summary: 'Export users report to CSV' })
  async exportUsersReport() {
    return this.reportsService.exportUsersReport();
  }
}
