import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VenueStatus, VendorVerificationStatus } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async findPending() {
    const [pendingVenues, pendingVendors] = await Promise.all([
      this.prisma.venue.findMany({
        where: { status: VenueStatus.PENDING_APPROVAL },
        include: {
          owner: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.vendor.findMany({
        where: { verificationStatus: VendorVerificationStatus.PENDING },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          services: true,
        },
      }),
    ]);

    // Combine and format for frontend
    const approvals = [
      ...pendingVenues.map((v) => ({
        approvalType: 'VENUE' as const,
        title: v.name,
        owner: v.owner.name,
        email: v.owner.email,
        phone: v.owner.phone || '',
        location: v.address,
        area: v.area,
        city: v.city,
        description: v.description || '',
        capacity: v.capacityMax,
        price: v.basePriceEvening || 0,
        status: v.status,
        submittedDate: v.createdAt,
      })),
      ...pendingVendors.map((v) => ({
        approvalType: 'VENDOR' as const,
        title: v.businessName,
        owner: v.user.name,
        email: v.user.email,
        phone: v.user.phone || '',
        location: `${v.area}, ${v.city}`,
        area: v.area,
        city: v.city,
        description: v.description || '',
        serviceType: v.services[0]?.serviceType || 'General',
        price: v.services[0]?.baseRate || 0,
        status: v.verificationStatus,
        submittedDate: v.createdAt,
      })),
    ];

    return approvals.sort(
      (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
    );
  }

  async findOne(id: number) {
    // Check venues first
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (venue) {
      return {
        approvalType: 'VENUE' as const,
        ...venue,
      };
    }

    // Check vendors
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: { user: true, services: true },
    });

    if (vendor) {
      return {
        approvalType: 'VENDOR' as const,
        ...vendor,
      };
    }

    throw new NotFoundException('Approval not found');
  }

  async approve(id: number, approvalType: string) {
    if (approvalType === 'VENUE') {
      return this.prisma.venue.update({
        where: { id },
        data: { status: VenueStatus.ACTIVE },
      });
    } else if (approvalType === 'VENDOR') {
      return this.prisma.vendor.update({
        where: { id },
        data: { verificationStatus: VendorVerificationStatus.VERIFIED },
      });
    }

    throw new NotFoundException('Invalid approval type');
  }

  async reject(id: number, approvalType: string, reason: string) {
    if (approvalType === 'VENUE') {
      return this.prisma.venue.update({
        where: { id },
        data: {
          status: VenueStatus.INACTIVE,
          rejectionReason: reason,
        },
      });
    } else if (approvalType === 'VENDOR') {
      return this.prisma.vendor.update({
        where: { id },
        data: {
          verificationStatus: VendorVerificationStatus.REJECTED,
          rejectionReason: reason,
        },
      });
    }

    throw new NotFoundException('Invalid approval type');
  }
}
