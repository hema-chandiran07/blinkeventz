import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Get reports hub - overview of all report categories
   */
  async getReportsHub() {
    const [userCount, venueCount, vendorCount, eventCount, paymentCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.venue.count(),
      this.prisma.vendor.count(),
      this.prisma.event.count(),
      this.prisma.payment.count({ where: { status: 'CAPTURED' } }),
    ]);

    const totalRevenue = await this.prisma.payment.aggregate({
      where: { status: 'CAPTURED' },
      _sum: { amount: true },
    });

    return {
      users: {
        total: userCount,
        endpoint: '/reports/users',
        exportEndpoint: '/reports/users/export',
      },
      venues: {
        total: venueCount,
        endpoint: '/reports/venues',
      },
      vendors: {
        total: vendorCount,
        endpoint: '/reports/vendors',
      },
      events: {
        total: eventCount,
        endpoint: '/events',
      },
      revenue: {
        totalPayments: paymentCount,
        totalAmount: totalRevenue._sum.amount || 0,
        totalAmountINR: ((totalRevenue._sum.amount || 0) / 100).toFixed(2),
        endpoint: '/reports/revenue',
        exportEndpoint: '/reports/revenue/export',
      },
    };
  }

  async getRevenueReport(
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          ...where,
          status: 'CAPTURED',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({
        where: {
          ...where,
          status: 'CAPTURED',
        },
      }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      data: payments.map(p => ({
        ...p,
        id: Number(p.id),
        userId: p.userId ? Number(p.userId) : null,
        eventId: p.eventId ? Number(p.eventId) : null,
        cartId: p.cartId ? Number(p.cartId) : null,
      })),
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
      summary: {
        totalRevenue,
        paymentCount: payments.length,
      },
    };
  }

  async getUsersReport(
    page: number = 1,
    limit: number = 20,
    role?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(u => ({
        ...u,
        id: Number(u.id),
      })),
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  async getVenuesReport(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return {
      data: venues.map(v => ({
        ...v,
        id: Number(v.id),
        ownerId: v.ownerId ? Number(v.ownerId) : null,
      })),
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  async getVendorsReport(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    // Note: Vendor model might not have status field, so we'll query all
    // In production, you'd add status to the Vendor model


    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendor.count(),
    ]);

    return {
      data: vendors.map(v => ({
        ...v,
        id: Number(v.id),
        userId: v.userId ? Number(v.userId) : null,
      })),
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  async exportRevenueReport(startDate?: string, endDate?: string) {
    const where: any = { status: 'CAPTURED' };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvRows = [
      ['ID', 'Customer Name', 'Customer Email', 'Event', 'Amount (Paise)', 'Amount (INR)', 'Currency', 'Status', 'Created At'],
      ...payments.map((p: any) => [
        p.id,
        p.user?.name || 'N/A',
        p.user?.email || 'N/A',
        p.event?.title || 'N/A',
        p.amount,
        (p.amount / 100).toFixed(2),
        p.currency,
        p.status,
        new Date(p.createdAt).toISOString(),
      ]),
    ];

    return csvRows.map(row => row.join(',')).join('\n');
  }

  async exportUsersReport() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvRows = [
      ['ID', 'Name', 'Email', 'Role', 'Active', 'Email Verified', 'Created At'],
      ...users.map((u: any) => [
        u.id,
        u.name,
        u.email,
        u.role,
        u.isActive,
        u.isEmailVerified,
        new Date(u.createdAt).toISOString(),
      ]),
    ];

    return csvRows.map(row => row.join(',')).join('\n');
  }

  async getSystemOverview() {
    const [venueStatusCounts, vendorStatusCounts, totalVenues, totalVendors, recentVenues, recentVendors] = await Promise.all([
      this.prisma.venue.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.vendor.groupBy({
        by: ['verificationStatus'],
        _count: { id: true },
      }),
      this.prisma.venue.count(),
      this.prisma.vendor.count(),
      this.prisma.venue.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { name: true, email: true } },
        },
      }),
      this.prisma.vendor.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, isActive: true } },
        },
      }),
    ]);

    const venueStatusBreakdown = {
      PENDING_APPROVAL: 0,
      ACTIVE: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
      DELISTED: 0,
      REJECTED: 0,
    };
    venueStatusCounts.forEach((item) => {
      if (item.status in venueStatusBreakdown) {
        venueStatusBreakdown[item.status as keyof typeof venueStatusBreakdown] = item._count.id;
      }
    });

    const vendorStatusBreakdown = {
      PENDING: 0,
      VERIFIED: 0,
      REJECTED: 0,
      SUSPENDED: 0,
    };
    vendorStatusCounts.forEach((item) => {
      if (item.verificationStatus in vendorStatusBreakdown) {
        vendorStatusBreakdown[item.verificationStatus as keyof typeof vendorStatusBreakdown] = item._count.id;
      }
    });

    return {
      summary: { totalVenues, totalVendors },
      venuesByStatus: venueStatusBreakdown,
      vendorsByStatus: vendorStatusBreakdown,
      recentVenues: recentVenues.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        area: v.area,
        status: v.status,
        ownerName: v.owner?.name || 'N/A',
        ownerEmail: v.owner?.email || 'N/A',
        createdAt: v.createdAt.toISOString(),
      })),
      recentVendors: recentVendors.map((v) => ({
        id: v.id,
        businessName: v.businessName,
        businessType: v.businessType,
        city: v.city,
        area: v.area,
        verificationStatus: v.verificationStatus,
        ownerName: v.user?.name || 'N/A',
        ownerEmail: v.user?.email || 'N/A',
        isActive: v.user?.isActive || false,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  }
}