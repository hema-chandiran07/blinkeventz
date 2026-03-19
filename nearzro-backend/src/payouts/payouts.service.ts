import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutStatus } from '@prisma/client';

@Injectable()
export class PayoutsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { status, vendorId, venueId, page = 1, limit = 20 } = query;

    const where: any = {};
    if (status) where.status = status;
    if (vendorId) where.vendorId = +vendorId;
    if (venueId) where.venueId = +venueId;

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          venue: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      data: payouts,
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / +limit),
    };
  }

  async findOne(id: number) {
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: {
        vendor: true,
        venue: true,
        event: true,
      },
    });

    if (!payout) {
      throw new NotFoundException(`Payout ${id} not found`);
    }

    return payout;
  }

  async findByVenueOwner(userId: number, query: any) {
    const { status, page = 1, limit = 50 } = query;

    const where: any = {
      venue: {
        ownerId: userId,
      },
    };

    if (status) {
      where.status = status;
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: {
          venue: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              eventType: true,
              date: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      data: payouts,
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / +limit),
    };
  }

  async getVenueOwnerStats(userId: number) {
    const payouts = await this.prisma.payout.findMany({
      where: {
        venue: {
          ownerId: userId,
        },
      },
      select: {
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    const totalPayouts = payouts
      .filter((p) => p.status === PayoutStatus.APPROVED || p.status === PayoutStatus.PROCESSING)
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayouts = payouts
      .filter((p) => p.status === PayoutStatus.PENDING || p.status === PayoutStatus.PROCESSING)
      .reduce((sum, p) => sum + p.amount, 0);

    const upcomingPayouts = payouts.filter((p) => p.status === PayoutStatus.PENDING).length;

    // Calculate platform fees (5% of total amount)
    const platformFees = payouts.reduce((sum, p) => sum + Math.round(p.amount * 0.05), 0);

    // Monthly breakdown (last 6 months)
    const now = new Date();
    const monthlyData: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = monthDate.toLocaleString('default', { month: 'short' });

      const monthTotal = payouts
        .filter((p) => {
          const payoutDate = new Date(p.createdAt);
          return (
            payoutDate >= monthDate &&
            payoutDate <= monthEnd &&
            (p.status === PayoutStatus.APPROVED || p.status === PayoutStatus.PROCESSING)
          );
        })
        .reduce((sum, p) => sum + p.amount, 0);

      monthlyData.push({ label: monthLabel, value: monthTotal });
    }

    return {
      totalPayouts,
      pendingPayouts,
      upcomingPayouts,
      platformFees,
      monthlyData,
    };
  }

  async approve(id: number) {
    const payout = await this.findOne(id);

    if (payout.status === PayoutStatus.APPROVED) {
      throw new BadRequestException('Payout already approved');
    }

    return this.prisma.payout.update({
      where: { id },
      data: {
        status: PayoutStatus.APPROVED,
        approvedAt: new Date(),
      },
      include: {
        vendor: true,
        venue: true,
      },
    });
  }

  async reject(id: number, reason: string) {
    const payout = await this.findOne(id);

    if (payout.status === PayoutStatus.REJECTED) {
      throw new BadRequestException('Payout already rejected');
    }

    return this.prisma.payout.update({
      where: { id },
      data: {
        status: PayoutStatus.REJECTED,
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
      include: {
        vendor: true,
        venue: true,
      },
    });
  }

  async process(id: number) {
    const payout = await this.findOne(id);

    if (payout.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException('Payout must be approved before processing');
    }

    // TODO: Integrate with payment gateway for actual payout processing
    return this.prisma.payout.update({
      where: { id },
      data: {
        status: PayoutStatus.PROCESSING,
        processedAt: new Date(),
      },
    });
  }

  async export() {
    const payouts = await this.prisma.payout.findMany({
      include: {
        vendor: true,
        venue: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert to CSV format
    const csvRows = [
      ['ID', 'Vendor', 'Venue', 'Amount', 'Status', 'Created At'],
      ...payouts.map((p) => [
        p.id,
        p.vendor?.businessName || '',
        p.venue?.name || '',
        p.amount,
        p.status,
        p.createdAt.toISOString(),
      ]),
    ];

    return csvRows.map((row) => row.join(',')).join('\n');
  }
}
