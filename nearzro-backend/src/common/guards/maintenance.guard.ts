import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow public routes (login, register, health checks, etc.)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check maintenance mode
    try {
      const maintenanceSetting = await this.prisma.settings.findUnique({
        where: { key: 'FEATURE_MAINTENANCE_MODE' },
      });

      if (maintenanceSetting && maintenanceSetting.value === true) {
        const { user } = context.switchToHttp().getRequest();

        // Allow admins during maintenance
        if (user && user.role === 'ADMIN') {
          return true;
        }

        throw new ForbiddenException(
          'The platform is currently under maintenance. Please try again later.'
        );
      }
    } catch (error) {
      // If database query fails (DB down, table missing, etc.), allow access by default
      // This prevents maintenance mode from breaking the entire system
      if (error.code === 'P2025' || error.code === 'P2021' || error.code?.startsWith('P')) {
        return true;
      }
      // For any other error, allow access (fail-safe)
      return true;
    }

    return true;
  }
}
