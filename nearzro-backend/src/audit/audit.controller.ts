// src/audit/audit.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditRbacGuard } from './guards/audit-rbac.guard';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(AuditRbacGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: 'Audit logs list' })
  async list(@Query() query: AuditQueryDto) {
    const limit = query.limit ?? 50;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    return this.prisma.auditLog.findMany({
      where: {
        ...(query.entityType && { entityType: query.entityType }),
        ...(query.actorId && { actorId: query.actorId }),
        ...(query.severity && { severity: query.severity }),
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      skip,
    });
  }
}