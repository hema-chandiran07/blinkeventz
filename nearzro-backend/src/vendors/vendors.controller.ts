import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import {ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth-request.interface';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Public } from '../common/decorators/public.decorator';

@ApiBearerAuth()
@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // 👤 PUBLIC → view all vendors
  @Public()
  @Get()
  getAllVendors() {
    return this.vendorsService.findAll();
  }

  // 👤 PUBLIC → view single vendor
  @Public()
  @Get(':id')
  getVendorById(@Param('id') id: string) {
    return this.vendorsService.findById(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @Post()
  createVendor(
    @Req() req: AuthRequest,
    @Body() dto: CreateVendorDto,
  ) {
    return this.vendorsService.createVendor(req.user.userId,dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyVendor(@Req() req: AuthRequest) {
    return this.vendorsService.getVendorByUserId(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  async approveVendor(@Param('id') id: string) {
    try {
      return this.vendorsService.approveVendor(+id);
    } catch (error: any) {
      console.error('Error approving vendor:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  async rejectVendor(@Param('id') id: string) {
    try {
      return this.vendorsService.rejectVendor(+id);
    } catch (error: any) {
      console.error('Error rejecting vendor:', error);
      throw error;
    }
  }
}
