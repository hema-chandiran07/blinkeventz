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
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/auth-request.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
@ApiBearerAuth() 
@ApiTags('Express')
@Roles(Role.CUSTOMER)
@UseGuards(JwtAuthGuard,RolesGuard)
@Controller('express')
export class ExpressController {
  constructor(private readonly service: ExpressService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateExpressDto) {
    return this.service.createForUser(req.user.userId, dto);
  }

  @Get('event/:id')
  getByEvent(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.getByEventForUser(
      req.user.userId,
      +id,
    );
  }
}
