import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth-request.interface';

import { AIPlannerService } from './ai-planner.service';
import { CreateAIPlanDto } from './dto/create-ai-plan.dto';
import { AcceptAIPlanDto } from './dto/accept-ai-plan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('AI Planner')
@Controller('ai-planner')
@UseGuards(JwtAuthGuard)
export class AIPlannerController {
  constructor(private readonly aiPlannerService: AIPlannerService) {}

@Post('generate')
@UseGuards(JwtAuthGuard)
generate(
  @Req() req: AuthRequest & { user: { id: number } },
  @Body() dto: CreateAIPlanDto,
) {
  return this.aiPlannerService.generatePlan(dto, req.user.userId);
}
  @Post(':id/regenerate')
  regenerate(@Param('id') id: string) {
    return this.aiPlannerService.regeneratePlan(+id);
  }

  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Body() dto: AcceptAIPlanDto,
  ) {
    return this.aiPlannerService.acceptPlan(+id, dto.accept);
  }
}
