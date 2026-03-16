import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AIPlannerController } from './ai-planner.controller';
import { AIPlannerService } from './ai-planner.service';
import { OpenAIProvider } from './providers/openai.provider';
import { PrismaModule } from '../prisma/prisma.module';

// Import new services
import { PlanGenerationService } from './services/plan-generation.service';
import { VendorMatchingService } from './services/vendor-matching.service';
import { CartConversionService } from './services/cart-conversion.service';

// Import queue components
import { AIPlannerQueue } from './queue/ai-planner.queue';
import { AIPlannerProcessor } from './queue/ai-planner.processor';
import { AIPlannerQueueService } from './queue/ai-planner-queue.service';

import { QUEUE_CONFIG } from './constants/ai-planner.constants';

@Module({
  imports: [
    PrismaModule,
    // Register BullMQ queue for AI Planner
    BullModule.registerQueue(
      {
        name: QUEUE_CONFIG.AI_PLANNER_QUEUE,
      },
    ),
  ],
  controllers: [AIPlannerController],
  providers: [
    AIPlannerService,
    OpenAIProvider,
    // Register new services for dependency injection
    PlanGenerationService,
    VendorMatchingService,
    CartConversionService,
    // Register queue components
    AIPlannerQueue,
    AIPlannerProcessor,
    AIPlannerQueueService,
  ],
  exports: [
    AIPlannerService,
    PlanGenerationService,
    VendorMatchingService,
    CartConversionService,
    AIPlannerQueue,
  ],
})
export class AIPlannerModule {}
