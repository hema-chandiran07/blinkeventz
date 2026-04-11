import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Venue Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER)
@Controller('venues/analytics')
export class VenueAnalyticsController {
  private readonly PLATFORM_FEE_PERCENTAGE = 5;
  private readonly HOLDING_PERIOD_DAYS = 3;

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get comprehensive venue analytics with occupancy metrics' })
  async getVenueAnalytics(@Req() req: any) {
    const userId = req.user.userId;

    const venues = await this.prisma.venue.findMany({
      where: { ownerId: userId },
      include: {
        reviews: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (venues.length === 0) {
      return this.getEmptyAnalytics();
    }

    const venueIds = venues.map(v => v.id);

    const bookings = await this.prisma.booking.findMany({
      where: { slot: { venueId: { in: venueIds } } },
      include: {
        slot: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        cart: { items: { some: { venueId: { in: venueIds } } } },
      },
      include: { cart: { include: { items: true } } },
    });

    const metrics = this.calculateVenueMetrics(venues, bookings, payments);
    const occupancyAnalytics = await this.calculateOccupancyAnalytics(venueIds, bookings);
    const monthlyRevenue = this.calculateMonthlyRevenue(payments, venueIds, 12);
    const venuePerformance = await this.calculateVenuePerformance(venues, bookings, payments);
    const eventTypeBreakdown = this.calculateEventTypeBreakdown(bookings);
    const seasonalTrends = this.calculateSeasonalTrends(bookings);

    const allReviews = venues.flatMap(v => v.reviews);
    const recentReviews = allReviews.slice(0, 10).map((r: any) => ({
      id: r.id,
      venueName: venues.find(v => v.reviews.some((vr: any) => vr.id === r.id))?.name,
      customerName: r.user?.name || 'Anonymous',
      rating: r.rating || 5,
      comment: r.comment || '',
      createdAt: r.createdAt,
    }));

    return {
      ...metrics,
      occupancyAnalytics,
      monthlyRevenue,
      venuePerformance,
      eventTypeBreakdown,
      seasonalTrends,
      recentReviews,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    };
  }

  @Get('occupancy')
  @ApiOperation({ summary: 'Get detailed occupancy analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  async getOccupancyAnalytics(@Req() req: any, @Query('period') period: string = 'month') {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, city: true },
    });

    if (venues.length === 0) return { occupancyRate: 0, byVenue: [], trends: [] };

    const venueIds = venues.map(v => v.id);

    const totalSlots = await this.prisma.availabilitySlot.count({
      where: { venueId: { in: venueIds } },
    });

    const bookings = await this.prisma.booking.findMany({
      where: { slot: { venueId: { in: venueIds } } },
      include: { slot: true },
    });

    const now = new Date();
    const dateFilter = this.getDateFilter(period, now);
    const filteredBookings = bookings.filter((b: any) => new Date(b.slot.date) >= dateFilter);

    const byVenue = await Promise.all(
      venues.map(async venue => {
        const venueSlots = await this.prisma.availabilitySlot.count({
          where: { venueId: venue.id },
        });

        const venueBookings = filteredBookings.filter((b: any) => b.slot.venueId === venue.id);
        const bookedSlots = new Set(venueBookings.map((b: any) => `${b.slot.date}-${b.slot.timeSlot}`)).size;

        return {
          venueId: venue.id,
          venueName: venue.name,
          city: venue.city,
          totalSlots: venueSlots,
          bookedSlots,
          availableSlots: venueSlots - bookedSlots,
          occupancyRate: venueSlots > 0 ? Math.round((bookedSlots / venueSlots) * 100 * 10) / 10 : 0,
          revenue: venueBookings.reduce((sum: number) => sum + 15000, 0),
        };
      })
    );

    const trends = this.calculateOccupancyTrends(bookings, venueIds, 12);
    const totalBookedSlots = new Set(filteredBookings.map((b: any) => `${b.slot.date}-${b.slot.timeSlot}`)).size;
    const overallOccupancyRate = totalSlots > 0
      ? Math.round((totalBookedSlots / totalSlots) * 100 * 10) / 10
      : 0;

    return {
      period,
      occupancyRate: overallOccupancyRate,
      byVenue: byVenue.sort((a, b) => b.occupancyRate - a.occupancyRate),
      trends,
      totalSlots,
      totalBookedSlots,
      totalAvailableSlots: totalSlots - totalBookedSlots,
    };
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get detailed revenue analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  async getRevenueAnalytics(@Req() req: any, @Query('period') period: string = 'month') {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, city: true, basePriceEvening: true },
    });

    if (venues.length === 0) return { totalRevenue: 0, breakdown: [], trends: [] };

    const venueIds = venues.map(v => v.id);

    const payments = await this.prisma.payment.findMany({
      where: {
        cart: { items: { some: { venueId: { in: venueIds } } } },
        status: 'CAPTURED',
      },
      include: { cart: { include: { items: true } } },
    });

    const now = new Date();
    const dateFilter = this.getDateFilter(period, now);
    const filteredPayments = payments.filter((p: any) => new Date(p.createdAt) >= dateFilter);

    const breakdown = await Promise.all(
      venues.map(async venue => {
        const venuePayments = filteredPayments.filter((p: any) =>
          p.cart?.items?.some((i: any) => i.venueId === venue.id)
        );

        const grossRevenue = venuePayments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const platformFee = grossRevenue * (this.PLATFORM_FEE_PERCENTAGE / 100);
        const netRevenue = grossRevenue - platformFee;

        return {
          venueId: venue.id,
          venueName: venue.name,
          city: venue.city,
          bookings: venuePayments.length,
          grossRevenue,
          platformFee,
          netRevenue,
          averageBookingValue: venuePayments.length > 0 ? grossRevenue / venuePayments.length : 0,
        };
      })
    );

    const totalGrossRevenue = breakdown.reduce((sum, v) => sum + v.grossRevenue, 0);
    const totalPlatformFee = breakdown.reduce((sum, v) => sum + v.platformFee, 0);
    const totalNetRevenue = breakdown.reduce((sum, v) => sum + v.netRevenue, 0);
    const trends = this.calculateRevenueTrends(payments, venueIds, 12);

    return {
      period,
      totalGrossRevenue,
      totalPlatformFee,
      totalNetRevenue,
      effectiveFeeRate: totalGrossRevenue > 0 ? (totalPlatformFee / totalGrossRevenue) * 100 : 0,
      breakdown: breakdown.sort((a, b) => b.netRevenue - a.netRevenue),
      trends,
      currency: 'INR',
    };
  }

  @Get('events')
  @ApiOperation({ summary: 'Get event type analytics' })
  async getEventAnalytics(@Req() req: any) {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({ where: { ownerId: userId }, select: { id: true } });

    if (venues.length === 0) return { byEventType: [], byCity: [], bySeason: [] };

    const venueIds = venues.map(v => v.id);

    const bookings = await this.prisma.booking.findMany({
      where: { slot: { venueId: { in: venueIds } } },
      include: { slot: true },
    });

    const byEventType = new Map<string, number>();
    bookings.forEach((b: any) => {
      const eventType = (b as any).slot.eventType || 'General';
      byEventType.set(eventType, (byEventType.get(eventType) || 0) + 1);
    });

    const venueCities = await this.prisma.venue.findMany({
      where: { id: { in: venueIds } },
      select: { id: true, city: true },
    });

    const cityMap = new Map(venueCities.map(v => [v.id, v.city]));
    const byCity = new Map<string, number>();
    bookings.forEach((b: any) => {
      const city = cityMap.get(b.slot.venueId) || 'Unknown';
      byCity.set(city, (byCity.get(city) || 0) + 1);
    });

    const bySeason = this.calculateSeasonalTrends(bookings);

    return {
      byEventType: Array.from(byEventType.entries()).map(([type, count]) => ({
        eventType: type,
        count,
        percentage: bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0,
      })).sort((a, b) => b.count - a.count),
      byCity: Array.from(byCity.entries()).map(([city, count]) => ({
        city,
        count,
        percentage: bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0,
      })).sort((a, b) => b.count - a.count),
      bySeason,
    };
  }

  private calculateVenueMetrics(venues: any[], bookings: any[], payments: any[]) {
    const venueIds = venues.map(v => v.id);

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED').length;
    const pendingBookings = bookings.filter((b: any) => ['PENDING', 'CONFIRMED'].includes(b.status)).length;
    const cancelledBookings = bookings.filter((b: any) => b.status === 'CANCELLED').length;

    const venuePayments = payments.filter((p: any) =>
      p.cart?.items?.some((i: any) => venueIds.includes(i.venueId))
    );

    const totalRevenue = venuePayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const completedRevenue = venuePayments
      .filter((p: any) => ['CAPTURED', 'DISBURSED'].includes(p.status))
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const allReviews = venues.flatMap(v => v.reviews);
    const averageRating = allReviews.length > 0
      ? allReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / allReviews.length
      : 0;

    const totalSlots = venues.reduce((sum: number, v: any) => sum + (v.capacity || 1), 0);
    const bookedSlots = bookings.length;
    const occupancyRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentBookings = bookings.filter((b: any) => new Date(b.createdAt) >= last30Days);
    const previousBookings = bookings.filter((b: any) =>
      new Date(b.createdAt) >= previous30Days && new Date(b.createdAt) < last30Days
    );

    const bookingsGrowth = previousBookings.length > 0
      ? ((recentBookings.length - previousBookings.length) / previousBookings.length) * 100
      : recentBookings.length > 0 ? 100 : 0;

    const recentRevenue = venuePayments
      .filter((p: any) => new Date(p.createdAt) >= last30Days)
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const previousRevenue = venuePayments
      .filter((p: any) => new Date(p.createdAt) >= previous30Days && new Date(p.createdAt) < last30Days)
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const revenueGrowth = previousRevenue > 0
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
      : recentRevenue > 0 ? 100 : 0;

    return {
      totalRevenue: Math.round(totalRevenue),
      completedRevenue: Math.round(completedRevenue),
      pendingRevenue: Math.round(totalRevenue - completedRevenue),
      totalVenues: venues.length,
      activeVenues: venues.filter((v: any) => v.status === 'ACTIVE').length,
      totalBookings,
      completedBookings,
      pendingBookings,
      cancelledBookings,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: allReviews.length,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      bookingsGrowth: Math.round(bookingsGrowth * 10) / 10,
    };
  }

  private async calculateOccupancyAnalytics(venueIds: number[], bookings: any[]) {
    const totalSlots = await this.prisma.availabilitySlot.count({
      where: { venueId: { in: venueIds } },
    });

    const bookedSlots = bookings.length;
    const availableSlots = totalSlots - bookedSlots;

    const byTimeSlot = new Map<string, { total: number; booked: number }>();
    bookings.forEach((b: any) => {
      const slot = b.slot.timeSlot || 'full_day';
      const existing = byTimeSlot.get(slot) || { total: 0, booked: 0 };
      existing.booked++;
      byTimeSlot.set(slot, existing);
    });

    const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0];
    bookings.forEach((b: any) => {
      const date = new Date(b.slot.date);
      byDayOfWeek[date.getDay()]++;
    });

    return {
      overallOccupancyRate: totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100 * 10) / 10 : 0,
      totalSlots,
      bookedSlots,
      availableSlots,
      byTimeSlot: Array.from(byTimeSlot.entries()).map(([slot, data]) => ({
        timeSlot: slot,
        booked: data.booked,
        occupancyRate: data.total > 0 ? Math.round((data.booked / data.total) * 100) : 0,
      })),
      byDayOfWeek: {
        Sunday: byDayOfWeek[0],
        Monday: byDayOfWeek[1],
        Tuesday: byDayOfWeek[2],
        Wednesday: byDayOfWeek[3],
        Thursday: byDayOfWeek[4],
        Friday: byDayOfWeek[5],
        Saturday: byDayOfWeek[6],
      },
      peakDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        byDayOfWeek.indexOf(Math.max(...byDayOfWeek))
      ],
    };
  }

  private calculateMonthlyRevenue(payments: any[], venueIds: number[], months: number = 12) {
    const result: any[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthPayments = payments.filter((p: any) => {
        const paymentDate = new Date(p.createdAt);
        return paymentDate >= monthStart && paymentDate <= monthEnd &&
          p.cart?.items?.some((i: any) => venueIds.includes(i.venueId));
      });

      const grossRevenue = monthPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
      const platformFee = grossRevenue * (this.PLATFORM_FEE_PERCENTAGE / 100);
      const netRevenue = grossRevenue - platformFee;

      result.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        grossRevenue: Math.round(grossRevenue),
        platformFee: Math.round(platformFee),
        netRevenue: Math.round(netRevenue),
        bookings: monthPayments.length,
      });
    }

    return result;
  }

  private async calculateVenuePerformance(venues: any[], bookings: any[], payments: any[]) {
    return await Promise.all(
      venues.map(async venue => {
        const venueBookings = bookings.filter((b: any) => b.slot.venueId === venue.id);
        const venuePayments = payments.filter((p: any) =>
          p.cart?.items?.some((i: any) => i.venueId === venue.id)
        );

        const grossRevenue = venuePayments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const netRevenue = grossRevenue * (1 - this.PLATFORM_FEE_PERCENTAGE / 100);

        const venueReviews = venue.reviews || [];
        const averageRating = venueReviews.length > 0
          ? venueReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / venueReviews.length
          : 0;

        return {
          venueId: venue.id,
          venueName: venue.name,
          city: venue.city,
          type: venue.type,
          bookings: venueBookings.length,
          grossRevenue: Math.round(grossRevenue),
          netRevenue: Math.round(netRevenue),
          averageRating: Math.round(averageRating * 10) / 10,
          reviews: venueReviews.length,
          status: venue.status,
        };
      })
    ).then((results: any[]) => results.sort((a, b) => b.netRevenue - a.netRevenue));
  }

  private calculateEventTypeBreakdown(bookings: any[]) {
    const byType = new Map<string, number>();
    bookings.forEach((b: any) => {
      const type = b.slot.eventType || 'General';
      byType.set(type, (byType.get(type) || 0) + 1);
    });

    return Array.from(byType.entries()).map(([type, count]) => ({
      eventType: type,
      count,
      percentage: bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }

  private calculateSeasonalTrends(bookings: any[]) {
    const byMonth = new Map<number, number>();
    bookings.forEach((b: any) => {
      const month = new Date(b.slot.date).getMonth();
      byMonth.set(month, (byMonth.get(month) || 0) + 1);
    });

    const seasons = {
      spring: [2, 3, 4],
      summer: [5, 6, 7],
      fall: [8, 9, 10],
      winter: [11, 0, 1],
    };

    const bySeason = {
      spring: seasons.spring.reduce((sum, m) => sum + (byMonth.get(m) || 0), 0),
      summer: seasons.summer.reduce((sum, m) => sum + (byMonth.get(m) || 0), 0),
      fall: seasons.fall.reduce((sum, m) => sum + (byMonth.get(m) || 0), 0),
      winter: seasons.winter.reduce((sum, m) => sum + (byMonth.get(m) || 0), 0),
    };

    const total = bookings.length;
    return {
      spring: { bookings: bySeason.spring, percentage: total > 0 ? Math.round((bySeason.spring / total) * 100) : 0 },
      summer: { bookings: bySeason.summer, percentage: total > 0 ? Math.round((bySeason.summer / total) * 100) : 0 },
      fall: { bookings: bySeason.fall, percentage: total > 0 ? Math.round((bySeason.fall / total) * 100) : 0 },
      winter: { bookings: bySeason.winter, percentage: total > 0 ? Math.round((bySeason.winter / total) * 100) : 0 },
      peakSeason: Object.entries(bySeason).sort(([, a], [, b]) => b - a)[0][0],
    };
  }

  private calculateOccupancyTrends(bookings: any[], venueIds: number[], months: number = 12) {
    const result: any[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthBookings = bookings.filter((b: any) => {
        const bookingDate = new Date(b.slot.date);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      });

      result.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        bookings: monthBookings.length,
        occupancyRate: 0,
      });
    }

    return result;
  }

  private calculateRevenueTrends(payments: any[], venueIds: number[], months: number = 12) {
    const result: any[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthPayments = payments.filter((p: any) => {
        const paymentDate = new Date(p.createdAt);
        return paymentDate >= monthStart && paymentDate <= monthEnd &&
          p.cart?.items?.some((i: any) => venueIds.includes(i.venueId));
      });

      const revenue = monthPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

      result.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        revenue: Math.round(revenue),
      });
    }

    return result;
  }

  private getDateFilter(period: string, now: Date): Date {
    switch (period) {
      case 'week': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case 'quarter': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case 'year': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      default: return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
  }

  private getEmptyAnalytics() {
    return {
      totalRevenue: 0,
      completedRevenue: 0,
      pendingRevenue: 0,
      totalVenues: 0,
      activeVenues: 0,
      totalBookings: 0,
      completedBookings: 0,
      pendingBookings: 0,
      cancelledBookings: 0,
      averageRating: 0,
      totalReviews: 0,
      occupancyRate: 0,
      revenueGrowth: 0,
      bookingsGrowth: 0,
      occupancyAnalytics: { overallOccupancyRate: 0, totalSlots: 0, bookedSlots: 0, availableSlots: 0, byTimeSlot: [], byDayOfWeek: {}, peakDay: 'N/A' },
      monthlyRevenue: [],
      venuePerformance: [],
      eventTypeBreakdown: [],
      seasonalTrends: {},
      recentReviews: [],
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    };
  }
}
