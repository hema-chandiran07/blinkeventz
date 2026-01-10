// src/ai-planner/ai-planner.module.ts
import { Module } from '@nestjs/common';

import { AIPlannerController } from './ai-planner.controller';
import { AIPlannerService } from './ai-planner.service';
import { AIProviderService } from './ai/ai-provider.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AIPlannerController],
  providers: [AIPlannerService, AIProviderService],
})
export class AIPlannerModule {}
