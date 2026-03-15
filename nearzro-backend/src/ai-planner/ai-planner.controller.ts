import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AIPlannerService } from './ai-planner.service';
import { AIPlannerQueue, JobStatusResponse } from './queue/ai-planner.queue';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAIPlanDto } from './dto/create-ai-plan.dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  RATE_LIMIT_CONFIG,
  ERROR_MESSAGES,
} from './constants/ai-planner.constants';

@ApiTags('AI Planner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('ai-planner')
export class AIPlannerController {
  constructor(
    private readonly service: AIPlannerService,
    private readonly queue: AIPlannerQueue,
  ) {}

  /**
   * Generate AI Plan (Async)
   * 
   * POST /ai-planner/generate
   * 
   * Enqueues a job to generate AI plan and returns immediately with jobId.
   * Use GET /ai-planner/jobs/:jobId to check status.
   */
  @Throttle({
    default: {
      limit: RATE_LIMIT_CONFIG.GENERATE.LIMIT,
      ttl: RATE_LIMIT_CONFIG.GENERATE.TTL * 1000,
    },
  })
  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Generate AI plan asynchronously' })
  async generate(@Req() req: any, @Body() dto: CreateAIPlanDto) {
    // Validate DTO is properly provided
    if (!dto) {
      throw new BadRequestException('Request body is required');
    }

    // Enqueue job and return immediately
    const { jobId } = await this.queue.addGeneratePlanJob({
      userId: req.user.userId,
      budget: dto.budget,
      eventType: dto.eventType,
      city: dto.city,
      area: dto.area,
      guestCount: dto.guestCount,
      eventId: dto.eventId,
    });

    return {
      jobId,
      message: 'AI plan generation job queued successfully',
      status: 'waiting',
    };
  }

  /**
   * Get Job Status
   * 
   * GET /ai-planner/jobs/:jobId
   * 
   * Returns the status of a queued job.
   */
  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get job status by job ID' })
  async getJobStatus(@Param('jobId') jobId: string): Promise<JobStatusResponse> {
    if (!jobId) {
      throw new BadRequestException('Job ID is required');
    }
    
    return this.queue.getJobStatus(jobId);
  }

  /**
   * Get Queue Health Status
   * 
   * GET /ai-planner/health
   * 
   * Returns health status of AI Planner components.
   */
  @Get('health')
  @ApiOperation({ summary: 'Get AI Planner health status' })
  async getHealth(): Promise<{
    redis: string;
    queue: string;
    worker: string;
    aiProvider: string;
    queueStats?: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  }> {
    const queueHealthy = await this.queue.isHealthy();
    const queueStats = queueHealthy ? await this.queue.getQueueStats() : undefined;
    
    return {
      redis: queueHealthy ? 'ok' : 'disconnected',
      queue: queueHealthy ? 'ok' : 'paused',
      worker: 'ok', // Worker health would need additional monitoring
      aiProvider: 'ok', // Could be enhanced with actual provider check
      queueStats,
    };
  }

  /**
   * Regenerate AI Plan
   * Rate limited: 5 requests per minute
   */
  @Throttle({
    default: {
      limit: RATE_LIMIT_CONFIG.REGENERATE.LIMIT,
      ttl: RATE_LIMIT_CONFIG.REGENERATE.TTL * 1000,
    },
  })
  @Post(':id/regenerate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Regenerate an existing AI plan' })
  async regenerate(@Req() req: any, @Param('id') id: number) {
    const planId = Number(id);
    
    // Enqueue new job - worker will fetch existing plan data
    const { jobId } = await this.queue.addGeneratePlanJob({
      userId: req.user.userId,
      budget: 0, // Will be fetched from existing plan by worker
      eventType: 'Regenerated',
      city: '',
      area: '',
      guestCount: 0,
      eventId: planId,
    });

    return {
      jobId,
      message: 'AI plan regeneration job queued successfully',
      status: 'waiting',
    };
  }

  /**
   * Match vendors from AI plan
   * Rate limited: 20 requests per minute
   */
  @Throttle({
    default: {
      limit: RATE_LIMIT_CONFIG.VENDOR_MATCH.LIMIT,
      ttl: RATE_LIMIT_CONFIG.VENDOR_MATCH.TTL * 1000,
    },
  })
  @Post(':id/vendors')
  @ApiOperation({ summary: 'Match vendors from an AI plan' })
  matchVendors(@Req() req: any, @Param('id') id: number) {
    // SECURITY FIX: Pass userId for authorization check
    return this.service.matchVendorsFromPlan(Number(id), req.user.userId);
  }

  /**
   * Accept AI plan & create cart
   * Rate limited: 10 requests per minute
   */
  @Throttle({
    default: {
      limit: RATE_LIMIT_CONFIG.ACCEPT.LIMIT,
      ttl: RATE_LIMIT_CONFIG.ACCEPT.TTL * 1000,
    },
  })
  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept AI plan and create cart' })
  acceptPlan(@Req() req: any, @Param('id') id: number) {
    // SECURITY FIX: Pass userId for authorization check
    return this.service.createCartFromAIPlan(req.user.userId, Number(id));
  }
}
