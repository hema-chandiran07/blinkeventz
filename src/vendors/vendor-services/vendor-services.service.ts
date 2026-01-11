import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorServiceDto } from './dto/create-vendor-service.dto';

@Injectable()
export class VendorServicesService {
  constructor(private prisma: PrismaService) {}

  create(userId: number, dto: CreateVendorServiceDto) {
    return this.prisma.vendorService.create({
      data: {
        vendor: {
          connect: { userId }, // 🔥 link vendor via userId
        },
        name: dto.name,
        serviceType: dto.serviceType,
        pricingModel: dto.pricingModel,
        baseRate: dto.baseRate,
        minGuests: dto.minGuests,
        maxGuests: dto.maxGuests,
        description: dto.description,
        inclusions: dto.inclusions,
        exclusions: dto.exclusions,
      },
    });
  }



  findByVendor(vendorId: number) {
    return this.prisma.vendorService.findMany({
      where: { vendorId },
    });
  }

  activate(id: number) {
    return this.prisma.vendorService.update({
      where: { id },
      data: { isActive: true },
    });
  }

  deactivate(id: number) {
    return this.prisma.vendorService.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
