import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger('RolesGuard');

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.error('No user found in request. Ensure JwtAuthGuard is applied before RolesGuard.');
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.role) {
      this.logger.error(`User ${user.userId || user.id} has no role defined.`);
      throw new ForbiddenException('Access denied - role not found');
    }

    // CRITICAL: Ensure case-insensitive comparison or exact match based on Enum string values
    const hasRole = requiredRoles.some(role => String(role) === String(user.role));

    if (!hasRole) {
      this.logger.warn(
        `Access Denied: User ${user.email} (Role: ${user.role}) attempted to access resource requiring [${requiredRoles.join(', ')}]`
      );
      throw new ForbiddenException(`Insufficient permissions. Required: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
