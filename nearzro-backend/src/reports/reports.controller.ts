import { Controller, Get, Query, UseGuards, Res, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Response } from 'express';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Get reports hub - overview of all report categories
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get reports hub - overview of all report categories' })
  @ApiResponse({ status: 200, description: 'Returns overview of all report categories' })
  async getReportsHub() {
    return this.reportsService.getReportsHub();
  }

  // Get revenue report (Admin only)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  @ApiResponse({ status: 200, description: 'Revenue report data' })
  async getRevenueReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 20 : 20;
    return this.reportsService.getRevenueReport(
      startDate,
      endDate,
      pageNum,
      limitNum,
    );
  }

  // Get users report (Admin only)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('users')
  @ApiOperation({ summary: 'Get users report' })
  @ApiResponse({ status: 200, description: 'Users report data' })
  async getUsersReport(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 20 : 20;
    return this.reportsService.getUsersReport(pageNum, limitNum, role);
  }

  // Get venues report (Admin only)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('venues')
  @ApiOperation({ summary: 'Get venues report' })
  @ApiResponse({ status: 200, description: 'Venues report data' })
  async getVenuesReport(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 20 : 20;
    return this.reportsService.getVenuesReport(pageNum, limitNum, status);
  }

  // Get vendors report (Admin only)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('vendors')
  @ApiOperation({ summary: 'Get vendors report' })
  @ApiResponse({ status: 200, description: 'Vendors report data' })
  async getVendorsReport(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 20 : 20;
    return this.reportsService.getVendorsReport(pageNum, limitNum, status);
  }

  // Export revenue report (Admin only)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('revenue/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="revenue-report.csv"')
  @ApiOperation({ summary: 'Export revenue report to CSV' })
  async exportRevenueReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csvContent = await this.reportsService.exportRevenueReport(startDate, endDate);
    return csvContent;
  }

  // Export users report (Admin only)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('users/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="users-report.csv"')
  @ApiOperation({ summary: 'Export users report to CSV' })
  async exportUsersReport() {
    const csvContent = await this.reportsService.exportUsersReport();
    return csvContent;
  }
}
