import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ExpressStatus } from '@prisma/client';

@Injectable()
export class ExpressCron {
  private readonly logger = new Logger(ExpressCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs every 5 minutes
   * Auto expires express requests past SLA
   */
  @Cron('*/5 * * * *')
  async expireExpressRequests() {
    const now = new Date();

    const result = await this.prisma.expressRequest.updateMany({
      where: {
        status: {
          in: [ExpressStatus.PENDING, ExpressStatus.IN_PROGRESS],
        },
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: ExpressStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Expired ${result.count} express requests`,
      );
    }
  }
}
