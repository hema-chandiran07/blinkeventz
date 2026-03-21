import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get revenue report
   */
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
      data: payments,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
      summary: {
        totalRevenue,
        paymentCount: payments.length,
      },
    };
  }

  /**
   * Get users report
   */
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
      data: users,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Get venues report
   */
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
      data: venues,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Get vendors report
   */
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
      data: vendors,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Export revenue report to CSV
   */
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

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    return csvContent;
  }

  /**
   * Export users report to CSV
   */
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

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    return csvContent;
  }
}
