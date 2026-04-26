import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    
    // Enable pg_trgm extension for fuzzy search (imilarity function)
    try {
      await this.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
      this.logger.log('pg_trgm extension enabled for fuzzy search');
    } catch (error) {
      this.logger.warn('Could not enable pg_trgm extension:', error);
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
