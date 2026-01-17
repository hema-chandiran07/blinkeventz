import { Module } from '@nestjs/common';
import { AIPlannerController } from './ai-planner.controller';
import { AIPlannerService } from './ai-planner.service';
import { OpenAIProvider } from './providers/openai.provider';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, 
  ],
  controllers: [AIPlannerController],
  providers: [AIPlannerService, OpenAIProvider],
})
export class AIPlannerModule {}
