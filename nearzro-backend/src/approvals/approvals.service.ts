import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { VenueStatus, VendorVerificationStatus, AuditSeverity, AuditSource } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService, private readonly auditService: AuditService) {}

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

  async approve(id: number, approvalType: string, actorId: number) {
    let oldStatus: string | undefined;
    let newStatus: string;
    let entityType: 'Venue' | 'Vendor';
    let entityId = id;

    if (approvalType === 'VENUE') {
      const venue = await this.prisma.venue.findUnique({
        where: { id },
      });
      if (!venue) {
        throw new NotFoundException('Venue not found');
      }
      oldStatus = venue.status;
      newStatus = VenueStatus.ACTIVE;
      const updated = await this.prisma.venue.update({
        where: { id },
        data: { status: VenueStatus.ACTIVE },
      });

      await this.auditService.record({
        entityType: 'Venue',
        entityId: String(id),
        action: 'VENUE_APPROVED',
        severity: AuditSeverity.HIGH,
        source: AuditSource.ADMIN,
        actorId,
        description: `Venue approved by admin #${actorId}`,
        oldValue: { status: oldStatus },
        newValue: { status: newStatus },
      });

      return updated;
    } else if (approvalType === 'VENDOR') {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }
      oldStatus = vendor.verificationStatus;
      newStatus = VendorVerificationStatus.VERIFIED;
      const updated = await this.prisma.vendor.update({
        where: { id },
        data: { verificationStatus: VendorVerificationStatus.VERIFIED },
      });

      await this.auditService.record({
        entityType: 'Vendor',
        entityId: String(id),
        action: 'VENDOR_APPROVED',
        severity: AuditSeverity.HIGH,
        source: AuditSource.ADMIN,
        actorId,
        description: `Vendor verified by admin #${actorId}`,
        oldValue: { verificationStatus: oldStatus },
        newValue: { verificationStatus: newStatus },
      });

      return updated;
    }

    throw new NotFoundException('Invalid approval type');
  }

  async reject(id: number, approvalType: string, reason: string, actorId: number) {
    if (approvalType === 'VENUE') {
      const venue = await this.prisma.venue.findUnique({
        where: { id },
      });
      if (!venue) {
        throw new NotFoundException('Venue not found');
      }
      const oldStatus = venue.status;
      const updated = await this.prisma.venue.update({
        where: { id },
        data: {
          status: VenueStatus.INACTIVE,
          rejectionReason: reason,
        },
      });

      await this.auditService.record({
        entityType: 'Venue',
        entityId: String(id),
        action: 'VENUE_REJECTED',
        severity: AuditSeverity.HIGH,
        source: AuditSource.ADMIN,
        actorId,
        description: `Venue rejected by admin #${actorId}: ${reason}`,
        oldValue: { status: oldStatus },
        newValue: { status: VenueStatus.INACTIVE, rejectionReason: reason },
      });

      return updated;
    } else if (approvalType === 'VENDOR') {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }
      const oldStatus = vendor.verificationStatus;
      const updated = await this.prisma.vendor.update({
        where: { id },
        data: {
          verificationStatus: VendorVerificationStatus.REJECTED,
          rejectionReason: reason,
        },
      });

      await this.auditService.record({
        entityType: 'Vendor',
        entityId: String(id),
        action: 'VENDOR_REJECTED',
        severity: AuditSeverity.HIGH,
        source: AuditSource.ADMIN,
        actorId,
        description: `Vendor rejected by admin #${actorId}: ${reason}`,
        oldValue: { verificationStatus: oldStatus },
        newValue: { verificationStatus: VendorVerificationStatus.REJECTED, rejectionReason: reason },
      });

      return updated;
    }

    throw new NotFoundException('Invalid approval type');
  }
}
