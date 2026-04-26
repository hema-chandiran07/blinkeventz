import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class EventOwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const eventId = parseInt(request.params.id, 10);
    if (isNaN(eventId) || eventId <= 0) {
      throw new NotFoundException('Invalid event ID');
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { customerId: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (Number(event.customerId) !== Number(user.userId)) {
      throw new ForbiddenException(
        'You do not have permission to modify this event. Only the event owner can perform this action.'
      );
    }

    return true;
  }
}
