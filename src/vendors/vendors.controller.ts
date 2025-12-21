import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';

import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  createVendor(@Body() dto: CreateVendorDto) {
    return this.vendorsService.createVendor(dto);
  }

  @Get('me/:userId')
  getMyVendor(@Param('userId') userId: string) {
    return this.vendorsService.getVendorByUserId(+userId);
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
