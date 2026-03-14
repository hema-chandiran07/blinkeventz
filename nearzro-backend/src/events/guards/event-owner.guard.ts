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

/**
 * Event Owner Guard
 * 
 * Validates that the current user owns the event being accessed.
 * This guard should be used for PATCH/DELETE operations on events.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, EventOwnerGuard)
 * @Patch(':id')
 * updateEvent(@Param('id') id: number) { ... }
 */
@Injectable()
export class EventOwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user is authenticated, deny access
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get event ID from params
    const eventId = parseInt(request.params.id, 10);

    // Validate event ID is a valid number
    if (isNaN(eventId) || eventId <= 0) {
      throw new NotFoundException('Invalid event ID');
    }

    // Check if user is admin - admins can access any event
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Find the event and check ownership
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { customerId: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Check if the current user owns the event
    if (event.customerId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this event. Only the event owner can perform this action.'
      );
    }

    return true;
  }
}
