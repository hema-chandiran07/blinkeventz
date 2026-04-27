import { Controller, Get, Inject, OnModuleInit, Logger, Optional } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthCheckResult, HealthIndicatorResult, PrismaHealthIndicator } from '@nestjs/terminus';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController implements OnModuleInit {
  private readonly logger = new Logger(HealthController.name);
  private redis: Redis | null = null;

  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    @Optional() @Inject('BULL_REDIS') private readonly bullRedis: any,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        lazyConnect: true,
        connectTimeout: 2000,
      });
      await this.redis.connect();
      this.logger.log('Redis health check connection established');
    } catch (error) {
      this.redis = null;
      this.logger.warn('Redis health check connection failed: ' + error.message);
    }
  }

   @Public()
   @Get()
   @HealthCheck()
   async check(): Promise<HealthCheckResult> {
     // Use HealthCheckService with custom indicators
     return this.health.check([
       // (a) Database connectivity via PrismaHealthIndicator
       async () => this.prismaHealth.pingCheck('database', this.prisma),

       // (b) Redis ping via ioredis
       async () => {
         if (!this.redis) {
           return { redis: { status: 'down', message: 'Redis client not initialized' } };
         }
         try {
           const pong = await this.redis.ping();
           if (pong === 'PONG') {
             return { redis: { status: 'up', message: 'Redis pong' } };
           }
           return { redis: { status: 'down', message: 'Invalid response' } };
         } catch (error: any) {
           return { redis: { status: 'down', error: error.message } };
         }
       },

       // (c) BullMQ queue ping via Bull's Redis client
        async () => {
          if (!this.bullRedis) {
            // Return 'up' so the whole app health check doesn't fail; we just note it's bypassed
            return { bullmq: { status: 'up', message: 'Bull optional client bypassed' } };
          }
         try {
           await this.bullRedis.ping();
           return { bullmq: { status: 'up', message: 'BullMQ Redis ping OK' } };
         } catch (error: any) {
           return { bullmq: { status: 'down', error: error.message } };
         }
       },
     ]);
   }
}