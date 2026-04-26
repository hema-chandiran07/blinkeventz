import { Controller, Get, Post, Param, ParseIntPipe, UseGuards, Req, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Vendor Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDOR)
@Controller('vendors/payouts')
export class VendorPayoutsController {
  private readonly PLATFORM_FEE_PERCENTAGE = 5;
  private readonly HOLDING_PERIOD_DAYS = 3;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Get the actual booking amount from the associated service or vendor basePrice
   */
  private async getBookingAmount(vendor: any, booking?: any): Promise<number> {
    // If we have booking info with slot data, try to find the matching service
    if (booking?.slot) {
      const service = await this.prisma.vendorService.findFirst({
        where: { vendorId: vendor.id },
        orderBy: { createdAt: 'desc' },
      });
      if (service) return service.baseRate;
    }
    // Fallback to vendor basePrice
    return vendor.basePrice || 0;
  }

  /**
   * Helper: Calculate platform fee using integer arithmetic to avoid floating-point issues
   */
  private calculatePlatformFee(grossAmount: number): number {
    return Math.round(grossAmount * this.PLATFORM_FEE_PERCENTAGE / 100);
  }

  /**
   * Helper: Calculate net amount after platform fee
   */
  private calculateNetAmount(grossAmount: number): number {
    return grossAmount - this.calculatePlatformFee(grossAmount);
  }

  // ============================================
  // PAYOUT SUMMARY
  // ============================================
  @Get('summary')
  @ApiOperation({ summary: 'Get payout summary' })
  async getPayoutSummary(@Req() req: any) {
    const userId = req.user.userId;
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });

    if (!vendor) {
      return { availableForPayout: 0, nextPayoutAmount: 0, nextPayoutDate: null, lifetimeEarnings: 0, lifetimePayouts: 0 };
    }

    // Use aggregate for efficiency instead of loading all bookings
    const aggregates = await this.prisma.booking.aggregate({
      where: { slot: { vendorId: vendor.id } },
      _count: { id: true },
    });

    // Get the vendor's service rate for calculation
    const grossAmount = await this.getBookingAmount(vendor);
    const netAmount = this.calculateNetAmount(grossAmount);
    const totalBookings = aggregates._count?.id ?? 0;

    // Calculate holding period counts
    const holdingCutoff = new Date();
    holdingCutoff.setDate(holdingCutoff.getDate() - this.HOLDING_PERIOD_DAYS);

    const completedAfterHolding = await this.prisma.booking.count({
      where: {
        slot: { vendorId: vendor.id },
        status: 'COMPLETED',
        completedAt: { lte: holdingCutoff },
      },
    });

    const pendingOrHolding = await this.prisma.booking.count({
      where: {
        slot: { vendorId: vendor.id },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      },
    });

    const availableForPayout = completedAfterHolding * netAmount;
    const pendingPayout = pendingOrHolding * netAmount;
    const lifetimeEarnings = totalBookings * netAmount;
    const nextPayoutDate = this.calculateNextPayoutDate();

    return {
      availableForPayout,
      nextPayoutAmount: availableForPayout,
      nextPayoutDate,
      pendingPayout,
      lifetimeEarnings,
      lifetimePayouts: lifetimeEarnings - availableForPayout - pendingPayout,
      currency: 'INR',
    };
  }

  // ============================================
  // PAYOUT LIST (with pagination)
  // ============================================
  @Get()
  @ApiOperation({ summary: 'Get vendor payouts with holding period logic' })
  async getVendorPayouts(@Req() req: any) {
    const userId = req.user.userId;
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });

    if (!vendor) {
      return { payouts: [], availableForPayout: 0, pendingPayout: 0, processingPayout: 0, paidOut: 0, currency: 'INR' };
    }

    // Fetch bookings with pagination (most recent 50)
    const bookings = await this.prisma.booking.findMany({
      where: { slot: { vendorId: vendor.id } },
      include: {
        slot: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get the vendor's service rate once
    const grossAmount = await this.getBookingAmount(vendor);

    const payouts = bookings.map((booking: any) => {
      const platformFee = this.calculatePlatformFee(grossAmount);
      const netAmount = this.calculateNetAmount(grossAmount);
      const payoutStatus = this.calculatePayoutStatus(booking);
      const eligibleForPayout = this.isEligibleForPayout(booking);

      return {
        id: booking.id,
        bookingId: booking.id,
        customerName: booking.user?.name || 'Anonymous',
        eventName: 'Service Booking',
        eventDate: booking.slot?.date,
        bookingStatus: booking.status,
        grossAmount,
        platformFee,
        netAmount,
        payoutStatus,
        eligibleForPayout,
        createdAt: booking.createdAt,
        completedAt: booking.completedAt,
        estimatedPayoutDate: this.calculateEstimatedPayoutDate(booking),
      };
    });

    const availableForPayout = payouts.filter((p: any) => p.payoutStatus === 'AVAILABLE').reduce((sum: number, p: any) => sum + p.netAmount, 0);
    const pendingPayout = payouts.filter((p: any) => ['PENDING', 'HOLDING'].includes(p.payoutStatus)).reduce((sum: number, p: any) => sum + p.netAmount, 0);
    const processingPayout = payouts.filter((p: any) => p.payoutStatus === 'PROCESSING').reduce((sum: number, p: any) => sum + p.netAmount, 0);
    const paidOut = payouts.filter((p: any) => p.payoutStatus === 'PAID').reduce((sum: number, p: any) => sum + p.netAmount, 0);

    return {
      payouts,
      availableForPayout,
      pendingPayout,
      processingPayout,
      paidOut,
      totalEarnings: availableForPayout + pendingPayout + processingPayout + paidOut,
      currency: 'INR',
      holdingPeriodDays: this.HOLDING_PERIOD_DAYS,
      platformFeePercentage: this.PLATFORM_FEE_PERCENTAGE,
    };
  }

  // ============================================
  // PAYOUT DETAIL
  // ============================================
  @Get(':bookingId')
  @ApiParam({ name: 'bookingId', type: Number })
  @ApiOperation({ summary: 'Get payout details for specific booking' })
  async getPayoutDetails(@Req() req: any, @Param('bookingId', ParseIntPipe) bookingId: number) {
    const userId = req.user.userId;
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        slot: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!booking || (booking as any).slot.vendorId !== vendor.id) {
      throw new NotFoundException('Booking not found');
    }

    const grossAmount = await this.getBookingAmount(vendor, booking);
    const platformFee = this.calculatePlatformFee(grossAmount);
    const netAmount = this.calculateNetAmount(grossAmount);
    const payoutStatus = this.calculatePayoutStatus(booking);
    const payoutHistory = await this.getPayoutHistory(vendor.id);

    return {
      bookingId: booking.id,
      customerName: (booking as any).user?.name || 'Anonymous',
      customerEmail: (booking as any).user?.email,
      customerPhone: (booking as any).user?.phone,
      eventName: 'Service Booking',
      eventDate: (booking as any).slot.date,
      timeSlot: (booking as any).slot.timeSlot,
      bookingStatus: (booking as any).status || 'PENDING',
      grossAmount,
      platformFee,
      platformFeePercentage: this.PLATFORM_FEE_PERCENTAGE,
      netAmount,
      payoutStatus,
      eligibleForPayout: this.isEligibleForPayout(booking),
      createdAt: booking.createdAt,
      completedAt: (booking as any).completedAt || null,
      estimatedPayoutDate: this.calculateEstimatedPayoutDate(booking),
      payoutHistory,
    };
  }

  // ============================================
  // REQUEST PAYOUT
  // ============================================
  @Post(':bookingId/request')
  @ApiParam({ name: 'bookingId', type: Number })
  @ApiOperation({ summary: 'Request payout for eligible booking' })
  async requestPayout(@Req() req: any, @Param('bookingId', ParseIntPipe) bookingId: number, @Body() body?: any) {
    const userId = req.user.userId;
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });

    if (!booking || (booking as any).slot.vendorId !== vendor.id) {
      throw new NotFoundException('Booking not found');
    }

    if (!this.isEligibleForPayout(booking)) {
      throw new BadRequestException('Booking is not eligible for payout yet');
    }

    const grossAmount = await this.getBookingAmount(vendor, booking);
    const netAmount = this.calculateNetAmount(grossAmount);

    const payoutRequest = await this.prisma.payout.create({
      data: {
        vendorId: vendor.id,
        amount: netAmount,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Payout request submitted successfully',
      payoutId: payoutRequest.id,
      amount: payoutRequest.amount,
      estimatedProcessingTime: '1-2 business days',
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  private calculatePayoutStatus(booking: any): string {
    const now = new Date();

    if (booking.status === 'CANCELLED') return 'CANCELLED';

    if (booking.status === 'COMPLETED' && booking.completedAt) {
      const completedDate = new Date(booking.completedAt);
      const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceCompletion >= this.HOLDING_PERIOD_DAYS) {
        return 'AVAILABLE';
      } else {
        return 'HOLDING';
      }
    }

    if (booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS') {
      return 'PENDING';
    }

    return 'PENDING';
  }

  private isEligibleForPayout(booking: any): boolean {
    if (booking.status !== 'COMPLETED' || !booking.completedAt) {
      return false;
    }

    const now = new Date();
    const completedDate = new Date(booking.completedAt);
    const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysSinceCompletion >= this.HOLDING_PERIOD_DAYS;
  }

  private calculateEstimatedPayoutDate(booking: any): Date | null {
    if (!booking.completedAt) return null;

    const completedDate = new Date(booking.completedAt);
    const payoutDate = new Date(completedDate);
    payoutDate.setDate(payoutDate.getDate() + this.HOLDING_PERIOD_DAYS);

    while (payoutDate.getDay() === 0 || payoutDate.getDay() === 6) {
      payoutDate.setDate(payoutDate.getDate() + 1);
    }

    return payoutDate;
  }

  private calculateNextPayoutDate(): Date {
    const now = new Date();
    const nextPayout = new Date(now);
    nextPayout.setDate(nextPayout.getDate() + 1);

    while (nextPayout.getDay() === 0 || nextPayout.getDay() === 6) {
      nextPayout.setDate(nextPayout.getDate() + 1);
    }

    return nextPayout;
  }

  private async getPayoutHistory(vendorId: number) {
    const payouts = await this.prisma.payout.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      createdAt: p.createdAt,
      processedAt: p.processedAt,
    }));
  }
}
