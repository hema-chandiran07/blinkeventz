import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { VendorServicesService } from './vendor-services.service';
import { CreateVendorServiceDto } from './dto/create-vendor-service.dto';

@Controller('vendor-services')
export class VendorServicesController {
  constructor(private readonly vendorServicesService: VendorServicesService) {}

  @Post()
  create(@Body() dto: CreateVendorServiceDto) {
    return this.vendorServicesService.create(dto);
  }

  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId') vendorId: string) {
    return this.vendorServicesService.findByVendor(+vendorId);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.vendorServicesService.activate(+id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.vendorServicesService.deactivate(+id);
  }
}
