import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('search-audit')
export class SearchAuditProcessor {
  private readonly logger = new Logger(SearchAuditProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process('log-search')
  async handleSearchLog(job: Job<any>) {
    const { userId, query, resultsCount, durationMs } = job.data;

    try {
      const prismaAny = this.prisma as any;
      await prismaAny.searchAudit.create({
        data: {
          userId,
          query,
          resultsCount,
          durationMs,
        },
      });
      this.logger.debug(`Logged search audit for query: "${query}"`);
    } catch (error) {
      this.logger.error(`Failed to log search audit:`, error);
      throw error;
    }
  }
}
