import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueStatus } from '@prisma/client';

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

  async findById(id: number) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        photos: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        }
      }
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    return venue;
  }

 
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

  async searchVenues(query: string) {
    if (!query) {
      return this.prisma.venue.findMany({
        where: { status: VenueStatus.ACTIVE },
      });
    }
    
    return this.prisma.venue.findMany({
      where: {
        status: VenueStatus.ACTIVE,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { city: { contains: query } },
          { area: { contains: query } },
        ],
      },
    });
  }
}
