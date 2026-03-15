import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { AIPlannerQueueService, GeneratePlanJobData, GeneratePlanJobResult } from './ai-planner-queue.service';
import { QUEUE_CONFIG } from '../constants/ai-planner.constants';

/**
 * AI Planner Processor
 * 
 * Bull processor for async AI plan generation.
 * Configuration:
 * - Retry: 3 attempts with exponential backoff
 * - Timeout: 10 seconds per job
 * - Concurrency: 5 workers
 */
@Processor(QUEUE_CONFIG.AI_PLANNER_QUEUE)
export class AIPlannerProcessor {
  private readonly logger = new Logger(AIPlannerProcessor.name);

  constructor(private readonly queueService: AIPlannerQueueService) {}

  /**
   * Process AI plan generation job
   */
  @Process('generate-plan')
  async handleGeneratePlan(
    job: Job<GeneratePlanJobData>,
  ): Promise<GeneratePlanJobResult> {
    const { userId } = job.data;

    this.logger.log(`[Job ${job.id}] Starting AI plan generation for user ${userId}`);
    this.logger.debug(`[Job ${job.id}] Job data: ${JSON.stringify(job.data)}`);

    try {
      const result = await this.queueService.processGeneratePlanJob(job.data);

      if (result.status === 'success') {
        this.logger.log(
          `[Job ${job.id}] AI plan generated successfully: planId=${result.planId}`,
        );
      } else {
        this.logger.error(
          `[Job ${job.id}] AI plan generation failed: ${result.error}`,
        );
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error';

      this.logger.error(
        `[Job ${job.id}] Unexpected error during AI plan generation: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Re-throw to trigger Bull retry mechanism
      throw error;
    }
  }
}
