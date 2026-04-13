// src/express/express.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { ExpressService } from './express.service';
import { CreateExpressDto } from './dto/create-express.dto';
import { ApiBearerAuth,ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/auth-request.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
@ApiBearerAuth()
@ApiTags('Express')
@UseGuards(JwtAuthGuard,RolesGuard)
@Controller('express')
export class ExpressController {
  constructor(private readonly service: ExpressService) {}

  // ============================================
  // CUSTOMER ENDPOINTS
  // ============================================

  @Roles(Role.CUSTOMER)
  @Post()
  @ApiOperation({ summary: 'Create express request (customer only)' })
  create(@Req() req: AuthRequest, @Body() dto: CreateExpressDto) {
    return this.service.createForUser(req.user.userId, dto);
  }

  @Roles(Role.CUSTOMER)
  @Get('event/:id')
  @ApiOperation({ summary: 'Get express request by event (customer only)' })
  async getByEvent(@Req() req: AuthRequest, @Param('id') id: string) {
    const result = await this.service.getByEventForUser(
      req.user.userId,
      +id,
    );
    return result ?? null;
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all express requests (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all express requests' })
  async getAllExpressRequests() {
    return this.service.getAllExpressRequests();
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get express request by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns express request details' })
  async getExpressRequestById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getExpressRequestById(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update express request status (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns updated express request' })
  async updateExpressRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status?: string; rejectionReason?: string }
  ) {
    return this.service.updateExpressRequest(id, body);
  }
}
