import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueStatus } from '@prisma/client';

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

 
async createVenue(dto: CreateVenueDto, ownerId: number) {
  return this.prisma.venue.create({
    data: {
      name: dto.name,
      type: dto.type,
      description: dto.description,
      address: dto.address,
      city: dto.city,
      area: dto.area,
      pincode: dto.pincode,
      capacityMin: dto.capacityMin,
      capacityMax: dto.capacityMax,
      basePriceMorning: dto.basePriceMorning,
      basePriceEvening: dto.basePriceEvening,
      basePriceFullDay: dto.basePriceFullDay,
      amenities: dto.amenities, // string
      policies: dto.policies,

      // ✅ IMPORTANT FIX
      owner: {
        connect: {
          id: ownerId,
        },
      },
    },
  });
}


  async getApprovedVenues() {
    return this.prisma.venue.findMany({
      where: { status: VenueStatus.ACTIVE },
    });
  }

  async approveVenue(id: number) {
    return this.prisma.venue.update({
      where: { id },
      data: { status: VenueStatus.ACTIVE },
    });
  }

  async getVenuesByOwner(ownerId: number) {
    return this.prisma.venue.findMany({
      where: { ownerId },
    });
  }
}
