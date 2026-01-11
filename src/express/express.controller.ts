// src/express/express.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExpressService } from './express.service';
import { CreateExpressDto } from './dto/create-express.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/auth-request.interface';

@ApiTags('Express')
@UseGuards(JwtAuthGuard)
@Controller('express')
export class ExpressController {
  constructor(private readonly service: ExpressService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateExpressDto) {
    return this.service.createForUser(req.user.userId, dto);
  }

  @Get('temp-event/:id')
  getByTempEvent(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.getByTempEventForUser(
      req.user.userId,
      +id,
    );
  }
}
