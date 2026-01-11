import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { ApiTags } from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth-request.interface';


@ApiTags('Vendors')
@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  createVendor(
    @Req() req: AuthRequest,
    @Body() dto: CreateVendorDto,
  ) {
    return this.vendorsService.createVendor(req.user.userId,dto);
  }

  @Get('me')
  getMyVendor(@Req() req: AuthRequest) {
    return this.vendorsService.getVendorByUserId(req.user.userId);
  }

  @Patch(':id/approve')
  approveVendor(@Param('id') id: string) {
    return this.vendorsService.approveVendor(+id);
  }

  @Patch(':id/reject')
  rejectVendor(@Param('id') id: string) {
    return this.vendorsService.rejectVendor(+id);
  }
}
