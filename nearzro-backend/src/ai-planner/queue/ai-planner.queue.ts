import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bull';
import { GeneratePlanJobData, GeneratePlanJobResult } from './ai-planner-queue.service';
import {
  QUEUE_CONFIG,
  JOB_STATUS,
} from '../constants/ai-planner.constants';

export interface JobStatusResponse {
  jobId: string;
  status: string;
  progress: number;
  attempts: number;
  result?: GeneratePlanJobResult;
  error?: string;
  createdAt?: Date;
  processedAt?: Date;
  finishedAt?: Date;
}

/**
 * AI Planner Queue Producer
 * 
 * Injects the 'ai-planner' queue and provides methods to add jobs.
 * Handles job lifecycle and status tracking.
 */
@Injectable()
export class AIPlannerQueue {
  private readonly logger = new Logger(AIPlannerQueue.name);

  constructor(
    @InjectQueue(QUEUE_CONFIG.AI_PLANNER_QUEUE) private readonly aiPlannerQueue: Queue,
  ) {
    this.logger.log('AI Planner Queue initialized');
  }

  /**
   * Add a plan generation job to the queue
   * 
   * @param data - The job data containing plan parameters
   * @returns The created job with ID
   */
  async addGeneratePlanJob(data: GeneratePlanJobData): Promise<{ jobId: string }> {
    this.logger.log(`Adding AI plan generation job to queue for user ${data.userId}`);

    const job = await this.aiPlannerQueue.add(
      'generate-plan',
      data,
      {
        // Retry configuration: 3 attempts with exponential backoff + jitter
        attempts: QUEUE_CONFIG.ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: QUEUE_CONFIG.BACKOFF_DELAY,
        },
        // Timeout: 10 seconds
        timeout: QUEUE_CONFIG.TIMEOUT,
        // Remove completed jobs after 24 hours
        removeOnComplete: {
          age: QUEUE_CONFIG.REMOVE_COMPLETE_AGE,
          count: QUEUE_CONFIG.REMOVE_COMPLETE_COUNT,
        },
        // Remove failed jobs after 7 days
        removeOnFail: {
          age: QUEUE_CONFIG.REMOVE_FAIL_AGE,
          count: QUEUE_CONFIG.REMOVE_FAIL_COUNT,
        },
      },
    );

    this.logger.log(`Job ${job.id} added to queue for user ${data.userId}`);
    return { jobId: job.id!.toString() };
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const job = await this.aiPlannerQueue.getJob(jobId);
    
    if (!job) {
      return {
        jobId,
        status: JOB_STATUS.FAILED,
        progress: 0,
        attempts: 0,
        error: 'Job not found',
      };
    }

    const state = await job.getState();
    const progress = job.progress() as number;
    
    let result: GeneratePlanJobResult | undefined;
    let error: string | undefined;
    
    // Get result or error from job data
    if (state === 'completed') {
      result = job.returnvalue as GeneratePlanJobResult;
    } else if (state === 'failed') {
      const failedReason = job.failedReason;
      error = failedReason || 'Job failed';
    }

    return {
      jobId: job.id!.toString(),
      status: state,
      progress,
      attempts: job.attemptsMade,
      result,
      error,
      createdAt: job.timestamp ? new Date(job.timestamp) : undefined,
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.aiPlannerQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Job ${jobId} removed from queue`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.aiPlannerQueue.getWaitingCount(),
      this.aiPlannerQueue.getActiveCount(),
      this.aiPlannerQueue.getCompletedCount(),
      this.aiPlannerQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Check if Redis connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple check - try to get queue job counts
      await this.aiPlannerQueue.getJobCounts();
      return true;
    } catch (error) {
      this.logger.error('Queue health check failed - Redis may be disconnected');
      return false;
    }
  }
}
