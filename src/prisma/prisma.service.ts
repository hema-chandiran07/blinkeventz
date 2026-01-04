import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // This runs when the module starts, connecting to your DB
  async onModuleInit() {
    await this.$connect();
  }

  // This ensures the app closes the database connection gracefully
  async onModuleDestroy() {
    await this.$disconnect();
  }
}