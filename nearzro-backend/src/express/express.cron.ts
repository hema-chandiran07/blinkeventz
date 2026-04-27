import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ExpressStatus } from '@prisma/client';
import Redlock from 'redlock';

@Injectable()
export class ExpressCron implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpressCron.name);
  private redlock: Redlock | null = null;
  private readonly lockTTL = 4 * 60 * 1000; // 4 minutes (slightly shorter than 5-minute cron interval)

  constructor(private readonly prisma: PrismaService) {}

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

  async onModuleDestroy() {
    if (this.redlock) {
      await this.redlock.destroy();
    }
  }

  /**
   * Runs every 5 minutes
   * Auto expires express requests past SLA
   */
  @Cron('*/5 * * * *')
  async expireExpressRequests() {
    let lock: Redlock.Lock | null = null;
    const resource = 'cron:express-expire';

    try {
      // Acquire distributed lock
      lock = await this.redlock!.acquire([resource], this.lockTTL);

      this.logger.debug('Acquired lock for express request expiry cron');

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
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('lock')) {
        this.logger.debug('Could not acquire lock for express expiry - another instance running');
      } else {
        this.logger.error({
          event: 'EXPRESS_EXPIRY_ERROR',
          error: error.message,
          stack: error.stack,
        });
      }
    } finally {
      // Release lock if acquired
      if (lock) {
        try {
          await this.redlock!.release(lock);
        } catch (releaseError) {
          // Ignore release errors (lock may have expired)
        }
      }
    }
  }
}
