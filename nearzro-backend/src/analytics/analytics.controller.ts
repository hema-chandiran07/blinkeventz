import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('gmv')
  getGMV() {
    return this.service.getGMV();
  }

  @Get('bookings')
  getBookings() {
    return this.service.getBookings();
  }

  @Get('revenue')
  getRevenue() {
    return this.service.getRevenue();
  }

  @Get('users')
  getUsers() {
    return this.service.getUsers();
  }

  @Get('top-venues')
  getTopVenues() {
    return this.service.getTopVenues();
  }

  @Get('top-vendors')
  getTopVendors() {
    return this.service.getTopVendors();
  }
}
