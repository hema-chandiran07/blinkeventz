import { Controller, Post, Get, Patch, Body, Param,UseGuards,Req} from '@nestjs/common';
import { VendorServicesService } from './vendor-services.service';
import { CreateVendorServiceDto } from './dto/create-vendor-service.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthRequest } from '../../auth/auth-request.interface';
@ApiTags('Vendor Services')   
@Controller('vendor-services')
@UseGuards(JwtAuthGuard)
export class VendorServicesController {
  constructor(private readonly vendorServicesService: VendorServicesService) {}

  @Post()
  create(
    @Req() req: AuthRequest,
    @Body() dto: CreateVendorServiceDto,
  ) {
    return this.vendorServicesService.create(
      req.user.userId,
      dto,
    );
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
