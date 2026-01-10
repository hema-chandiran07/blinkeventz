import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AIPlannerService } from './ai-planner.service';
import { CreateAIPlanDto } from './dto/create-ai-plan.dto';
import { AcceptAIPlanDto } from './dto/accept-ai-plan.dto';

@ApiTags('AI Planner')
@Controller('ai-planner')
export class AIPlannerController {
  constructor(private readonly aiPlannerService: AIPlannerService) {}

  @Post('generate')
  generate(@Body() dto: CreateAIPlanDto) {
    return this.aiPlannerService.generatePlan(dto);
  }

  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Body() dto: AcceptAIPlanDto,
  ) {
    return this.aiPlannerService.acceptPlan(+id, dto.accept);
  }
}
