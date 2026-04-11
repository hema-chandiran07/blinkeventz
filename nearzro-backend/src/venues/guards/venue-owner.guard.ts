import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Venue Owner Guard
 * 
 * Validates that the current user owns the venue being accessed.
 * This guard should be used for PATCH/DELETE operations on venues.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, VenueOwnerGuard)
 * @Patch(':id')
 * updateVenue(@Param('id') id: number) { ... }
 */
@Injectable()
export class VenueOwnerGuard implements CanActivate {
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

    // Bypass ID check for the /venues/my route
    if (request.path.includes('/venues/my')) {
      return true;
    }

    // Get venue ID from params
    const venueId = parseInt(request.params.id, 10);

    // Validate venue ID is a valid number
    if (isNaN(venueId) || venueId <= 0) {
      throw new NotFoundException('Invalid venue ID');
    }

    // Check if user is admin - admins can access any venue
    if (user.role === 'ADMIN') {
      return true;
    }

    // Find the venue and check ownership
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { ownerId: true },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${venueId} not found`);
    }

    // Check if the current user owns the venue (coerce to number for type-safe comparison)
    if (Number(venue.ownerId) !== Number(user.userId)) {
      throw new ForbiddenException(
        'You do not have permission to modify this venue. Only the venue owner can perform this action.'
      );
    }

    return true;
  }
}
