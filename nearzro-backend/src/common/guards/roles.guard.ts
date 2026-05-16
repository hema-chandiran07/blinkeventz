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

    if (!user.role && !user.hasVendorProfile && !user.hasVenueProfile) {
      this.logger.error(`User ${user.userId || user.id} has no role defined.`);
      throw new ForbiddenException('Access denied - role not found');
    }

    // Build a comprehensive set of roles the user possesses
    const userRoles = new Set<string>();

    // Primary role from token (singular)
    if (user.role) {
      userRoles.add(String(user.role).toUpperCase());
    }

    // If roles are provided as an array (future-proof)
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => userRoles.add(String(r).toUpperCase()));
    }

    // Boolean profile flags for multi-role capability
    if (user.hasVendorProfile) {
      userRoles.add(Role.VENDOR);
    }
    if (user.hasVenueProfile) {
      userRoles.add(Role.VENUE_OWNER);
    }

    // Debug/info logging
    this.logger.debug(
      `User ${user.email} (roles: ${Array.from(userRoles).join(', ')}) accessing resource requiring [${requiredRoles.join(', ')}]`,
    );

    // Check if any of the required roles match the user's roles
    const hasRole = requiredRoles.some(role => userRoles.has(String(role).toUpperCase()));

    if (!hasRole) {
      this.logger.warn(
        `Access Denied: User ${user.email} (roles: ${Array.from(userRoles).join(', ')}) attempted to access resource requiring [${requiredRoles.join(', ')}]`,
      );
      throw new ForbiddenException(`Insufficient permissions. Required: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
