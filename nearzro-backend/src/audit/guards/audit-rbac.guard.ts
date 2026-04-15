import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class AuditRbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles =
      this.reflector.get<Role[]>('roles', context.getHandler()) || [];

    if (!allowedRoles.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return user && allowedRoles.includes(user.role);
  }
}
