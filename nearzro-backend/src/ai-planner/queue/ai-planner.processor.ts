import { Processor, Process, OnQueueError, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { validate, IsInt, IsOptional, IsString, IsNotEmpty, Min } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { AIPlannerQueueService, GeneratePlanJobData, GeneratePlanJobResult } from './ai-planner-queue.service';
import { QUEUE_CONFIG } from '../constants/ai-planner.constants';

/**
 * DTO for validating Generate Plan job payload
 */
class GeneratePlanJobDto {
  @IsInt()
  userId: number;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsInt()
  budget: number;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  area: string;

  @IsInt()
  @Min(1)
  guestCount: number;

  @IsOptional()
  @IsInt()
  eventId?: number;

  @IsOptional()
  @IsString()
  requestId?: string;
}

/**
 * AI Planner Processor
 * 
 * Bull processor for async AI plan generation.
 * Configuration:
 * - Retry: 3 attempts with exponential backoff
 * - Timeout: 10 seconds per job
 * - Concurrency: 5 workers
 * - Special handling for quota errors (no retry)
 */
@Processor(QUEUE_CONFIG.AI_PLANNER_QUEUE)
export class AIPlannerProcessor {
  private readonly logger = new Logger(AIPlannerProcessor.name);

  constructor(private readonly queueService: AIPlannerQueueService) {}

  /**
   * Handle uncaught errors in the queue (e.g., connection errors)
   */
  @OnQueueError()
  async handleError(error: Error): Promise<void> {
    this.logger.error(`Queue error: ${error.message}`, error.stack);
  }

  /**
   * Log job failures to monitoring when job exhausts all retries
   * and moves to DLQ. Structured logging provides observability.
   */
  @OnQueueFailed()
  async onQueueFailed(job: Job<GeneratePlanJobData>, error: Error): Promise<void> {
    this.logger.error({
      event: 'JOB_FAILED_DLQ',
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
      failReason: job.failedReason,
      error: error.message,
      stack: error.stack,
      userId: job.data?.userId,
      requestId: job.data?.requestId,
    });
    // Future: Could persist to a JobFailureLog table or send to external monitoring (Sentry, Datadog)
  }

  /**
   * Process AI plan generation job
   */
  @Process('generate-plan')
  async handleGeneratePlan(
    job: Job<GeneratePlanJobData>,
  ): Promise<GeneratePlanJobResult> {
    // Validate job payload
    const jobDto = plainToClass(GeneratePlanJobDto, job.data);
    const errors = await validate(jobDto);
    if (errors.length > 0) {
      throw new Error('Invalid job payload');
    }

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

      // Check if this is a quota/service unavailable error - do NOT retry
      if (
        errorMessage.includes('SERVICE_UNAVAILABLE') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('Currently the service is unavailable')
      ) {
        this.logger.warn(
          `[Job ${job.id}] Service unavailable - not retrying`,
        );
        
        // Return a failed result instead of throwing to prevent retry
        return {
          planId: 0,
          status: 'failed',
          error: 'SERVICE_UNAVAILABLE',
        };
      }

      // Re-throw other errors to trigger Bull retry mechanism
      throw error;
    }
  }
}
