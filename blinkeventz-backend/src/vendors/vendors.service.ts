import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorVerificationStatus } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vendor.findMany({
      include: {
        services: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        }
      }
    });
  }

  async findById(id: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        services: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        }
      }
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async createVendor(userId:number,dto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: {
       userId,
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
