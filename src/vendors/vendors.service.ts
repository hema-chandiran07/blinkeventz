import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorVerificationStatus } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async createVendor(dto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: {
        userId: dto.userId,
        businessName: dto.businessName,
        description: dto.description,
        city: dto.city,
        area: dto.area,
        serviceRadiusKm: dto.serviceRadiusKm,
      },
    });
  }

  async getVendorByUserId(userId: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      include: { services: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor not found for userId ${userId}`);
    }

    return vendor;
  }

  async approveVendor(id: number) {
    return this.prisma.vendor.update({
      where: { id },
      data: {
        verificationStatus: VendorVerificationStatus.VERIFIED,
      },
    });
  }

  async rejectVendor(id: number) {
    return this.prisma.vendor.update({
      where: { id },
      data: {
        verificationStatus: VendorVerificationStatus.REJECTED,
      },
    });
  }
}
