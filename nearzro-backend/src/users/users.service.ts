import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        image: true,
      },
    });
  }

  async getUserById(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        isEmailVerified: true,
        phone: true,
        isActive: true,
        image: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        isEmailVerified: true,
        image: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================================
  // UPDATE USER PROFILE
  // ============================================================================

  async updateProfile(userId: number, data: { name?: string; phone?: string; city?: string; area?: string; image?: string }) {
    const updateData: any = {};
    
    if (data.name) updateData.name = data.name;
    if (data.phone) updateData.phone = data.phone;
    if (data.image) updateData.image = data.image; // Store Base64 image
    
    // Update vendor profile if exists
    if (data.city || data.area) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId },
      });
      
      if (vendor) {
        await this.prisma.vendor.update({
          where: { userId },
          data: {
            city: data.city || vendor.city,
            area: data.area || vendor.area,
          },
        });
      }
      
      // Update venue profile if exists
      const venue = await this.prisma.venue.findFirst({
        where: { ownerId: userId },
      });
      
      if (venue) {
        await this.prisma.venue.updateMany({
          where: { ownerId: userId },
          data: {
            city: data.city || venue.city,
            area: data.area || venue.area,
          },
        });
      }
    }
    
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        image: true,
      },
    });
  }

  // ============================================================================
  // UPDATE PASSWORD
  // ============================================================================

  async updatePassword(userId: number, data: { currentPassword: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new BadRequestException('User does not have a password');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(data.newPassword, saltRounds);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { success: true, message: 'Password updated successfully' };
  }

  // ============================================================================
  // USER EVENTS & PAYMENTS
  // ============================================================================

  /**
   * Get events for a specific user
   */
  async getUserEvents(userId: number): Promise<any[]> {
    return this.prisma.event.findMany({
      where: { customerId: userId },
      include: {
        services: {
          include: {
            vendorService: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get payments for a specific user
   */
  async getUserPayments(userId: number): Promise<any[]> {
    return this.prisma.payment.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================================
  // ADMIN USER MANAGEMENT
  // ============================================================================

  /**
   * Update user (Admin only)
   * Admin can change user role, status, email, etc.
   */
  async updateUser(
    userId: number,
    data: any,
    requestingUserId?: number,
  ) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException(`User ID ${userId} not found`);
    }

    // Prevent user from changing their own role away from ADMIN
    if (requestingUserId && requestingUserId === userId) {
      if (data.role && data.role !== existingUser.role && existingUser.role === 'ADMIN') {
        throw new ForbiddenException('Admins cannot change their own role. Ask another admin to do this.');
      }
    }

    // Validate role if provided
    if (data.role) {
      const validRoles = ['CUSTOMER', 'VENDOR', 'VENUE_OWNER', 'ADMIN', 'EVENT_MANAGER', 'SUPPORT'];
      if (!validRoles.includes(data.role)) {
        throw new BadRequestException(`Invalid role: ${data.role}. Must be one of: ${validRoles.join(', ')}`);
      }

      // CRITICAL SAFETY CHECK: If changing role from ADMIN to something else
      if (data.role !== 'ADMIN' && existingUser.role === 'ADMIN') {
        const adminCount = await this.prisma.user.count({
          where: { role: 'ADMIN', isActive: true },
        });

        if (adminCount <= 1) {
          throw new BadRequestException(
            'Cannot change the last active admin role. At least one admin must remain in the system.',
          );
        }
      }
    }

    // Check if email is being changed and if it's already taken
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailExists && emailExists.id !== userId) {
        throw new BadRequestException('Email already in use by another user');
      }
    }

    // Check if phone is being changed and if it's already taken
    if (data.phone && data.phone !== existingUser.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });

      if (phoneExists && phoneExists.id !== userId) {
        throw new BadRequestException('Phone number already in use by another user');
      }
    }

    // If role is changing, handle profile migration
    if (data.role && data.role !== existingUser.role) {
      await this.handleRoleChange(userId, existingUser.role, data.role);
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        isActive: data.isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log the role change action
    if (data.role && data.role !== existingUser.role) {
      await this.prisma.auditLog.create({
        data: {
          actorId: requestingUserId || userId,
          action: 'ROLE_CHANGED',
          entityType: 'User',
          entityId: userId.toString(),
          severity: 'INFO',
          source: 'ADMIN',
          description: `User role changed from ${existingUser.role} to ${data.role}`,
          metadata: JSON.stringify({
            oldRole: existingUser.role,
            newRole: data.role,
            changedBy: requestingUserId || 'system',
          }),
        },
      });
    }

    return updatedUser;
  }

  /**
   * Change user role (admin only)
   * Dedicated endpoint for role changes to avoid mass assignment
   */
  async changeUserRole(userId: number, role: Role, requestingAdminId: number) {
    // Reuse updateUser logic with only role field
    return this.updateUser(userId, { role }, requestingAdminId);
  }

  /**
   * Handle role change with profile migration
   * Creates/deletes appropriate profiles based on new role
   */
  private async handleRoleChange(
    userId: number,
    oldRole: string,
    newRole: string,
  ): Promise<void> {
    // Step 1: Clean up old profile based on previous role
    await this.cleanupOldProfile(userId, oldRole);

    // Step 2: Create new profile if required for the new role
    await this.createNewProfile(userId, newRole);

    // Step 3: Update or clear related caches
    await this.clearUserCaches(userId);
  }

  /**
   * Clean up profile data when user changes role
   */
  private async cleanupOldProfile(userId: number, oldRole: string): Promise<void> {
    switch (oldRole) {
      case 'VENDOR':
        // Delete vendor profile and related data
        await this.prisma.vendorService.deleteMany({ where: { vendorId: userId } }).catch(() => {});
        await this.prisma.portfolioImage.deleteMany({ where: { vendorId: userId } }).catch(() => {});
        await this.prisma.vendor.delete({ where: { userId } }).catch(() => {});
        break;

      case 'VENUE_OWNER':
        // Delete venue profiles
        await this.prisma.venuePhoto.deleteMany({
          where: { venue: { ownerId: userId } }
        }).catch(() => {});
        await this.prisma.availabilitySlot.deleteMany({
          where: { venueId: userId }
        }).catch(() => {});
        await this.prisma.venue.deleteMany({ where: { ownerId: userId } }).catch(() => {});
        break;

      case 'CUSTOMER':
        // Delete customer profile
        await this.prisma.customerProfile.delete({ where: { userId } }).catch(() => {});
        break;

      default:
        // EVENT_MANAGER, SUPPORT, ADMIN - no special profiles to clean
        break;
    }
  }

  /**
   * Create new profile based on role
   */
  private async createNewProfile(userId: number, newRole: string): Promise<void> {
    switch (newRole) {
      case 'VENDOR':
        // Create or update vendor profile with default values
        await this.prisma.vendor.upsert({
          where: { userId },
          update: {
            businessName: 'New Vendor Business',
            description: 'Vendor profile updated after role change',
            verificationStatus: 'PENDING',
            verified: false,
            city: 'Not Set',
            area: 'Not Set',
          },
          create: {
            userId,
            businessName: 'New Vendor Business',
            description: 'Vendor profile created after role change',
            verificationStatus: 'PENDING',
            verified: false,
            city: 'Not Set',
            area: 'Not Set',
          },
        });
        break;

      case 'VENUE_OWNER':
        // Venue owners don't get automatic venue creation
        // They need to manually create venues
        break;

      case 'CUSTOMER':
        // Create or update basic customer profile
        await this.prisma.customerProfile.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
          },
        });
        break;

      case 'EVENT_MANAGER':
      case 'SUPPORT':
      case 'ADMIN':
        // These roles don't require additional profile creation
        break;

      default:
        console.warn(`Unknown role: ${newRole}. No profile created.`);
        break;
    }
  }

  /**
   * Clear user-related caches after role change
   */
  private async clearUserCaches(userId: number): Promise<void> {
    // Clear notification preferences
    await this.prisma.notificationPreference.deleteMany({ where: { userId } }).catch(() => {});

    // Clear any cached tokens or sessions
    await this.prisma.refreshToken.deleteMany({ where: { userId } }).catch(() => {});
  }

  /**
   * Delete user (Admin only)
   * Hard delete - permanently removes user from database
   */
  async deleteUser(userId: number, requestingUserId?: number) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // CRITICAL SAFETY CHECK: Prevent deleting the last active admin
    if (user.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { role: 'ADMIN', isActive: true },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last active admin account. Please create another admin first or deactivate instead.',
        );
      }

      // Log admin deletion for audit trail
      await this.prisma.auditLog.create({
        data: {
          actorId: requestingUserId || userId,
          action: 'ADMIN_DELETED',
          entityType: 'User',
          entityId: userId.toString(),
          severity: 'HIGH',
          source: 'ADMIN',
          description: `Admin account deleted: ${user.email}`,
          metadata: JSON.stringify({
            deletedAdminEmail: user.email,
            deletedBy: requestingUserId || 'system',
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }

    // Get vendor and venue IDs for this user
    const vendors = await this.prisma.vendor.findMany({ where: { userId }, select: { id: true } });
    const vendorIds = vendors.map(v => v.id);
    const venues = await this.prisma.venue.findMany({ where: { ownerId: userId }, select: { id: true } });
    const venueIds = venues.map(v => v.id);

    // Get vendor service IDs (for EventService/CartItem references)
    const vendorServices = await this.prisma.vendorService.findMany({ 
      where: { vendorId: { in: vendorIds } }, 
      select: { id: true } 
    });
    const vendorServiceIds = vendorServices.map(vs => vs.id);

    // Delete related records in correct order to avoid FK constraints
    // 1. Delete AvailabilitySlot records for venues
    if (venueIds.length > 0) {
      await this.prisma.availabilitySlot.deleteMany({
        where: { venueId: { in: venueIds } }
      });
    }

    // 2. Delete VendorService records for vendors
    if (vendorIds.length > 0) {
      await this.prisma.vendorService.deleteMany({
        where: { vendorId: { in: vendorIds } }
      });
    }

    // 3. Delete EventService records for venue/vendor
    const eventServiceConditions: any[] = [];
    if (venueIds.length > 0) eventServiceConditions.push({ venueId: { in: venueIds } });
    if (vendorServiceIds.length > 0) eventServiceConditions.push({ vendorServiceId: { in: vendorServiceIds } });
    
    if (eventServiceConditions.length > 0) {
      await this.prisma.eventService.deleteMany({
        where: { OR: eventServiceConditions }
      });
    }

    // 4. Delete CartItem records for venue/vendor
    const cartItemConditions: any[] = [];
    if (venueIds.length > 0) cartItemConditions.push({ venueId: { in: venueIds } });
    if (vendorServiceIds.length > 0) cartItemConditions.push({ vendorServiceId: { in: vendorServiceIds } });
    
    if (cartItemConditions.length > 0) {
      await this.prisma.cartItem.deleteMany({
        where: { OR: cartItemConditions }
      });
    }

    // 5. Delete Review records for venue/vendor
    const reviewConditions: any[] = [];
    if (venueIds.length > 0) reviewConditions.push({ venueId: { in: venueIds } });
    if (vendorIds.length > 0) reviewConditions.push({ vendorId: { in: vendorIds } });
    
    if (reviewConditions.length > 0) {
      await this.prisma.review.deleteMany({
        where: { OR: reviewConditions }
      });
    }

    // 6. Delete vendor and venue records
    await this.prisma.vendor.deleteMany({ where: { userId } });
    await this.prisma.venue.deleteMany({ where: { ownerId: userId } });

    // 7. Delete other user-related records
    await this.prisma.customerProfile.deleteMany({ where: { userId } });
    await this.prisma.kycDocument.deleteMany({ where: { userId } });
    await this.prisma.bankAccount.deleteMany({ where: { userId } });
    await this.prisma.notificationPreference.deleteMany({ where: { userId } });
    await this.prisma.cart.deleteMany({ where: { userId } });
    await this.prisma.aIPlan.deleteMany({ where: { userId } });
    await this.prisma.aIConversation.deleteMany({ where: { userId } });
    
    // 8. Delete ALL notifications for this user
    await this.prisma.notification.deleteMany({ where: { userId } });
    
    // 9. Delete ALL refresh tokens (invalidates all sessions immediately)
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    
    // 10. Delete audit logs related to this user
    await this.prisma.auditLog.deleteMany({ 
      where: { actorId: userId } 
    });
    await this.prisma.auditLog.deleteMany({ 
      where: { entityId: userId.toString() } 
    });

    // 11. Hard delete user - COMPLETE REMOVAL
    return this.prisma.user.delete({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }
}
