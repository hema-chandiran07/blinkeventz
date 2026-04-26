// src/audit/audit.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditRbacGuard } from './guards/audit-rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

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

    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...(query.entityType && { entityType: query.entityType }),
        ...(query.actorId && { actorId: query.actorId }),
        ...(query.severity && { severity: query.severity }),
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      skip,
    });

    // Convert BigInt to string for JSON serialization
    return logs.map(log => ({
      ...log,
      id: Number(log.id),
      actorId: log.actorId ? Number(log.actorId) : null,
      entityId: log.entityId ? Number(log.entityId) : null,
    }));
  }

  /**
   * GDPR Export - Export all audit data for a specific user
   * This endpoint allows users to request their data export
   */
  @Get('gdpr/export/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Export all audit data for a user (GDPR)' })
  async gdprExport(@Param('userId') userId: string) {
    const userIdNum = parseInt(userId, 10);
    
    if (isNaN(userIdNum)) {
      throw new ForbiddenException('Invalid user ID');
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { actorId: userIdNum },
      orderBy: { occurredAt: 'desc' },
    });

    return {
      userId: userIdNum,
      exportDate: new Date().toISOString(),
      totalRecords: auditLogs.length,
      data: auditLogs,
    };
  }

  /**
   * GDPR Right-to-Delete - Delete all audit data for a specific user
   * This endpoint allows users to request deletion of their data
   */
  @Delete('gdpr/delete/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete all audit data for a user (GDPR right-to-delete)' })
  async gdprDelete(@Param('userId') userId: string) {
    const userIdNum = parseInt(userId, 10);
    
    if (isNaN(userIdNum)) {
      throw new ForbiddenException('Invalid user ID');
    }

    const result = await this.prisma.auditLog.deleteMany({
      where: { actorId: userIdNum },
    });

    return {
      userId: userIdNum,
      deletedAt: new Date().toISOString(),
      deletedCount: result.count,
      message: `Successfully deleted ${result.count} audit records for user ${userIdNum}`,
    };
  }

  /**
   * Get audit statistics for dashboard
   */
  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get audit statistics' })
  async getStats() {
    const totalLogs = await this.prisma.auditLog.count();
    
    const bySeverity = await this.prisma.auditLog.groupBy({
      by: ['severity'],
      _count: true,
    });

    const byEntityType = await this.prisma.auditLog.groupBy({
      by: ['entityType'],
      _count: true,
      orderBy: { _count: { entityType: 'desc' } },
      take: 10,
    });

    const pendingOutbox = await this.prisma.auditOutbox.count({
      where: { status: 'PENDING' },
    });

    return {
      totalLogs,
      bySeverity: bySeverity.map(s => ({
        severity: s.severity,
        count: s._count,
      })),
      byEntityType: byEntityType.map(e => ({
        entityType: e.entityType,
        count: e._count,
      })),
      pendingOutbox,
    };
  }

  /**
   * Get outbox queue status
   */
  @Get('outbox/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get audit outbox queue status' })
  async getOutboxStatus() {
    const [pending, processed, failed, deadLetter] = await Promise.all([
      this.prisma.auditOutbox.count({ where: { status: 'PENDING' } }),
      this.prisma.auditOutbox.count({ where: { status: 'PROCESSED' } }),
      this.prisma.auditOutbox.count({ where: { status: 'FAILED' } }),
      this.prisma.auditOutbox.count({ where: { status: 'DEAD_LETTER' } }),
    ]);

    return {
      pending,
      processed,
      failed,
      deadLetter,
      total: pending + processed + failed + deadLetter,
    };
  }
}
