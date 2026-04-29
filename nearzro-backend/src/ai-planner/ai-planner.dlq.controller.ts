import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QUEUE_CONFIG } from './constants/ai-planner.constants';

@ApiTags('AI Planner Admin - DLQ')
@Controller('admin/dlq/ai-planner')
export class AIPlannerDlqController {
  constructor(
    @InjectQueue(QUEUE_CONFIG.AI_PLANNER_DLQ) private readonly dlqQueue: Queue,
    @InjectQueue(QUEUE_CONFIG.AI_PLANNER_QUEUE) private readonly mainQueue: Queue,
  ) {}

  /**
   * GET /admin/dlq/ai-planner
   * List all failed jobs in the dead-letter queue
   * Requires ADMIN role
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List all failed AI plan jobs (admin only)' })
  async getFailedJobs() {
    // Fetch jobs with 'failed' state from DLQ
    const jobs = await this.dlqQueue.getJobs(['failed']);

    return jobs.map((job) => ({
      jobId: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp ? new Date(job.timestamp) : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
      stacktrace: job.stacktrace,
    }));
  }

  /**
   * POST /admin/dlq/ai-planner/:jobId/retry
   * Replay a failed job by moving it back to the main queue
   * Requires ADMIN role
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Post(':jobId/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Retry a failed AI plan job (admin only)' })
  async retryJob(@Param('jobId') jobId: string) {
    const failedJob = await this.dlqQueue.getJob(jobId);
    if (!failedJob) {
      throw new NotFoundException(`Failed job ${jobId} not found in DLQ`);
    }

    // Extract job data
    const jobData = failedJob.data;

    // Add a new job to the main queue with the same data
     const newJob = await this.mainQueue.add('generate-plan', jobData, {
       attempts: QUEUE_CONFIG.ATTEMPTS,
       backoff: {
         type: 'exponential',
         delay: QUEUE_CONFIG.BACKOFF_DELAY,
       },
       timeout: QUEUE_CONFIG.TIMEOUT,
     });
     const newJobId = newJob.id;

    // Remove the old failed job from DLQ
    await failedJob.remove();

    return {
      newJobId,
      message: 'Job requeued successfully to main queue',
    };
  }
}
