import { Controller, Get, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Venue Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER)
@Controller('venues/payouts')
export class VenuePayoutsController {
  private readonly PLATFORM_FEE_PERCENTAGE = 5;
  private readonly HOLDING_PERIOD_DAYS = 3;

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get venue payouts with payment tracking' })
  async getMyPayouts(@Req() req: any) {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({ where: { ownerId: userId }, select: { id: true } });

    if (venues.length === 0) {
      return { payouts: [], totalPayouts: 0, pendingPayouts: 0, completedPayouts: 0, currency: 'INR' };
    }

    const venueIds = venues.map(v => v.id);

    const payments = await this.prisma.payment.findMany({
      where: {
        cart: { items: { some: { venueId: { in: venueIds } } } },
      },
      include: { cart: { include: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const payouts = payments.map((payment: any) => {
      const venueItems = payment.cart?.items?.filter((i: any) => venueIds.includes(i.venueId)) || [];
      const venueRevenue = venueItems.reduce((sum: number, i: any) => {
        const itemTotal = (i.quantity || 1) * (Number(i.unitPrice) || 0);
        return sum + itemTotal;
      }, 0);
      const platformFee = venueRevenue * (this.PLATFORM_FEE_PERCENTAGE / 100);
      const netAmount = venueRevenue - platformFee;

      return {
        id: payment.id,
        amount: netAmount,
        grossAmount: venueRevenue,
        platformFee,
        status: this.mapPaymentStatusToPayoutStatus(payment.status),
        paymentStatus: payment.status,
        createdAt: payment.createdAt,
        processedAt: payment.updatedAt,
        venueCount: venueItems.length,
        cartId: payment.cartId,
      };
    });

    const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayouts = payouts
      .filter((p: any) => ['PENDING', 'PROCESSING'].includes(p.status))
      .reduce((sum, p) => sum + p.amount, 0);
    const completedPayouts = payouts
      .filter((p: any) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      payouts,
      totalPayouts,
      pendingPayouts,
      completedPayouts,
      availableForPayout: payouts.filter((p: any) => p.status === 'AVAILABLE').reduce((sum, p) => sum + p.amount, 0),
      currency: 'INR',
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get payout summary' })
  async getPayoutSummary(@Req() req: any) {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({ where: { ownerId: userId }, select: { id: true } });

    if (venues.length === 0) {
      return { availableForPayout: 0, pendingPayout: 0, paidOut: 0, currency: 'INR' };
    }

    const venueIds = venues.map(v => v.id);

    const payments = await this.prisma.payment.findMany({
      where: {
        cart: { items: { some: { venueId: { in: venueIds } } } },
      },
    });

    let availableForPayout = 0;
    let pendingPayout = 0;
    let paidOut = 0;

    payments.forEach((payment: any) => {
      const venueItems = payment.cart?.items?.filter((i: any) => venueIds.includes(i.venueId)) || [];
      const venueRevenue = venueItems.reduce((sum: number, i: any) => {
        const itemTotal = (i.quantity || 1) * (Number(i.unitPrice) || 0);
        return sum + itemTotal;
      }, 0);
      const netAmount = venueRevenue * (1 - this.PLATFORM_FEE_PERCENTAGE / 100);

      if (payment.status === 'CAPTURED') {
        const daysSincePayment = Math.floor((Date.now() - new Date(payment.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSincePayment >= this.HOLDING_PERIOD_DAYS) {
          availableForPayout += netAmount;
        } else {
          pendingPayout += netAmount;
        }
      } else if (['DISBURSED', 'REFUNDED'].includes(payment.status)) {
        paidOut += netAmount;
      } else {
        pendingPayout += netAmount;
      }
    });

    return {
      availableForPayout,
      pendingPayout,
      paidOut,
      totalLifetime: availableForPayout + pendingPayout + paidOut,
      currency: 'INR',
    };
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: 'Get payout details' })
  async getPayoutDetails(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    const venues = await this.prisma.venue.findMany({ where: { ownerId: userId }, select: { id: true } });

    if (venues.length === 0) throw new Error('No venues found');
    const venueIds = venues.map(v => v.id);

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        cart: {
          include: {
            items: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!payment) throw new Error('Payment not found');

    const venueItems = payment.cart?.items?.filter((i: any) => venueIds.includes(i.venueId)) || [];

    if (venueItems.length === 0) {
      throw new Error('No venue items found in this payment');
    }

    const venueRevenue = venueItems.reduce((sum: number, i: any) => {
      const itemTotal = (i.quantity || 1) * (Number(i.unitPrice) || 0);
      return sum + itemTotal;
    }, 0);
    const platformFee = venueRevenue * (this.PLATFORM_FEE_PERCENTAGE / 100);
    const netAmount = venueRevenue - platformFee;

    return {
      id: payment.id,
      amount: netAmount,
      grossAmount: venueRevenue,
      platformFee,
      platformFeePercentage: this.PLATFORM_FEE_PERCENTAGE,
      status: payment.status,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      customer: payment.cart?.user,
      items: venueItems.map((i: any) => ({
        name: i.name || 'Item',
        quantity: i.quantity || 1,
        unitPrice: Number(i.unitPrice) || 0,
        total: (i.quantity || 1) * (Number(i.unitPrice) || 0),
        type: i.itemType,
      })),
    };
  }

  private mapPaymentStatusToPayoutStatus(status: string): string {
    const mapping: Record<string, string> = {
      'PENDING': 'PENDING',
      'CREATED': 'PENDING',
      'AUTHORIZED': 'PENDING',
      'CAPTURED': 'PROCESSING',
      'DISBURSED': 'COMPLETED',
      'FAILED': 'FAILED',
      'REFUNDED': 'REFUNDED',
      'CANCELLED': 'CANCELLED',
      'EXPIRED': 'EXPIRED',
    };
    return mapping[status] || 'PENDING';
  }
}
