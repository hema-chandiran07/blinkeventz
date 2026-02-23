import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditRbacGuard } from './guards/audit-rbac.guard';

@Controller('audit')
@UseGuards(AuditRbacGuard)
export class AuditController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(@Query() query: AuditQueryDto) {
    const limit = query.limit ?? 50;

    return this.prisma.auditLog.findMany({
      where: {
        entityType: query.entityType,
        actorId: query.actorId,
        severity: query.severity,
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }
}