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
 * Event Manager Guard
 * 
 * Validates that the current user is an EVENT_MANAGER and is assigned to the event.
 * This guard should be used for operations that event managers can perform on their assigned events.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, EventManagerGuard)
 * @Get(':id/services')
 * getEventServices(@Param('id') id: number) { ... }
 */
@Injectable()
export class EventManagerGuard implements CanActivate {
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

    // Check if user is an event manager
    if (user.role !== Role.EVENT_MANAGER) {
      throw new ForbiddenException(
        'Only event managers can access this resource'
      );
    }

    // Find the event and check if manager is assigned
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { 
        id: true,
        assignedManagerId: true,
        customerId: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Event managers can only access events assigned to them
    // They can also access events they own (as customers)
    if (event.assignedManagerId !== user.userId && event.customerId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to access this event. You must be the assigned manager or owner.'
      );
    }

    return true;
  }
}
