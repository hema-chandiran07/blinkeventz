import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { VendorServicesService } from './vendor-services.service';
import { CreateVendorServiceDto } from './dto/create-vendor-service.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthRequest } from '../../auth/auth-request.interface';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Vendor Services')
@ApiBearerAuth()
@Controller('vendor-services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorServicesController {
  constructor(private readonly vendorServicesService: VendorServicesService) {}

  /**
   * Create a new vendor service
   * Only VENDOR role can create services
   */
  @Roles(Role.VENDOR)
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateVendorServiceDto) {
    return this.vendorServicesService.create(req.user.userId, dto);
  }

  /**
   * Get all services for a vendor (public endpoint)
   */
  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId') vendorId: string) {
    return this.vendorServicesService.findByVendor(+vendorId);
  }

  /**
   * Activate a vendor service
   * VENDOR can only activate their own services
   * ADMIN can activate any service
   */
  @Roles(Role.VENDOR, Role.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id') id: string, @Req() req: AuthRequest) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.vendorServicesService.activate(+id, req.user.userId, isAdmin);
  }

  /**
   * Deactivate a vendor service
   * VENDOR can only deactivate their own services
   * ADMIN can deactivate any service
   */
  @Roles(Role.VENDOR, Role.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @Req() req: AuthRequest) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.vendorServicesService.deactivate(+id, req.user.userId, isAdmin);
  }
}
