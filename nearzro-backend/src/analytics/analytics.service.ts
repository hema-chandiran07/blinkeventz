import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [gmv, bookings, revenue, users, topVenues, topVendors] = await Promise.all([
      this.getGMV(),
      this.getBookings(),
      this.getRevenue(),
      this.getUsers(),
      this.getTopVenues(),
      this.getTopVendors(),
    ]);

    return {
      gmv,
      bookings,
      revenue,
      users,
      topVenues,
      topVendors,
    };
  }

  async getGMV() {
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [currentGMV, lastGMV] = await Promise.all([
      this.prisma.event.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: {
            gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
          },
        },
      }),
      this.prisma.event.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
          },
        },
      }),
    ]);

    const growth = lastGMV._sum.totalAmount
      ? Math.round(
          ((currentGMV._sum.totalAmount || 0) - lastGMV._sum.totalAmount) /
            lastGMV._sum.totalAmount *
            100,
        )
      : 0;

    // Monthly breakdown (last 6 months)
    const monthly = await this.prisma.event.groupBy({
      by: ['createdAt'],
      _sum: { totalAmount: true },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Last 6 months
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const monthlyData = monthly.map((m) => ({
      month: new Date(m.createdAt).toLocaleString('default', { month: 'short' }),
      amount: m._sum.totalAmount || 0,
    }));

    return {
      total: currentGMV._sum.totalAmount || 0,
      growth,
      monthly: monthlyData,
    };
  }

  async getBookings() {
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [currentCount, lastCount, byStatus] = await Promise.all([
      this.prisma.event.count({
        where: {
          createdAt: {
            gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
          },
        },
      }),
      this.prisma.event.count({
        where: {
          createdAt: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
          },
        },
      }),
      this.prisma.event.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const growth = lastCount ? Math.round(((currentCount - lastCount) / lastCount) * 100) : 0;

    const byStatusObj = {
      confirmed: 0,
      pending: 0,
      completed: 0,
    };

    byStatus.forEach((s) => {
      if (s.status === 'CONFIRMED') byStatusObj.confirmed = s._count;
      if (s.status === 'PENDING_PAYMENT') byStatusObj.pending = s._count;
      if (s.status === 'COMPLETED') byStatusObj.completed = s._count;
    });

    return {
      total: currentCount,
      growth,
      byStatus: byStatusObj,
    };
  }

  async getRevenue() {
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const commissionRate = 0.15; // 15% commission

    const [currentRevenue, lastRevenue] = await Promise.all([
      this.prisma.event.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: {
            gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
          },
        },
      }),
      this.prisma.event.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
          },
        },
      }),
    ]);

    const currentTotal = (currentRevenue._sum.totalAmount || 0) * commissionRate;
    const lastTotal = (lastRevenue._sum.totalAmount || 0) * commissionRate;
    const growth = lastTotal ? Math.round(((currentTotal - lastTotal) / lastTotal) * 100) : 0;

    return {
      total: currentTotal,
      growth,
      commission: currentTotal,
    };
  }

  async getUsers() {
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [currentCount, lastCount, byRole] = await Promise.all([
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
          },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lt: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
          },
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    const growth = lastCount ? Math.round(((currentCount - lastCount) / lastCount) * 100) : 0;

    const byRoleObj = {
      customers: 0,
      vendors: 0,
      venueOwners: 0,
    };

    byRole.forEach((r) => {
      if (r.role === 'CUSTOMER') byRoleObj.customers = r._count;
      if (r.role === 'VENDOR') byRoleObj.vendors = r._count;
      if (r.role === 'VENUE_OWNER') byRoleObj.venueOwners = r._count;
    });

    return {
      total: currentCount,
      growth,
      byRole: byRoleObj,
    };
  }

  async getTopVenues(limit: number = 10) {
    const topVenues = await this.prisma.venue.findMany({
      include: {
        events: {
          select: {
            id: true,
            totalAmount: true,
          },
        },
      },
    });

    const venuesWithBookings = topVenues.map((venue) => ({
      id: venue.id,
      name: venue.name,
      bookings: venue.events.length,
      revenue: venue.events.reduce((sum, e) => sum + e.totalAmount, 0),
    }));

    return venuesWithBookings
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getTopVendors(limit: number = 10) {
    const topVendors = await this.prisma.vendor.findMany({
      include: {
        services: {
          include: {
            EventService: {
              include: {
                event: {
                  select: {
                    totalAmount: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const vendorsWithBookings = topVendors.map((vendor) => {
      const totalRevenue = vendor.services.reduce((sum, service) => {
        return (
          sum +
          service.EventService.reduce(
            (serviceSum, es) => serviceSum + (es.event?.totalAmount || 0),
            0,
          )
        );
      }, 0);

      const totalBookings = vendor.services.reduce(
        (sum, service) => sum + service.EventService.length,
        0,
      );

      return {
        id: vendor.id,
        name: vendor.businessName,
        bookings: totalBookings,
        revenue: totalRevenue,
      };
    });

    return vendorsWithBookings
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }
}
