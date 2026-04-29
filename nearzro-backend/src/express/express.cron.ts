import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ExpressStatus } from '@prisma/client';

@Injectable()
export class ExpressCron {
  private readonly logger = new Logger(ExpressCron.name);

  constructor(private readonly prisma: PrismaService) {}

<<<<<<< Updated upstream
=======
  async onModuleInit() {
    // Initialize Redlock with Redis connection(s)
    // BullModule already configures Redis; we'll re-use REDIS_HOST/PORT
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = Number(process.env.REDIS_PORT) || 6379;
    const redisUrl = `redis://${redisHost}:${redisPort}`;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    const client = new Redis(redisUrl);

    this.redlock = new Redlock(
      [client],
      {
        driftFactor: 0.01,
        retryCount: 0, // No retries for cron - just skip if lock not acquired
        retryDelay: 200,
        retryJitter: 200,
      },
    );
  }

  // No destroy method needed — Redlock does not provide one
  async onModuleDestroy() {
    // Optional cleanup - Redlock has no destroy; connections will close on process exit
  }

>>>>>>> Stashed changes
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
