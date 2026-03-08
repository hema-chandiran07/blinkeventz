import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorServiceDto } from './dto/create-vendor-service.dto';

@Injectable()
export class VendorServicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ Create vendor service (Vendor only)
  async create(userId: number, dto: CreateVendorServiceDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new ForbiddenException('Vendor profile not found');
    }

    return this.prisma.vendorService.create({
      data: {
        vendorId: vendor.id,
        name: dto.name,
        serviceType: dto.serviceType,
        pricingModel: dto.pricingModel,
        baseRate: dto.baseRate,
        minGuests: dto.minGuests,
        maxGuests: dto.maxGuests,
        description: dto.description,
        inclusions: dto.inclusions,
        exclusions: dto.exclusions,
        isActive: false, // default inactive
      },
    });
  }

  // ✅ Public / Admin: get services by vendor
  async findByVendor(vendorId: number) {
    return this.prisma.vendorService.findMany({
      where: { vendorId },
    });
  }

  // ✅ Vendor / Admin: activate service
  async activate(id: number) {
    const service = await this.prisma.vendorService.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return this.prisma.vendorService.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // ✅ Vendor / Admin: deactivate service
  async deactivate(id: number) {
    const service = await this.prisma.vendorService.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return this.prisma.vendorService.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
