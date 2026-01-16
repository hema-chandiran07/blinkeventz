import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { AIPlannerService } from './ai-planner.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAIPlanDto } from './dto/create-ai-plan.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('AI Planner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-planner')
export class AIPlannerController {
  constructor(private service: AIPlannerService) {}

  // Generate AI Plan
  @Post('generate')
  generate(@Req() req, @Body() dto: CreateAIPlanDto) {
    return this.service.generatePlan(req.user.userId, dto);
  }

  // Regenerate AI Plan
  @Post(':id/regenerate')
  regenerate(@Req() req, @Param('id') id: number) {
    return this.service.regenerate(Number(id), req.user.userId);
  }

  // 🔥 Match vendors from AI plan
  @Post(':id/vendors')
  matchVendors(@Param('id') id: number) {
    return this.service.matchVendorsFromPlan(Number(id));
  }

  // 🔥 Accept AI plan & create cart
  @Post(':id/accept')
  acceptPlan(@Req() req, @Param('id') id: number) {
    return this.service.createCartFromAIPlan(
      req.user.userId,
      Number(id),
    );
  }
}
