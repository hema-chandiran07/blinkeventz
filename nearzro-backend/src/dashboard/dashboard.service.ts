import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventStatus, VendorVerificationStatus, VenueStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStats() {
    const [
      totalUsers,
      totalVenues,
      totalVendors,
      totalEvents,
      pendingApprovals,
      totalRevenue,
      monthlyRevenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.venue.count(),
      this.prisma.vendor.count(),
      this.prisma.event.count(),
      this.prisma.venue.count({ where: { status: VenueStatus.PENDING_APPROVAL } }),
      this.prisma.event.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: [EventStatus.CONFIRMED, EventStatus.COMPLETED] } },
      }),
      this.getMonthlyRevenue(),
    ]);

    const confirmedEvents = await this.prisma.event.count({
      where: { status: EventStatus.CONFIRMED },
    });

    const inProgressEvents = await this.prisma.event.count({
      where: { status: EventStatus.IN_PROGRESS },
    });

    return {
      totalUsers,
      totalVenues,
      totalVendors,
      totalEvents,
      pendingApprovals,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      monthlyRevenue,
      confirmedEvents,
      inProgressEvents,
    };
  }

  async getMonthlyRevenue() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const revenue = await this.prisma.event.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: { gte: firstDayOfMonth },
        status: { in: [EventStatus.CONFIRMED, EventStatus.COMPLETED] },
      },
    });

    return revenue._sum.totalAmount || 0;
  }

  async getRevenueAnalytics() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const monthlyData = await this.prisma.event.groupBy({
      by: ['createdAt'],
      _sum: { totalAmount: true },
      _count: { id: true },
      where: {
        createdAt: { gte: sixMonthsAgo },
        status: { in: [EventStatus.CONFIRMED, EventStatus.COMPLETED] },
      },
    });

    // Group by month
    const revenueByMonth = {};
    const bookingsByMonth = {};

    monthlyData.forEach((item) => {
      const month = new Date(item.createdAt).toLocaleString('default', {
        month: 'short',
        year: '2-digit',
      });
      revenueByMonth[month] = (revenueByMonth[month] || 0) + (item._sum.totalAmount || 0);
      bookingsByMonth[month] = (bookingsByMonth[month] || 0) + (item._count || 0);
    });

    // Event type breakdown
    const eventTypeBreakdown = await this.prisma.event.groupBy({
      by: ['eventType'],
      _count: { id: true },
      _sum: { totalAmount: true },
      where: {
        status: { in: [EventStatus.CONFIRMED, EventStatus.COMPLETED] },
      },
    });

    // City-wise analytics
    const cityBreakdown = await this.prisma.event.groupBy({
      by: ['city'],
      _count: { id: true },
      _sum: { totalAmount: true },
      where: {
        status: { in: [EventStatus.CONFIRMED, EventStatus.COMPLETED] },
      },
    });

    return {
      revenueByMonth,
      bookingsByMonth,
      eventTypeBreakdown: eventTypeBreakdown.map((item) => ({
        type: item.eventType,
        count: item._count,
        revenue: item._sum.totalAmount || 0,
      })),
      cityBreakdown: cityBreakdown.map((item) => ({
        city: item.city,
        count: item._count,
        revenue: item._sum.totalAmount || 0,
      })),
    };
  }

  async getRecentActivity() {
    const recentEvents = await this.prisma.event.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true, email: true },
        },
      },
    });

    const recentVenues = await this.prisma.venue.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { name: true, email: true },
        },
      },
    });

    const recentVendors = await this.prisma.vendor.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    return {
      recentEvents: recentEvents.map((e) => ({
        type: 'EVENT',
        id: e.id,
        title: e.title || `${e.eventType} Event`,
        customer: e.customer?.name,
        status: e.status,
        amount: e.totalAmount,
        createdAt: e.createdAt,
      })),
      recentVenues: recentVenues.map((v) => ({
        type: 'VENUE',
        id: v.id,
        title: v.name,
        owner: v.owner?.name,
        city: v.city,
        status: v.status,
        createdAt: v.createdAt,
      })),
      recentVendors: recentVendors.map((v) => ({
        type: 'VENDOR',
        id: v.id,
        title: v.businessName,
        owner: v.user?.name,
        city: v.city,
        status: v.verificationStatus,
        createdAt: v.createdAt,
      })),
    };
  }

  async getCustomerStats(userId: number) {
    const [totalEvents, upcomingEvents, totalSpent] = await Promise.all([
      this.prisma.event.count({ where: { customerId: userId } }),
      this.prisma.event.count({
        where: {
          customerId: userId,
          date: { gte: new Date() },
          status: { in: [EventStatus.CONFIRMED, EventStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.event.aggregate({
        _sum: { totalAmount: true },
        where: { customerId: userId },
      }),
    ]);

    return {
      totalEvents,
      upcomingEvents,
      totalSpent: totalSpent._sum.totalAmount || 0,
    };
  }

  async getProviderStats(userId: number, role: string) {
    if (role === 'VENUE_OWNER') {
      const [totalVenues, totalBookings, totalRevenue] = await Promise.all([
        this.prisma.venue.count({ where: { ownerId: userId } }),
        this.prisma.event.count({ where: { venue: { ownerId: userId } } }),
        this.prisma.event.aggregate({
          _sum: { totalAmount: true },
          where: { venue: { ownerId: userId } },
        }),
      ]);

      return {
        totalVenues,
        totalBookings,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      };
    }

    if (role === 'VENDOR') {
      const [totalServices, totalBookings, totalRevenue] = await Promise.all([
        this.prisma.vendorService.count({ where: { vendor: { userId } } }),
        this.prisma.eventService.count({ where: { vendorService: { vendor: { userId } } } }),
        this.prisma.eventService.aggregate({
          _sum: { finalPrice: true },
          where: { vendorService: { vendor: { userId } } },
        }),
      ]);

      return {
        totalServices,
        totalBookings,
        totalRevenue: totalRevenue._sum.finalPrice || 0,
      };
    }

    return {};
  }
}
