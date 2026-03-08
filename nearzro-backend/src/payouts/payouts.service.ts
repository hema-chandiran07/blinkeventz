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
