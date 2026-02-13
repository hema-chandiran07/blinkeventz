import { Controller, Post, Get, Patch, Body, Param,UseGuards,Req} from '@nestjs/common';
import { VendorServicesService } from './vendor-services.service';
import { CreateVendorServiceDto } from './dto/create-vendor-service.dto';
import {ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthRequest } from '../../auth/auth-request.interface';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
@ApiTags('Vendor Services')  
@ApiBearerAuth() 
@Controller('vendor-services')
@UseGuards(JwtAuthGuard,RolesGuard)
export class VendorServicesController {
  constructor(private readonly vendorServicesService: VendorServicesService) {}
// ✅ Vendor creates service
  @Roles(Role.VENDOR)
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateVendorServiceDto) {
    return this.vendorServicesService.create(req.user.userId, dto);
  }

   // ✅ Public/Admin view vendor services
  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId') vendorId: string) {
    return this.vendorServicesService.findByVendor(+vendorId);
  }

 // ✅ Vendor/Admin activate
  @Roles(Role.VENDOR, Role.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.vendorServicesService.activate(+id);
  }
  @Roles(Role.VENDOR, Role.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.vendorServicesService.deactivate(+id);
  }
}
