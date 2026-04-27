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
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AIPlannerService } from './ai-planner.service';
import { AIPlannerQueue, JobStatusResponse } from './queue/ai-planner.queue';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateAIPlanDto } from './dto/create-ai-plan.dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import {
  RATE_LIMIT_CONFIG,
  ERROR_MESSAGES,
} from './constants/ai-planner.constants';

@ApiTags('AI Planner')
@UseGuards(ThrottlerGuard)
@Controller('ai-planner')
export class AIPlannerController {
  constructor(
    private readonly service: AIPlannerService,
    private readonly queue: AIPlannerQueue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Public plan preview endpoint
   * 
   * GET /ai-planner/public/plan/:shareId
   * 
   * Returns plan preview using shareId (not plan id).
   * Only returns plan if isPublic=true.
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: 10,  // 10 requests per minute for public plan access
      ttl: 60000,
    },
  })
  @Get('public/plan/:shareId')
  @ApiOperation({ summary: 'Get plan preview by shareId (public, no auth required)' })
  async getPlanPreview(@Param('shareId') shareId: string): Promise<{
    id: number;
    budget: number;
    city: string;
    area: string;
    guestCount: number;
    planJson: any;
    status: string;
    createdAt: Date;
  }> {
    if (!shareId) {
      throw new BadRequestException('Share ID is required');
    }

    // Get plan using shareId - will validate isPublic in service
    const plan = await this.service.getPlanPublic(shareId);
    
    if (!plan) {
      throw new NotFoundException('Plan not found or not available for public sharing');
    }

    return plan;
  }

  /**
   * Generate AI Plan (Async)
   * 
   * POST /ai-planner/generate
   * 
   * Enqueues a job to generate AI plan and returns immediately with jobId.
   * Use GET /ai-planner/jobs/:jobId to check status.
   * Requires authentication and CUSTOMER role.
   */
  @Throttle({
    default: {
      limit: RATE_LIMIT_CONFIG.GENERATE.LIMIT,
      ttl: RATE_LIMIT_CONFIG.GENERATE.TTL * 1000,
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Generate AI plan asynchronously (requires auth)' })
  async generate(@Req() req: any, @Body() dto: CreateAIPlanDto) {
    // Validate DTO is properly provided
    if (!dto) {
      throw new BadRequestException('Request body is required');
    }

    const requestId = uuidv4();

    // Enqueue job and return immediately
    const { jobId } = await this.queue.addGeneratePlanJob({
      userId: req.user.userId,
      conversationId: dto.conversationId,
      budget: dto.budget,
      eventType: dto.eventType,
      city: dto.city,
      area: dto.area,
      guestCount: dto.guestCount,
      eventId: dto.eventId,
      requestId,
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get job status by job ID (requires authentication)' })
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
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Get AI Planner health status (public — no auth required)' })
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
   * Get AI Plan by ID
   * 
   * GET /ai-planner/:id/result
   * 
   * Returns the full plan after a job completes.
   * Requires authentication.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @Get(':id/result')
  @ApiOperation({ summary: 'Get AI plan by ID (requires auth)' })
  async getPlan(@Req() req: any, @Param('id') id: string) {
    const planId = Number(id);
    if (isNaN(planId)) {
      throw new BadRequestException('Invalid plan ID');
    }
    return this.service.getPlan(planId, req.user.userId);
  }

  /**
   * Regenerate AI Plan
   * Rate limited: 5 requests per minute
   * Requires authentication and CUSTOMER role.
   */
  @Throttle({
    default: {
      limit: RATE_LIMIT_CONFIG.REGENERATE.LIMIT,
      ttl: RATE_LIMIT_CONFIG.REGENERATE.TTL * 1000,
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @Post(':id/regenerate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Regenerate an existing AI plan (requires auth)' })
  async regenerate(@Req() req: any, @Param('id') id: number) {
    const planId = Number(id);
    
    // First get the plan to find the conversation
    const plan = await this.service.getPlan(planId, req.user.userId);
    
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    
    // Find conversation linked to this plan
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { planId },
    });
    
    if (!conversation) {
      throw new BadRequestException('No conversation linked to this plan');
    }

    const requestId = uuidv4();

    // Enqueue new job - worker will fetch existing plan data
    const { jobId } = await this.queue.addGeneratePlanJob({
      userId: req.user.userId,
      conversationId: conversation.id,
      budget: 0, // Will be fetched from existing plan by worker
      eventType: 'Regenerated',
      city: '',
      area: '',
      guestCount: 0,
      eventId: planId,
      requestId,
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
   * Requires authentication and CUSTOMER role.
   */
  @Throttle({
    default: {
      limit: RATE_LIMIT_CONFIG.VENDOR_MATCH.LIMIT,
      ttl: RATE_LIMIT_CONFIG.VENDOR_MATCH.TTL * 1000,
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @Post(':id/vendors')
  @ApiOperation({ summary: 'Match vendors from an AI plan (requires auth)' })
  matchVendors(@Req() req: any, @Param('id') id: number) {
    // SECURITY FIX: Pass userId for authorization check
    return this.service.matchVendorsFromPlan(Number(id), req.user.userId);
  }

  /**
   * Accept AI plan & create cart
   * Rate limited: 10 requests per minute
   * Requires authentication and CUSTOMER role.
   */
  @Throttle({
    default: {
      limit: RATE_LIMIT_CONFIG.ACCEPT.LIMIT,
      ttl: RATE_LIMIT_CONFIG.ACCEPT.TTL * 1000,
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept AI plan and create cart (requires auth)' })
  acceptPlan(@Req() req: any, @Param('id') id: number) {
    // SECURITY FIX: Pass userId for authorization check
    return this.service.createCartFromAIPlan(req.user.userId, Number(id));
  }
}
