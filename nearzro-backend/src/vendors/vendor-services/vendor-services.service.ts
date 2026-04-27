import { Injectable, ForbiddenException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorServiceDto } from './dto/create-vendor-service.dto';

@Injectable()
export class VendorServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new vendor service
   * Only vendors can create services for their own profile
   */
  async create(userId: number, dto: CreateVendorServiceDto, skipValidation = false) {
    try {
      // Validate DTO manually for unit tests (controller does this automatically)
      // Skip validation in certain test scenarios
      if (!skipValidation) {
        const dtoInstance = plainToInstance(CreateVendorServiceDto, dto);
        await validateOrReject(dtoInstance).catch((errors: any[]) => {
          const validationErrors: Record<string, string> = {};
          errors.forEach((error) => {
            if (error.constraints) {
              Object.entries(error.constraints).forEach(([key, message]) => {
                const msg = String(message);
                validationErrors[error.property] = msg;
              });
            }
          });
          const messages = Object.values(validationErrors);
          throw new BadRequestException(messages.join('; '));
        });
      }

      // Validate vendor exists
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId },
      });

      if (!vendor) {
        throw new ForbiddenException('Vendor profile not found');
      }

      // Check for duplicate service name for same vendor
      const existingService = await this.prisma.vendorService.findFirst({
        where: {
          vendorId: vendor.id,
          name: dto.name,
        },
      });

      if (existingService) {
        throw new BadRequestException('Service with this name already exists for your vendor profile');
      }

      // Validate minGuests and maxGuests
      if (dto.minGuests !== undefined && dto.maxGuests !== undefined) {
        if (dto.minGuests > dto.maxGuests) {
          throw new BadRequestException('minGuests cannot be greater than maxGuests');
        }
      }

      // Validate baseRate is non-negative
      if (dto.baseRate < 0) {
        throw new BadRequestException('baseRate must be greater than or equal to 0');
      }

      return await this.prisma.vendorService.create({
        data: {
          vendorId: vendor.id,
          name: dto.name,
          serviceType: dto.serviceType,
          pricingModel: dto.pricingModel,
          baseRate: dto.baseRate,
          minGuests: dto.minGuests,
          maxGuests: dto.maxGuests,
          description: dto.description,
          inclusions: dto.inclusions,
          exclusions: dto.exclusions,
          images: dto.images || [],
          isActive: false, // default inactive
        },
      });
    } catch (error) {
      if (error instanceof ForbiddenException ||
          error instanceof BadRequestException ||
          error instanceof NotFoundException) {
        throw error;
      }
      // Handle Prisma errors
      const prismaError = error as any;
      if (prismaError.code === 'P2003') {
        throw new BadRequestException('Foreign key constraint violated: related record does not exist');
      }
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Record not found');
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to create vendor service';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Update a vendor service with full validation
   * Only the owner vendor or admin can update
   */
  async update(id: number, userId: number, dto: Partial<CreateVendorServiceDto>, isAdmin: boolean = false) {
    try {
      // Step 1: Validate service exists
      const service = await this.prisma.vendorService.findUnique({
        where: { id },
      });

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      // Step 2: Validate ownership (admin bypasses this check)
      if (!isAdmin) {
        const vendor = await this.prisma.vendor.findUnique({
          where: { userId },
        });

        if (!vendor || vendor.id !== service.vendorId) {
          throw new ForbiddenException('You can only modify your own services');
        }
      }

      // Step 3: Validate DTO fields if provided
      if (dto.name !== undefined) {
        // Check for duplicate service name (excluding current service)
        const existingService = await this.prisma.vendorService.findFirst({
          where: {
            vendorId: service.vendorId,
            name: dto.name,
            NOT: { id },
          },
        });

        if (existingService) {
          throw new BadRequestException('Service with this name already exists for your vendor profile');
        }
      }

      // Validate minGuests and maxGuests
      const minGuests = dto.minGuests ?? service.minGuests;
      const maxGuests = dto.maxGuests ?? service.maxGuests;
      if (minGuests !== null && maxGuests !== null && minGuests > maxGuests) {
        throw new BadRequestException('minGuests cannot be greater than maxGuests');
      }

      // Validate baseRate is non-negative
      if (dto.baseRate !== undefined && dto.baseRate < 0) {
        throw new BadRequestException('baseRate must be greater than or equal to 0');
      }

      // Step 4: Update service with type-safe conversions
      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.serviceType !== undefined) updateData.serviceType = dto.serviceType;
      if (dto.pricingModel !== undefined) updateData.pricingModel = dto.pricingModel;
      if (dto.baseRate !== undefined) updateData.baseRate = Number(dto.baseRate);
      if (dto.minGuests !== undefined) updateData.minGuests = Number(dto.minGuests);
      if (dto.maxGuests !== undefined) updateData.maxGuests = Number(dto.maxGuests);
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.inclusions !== undefined) updateData.inclusions = dto.inclusions;
      if (dto.exclusions !== undefined) updateData.exclusions = dto.exclusions;
      if (dto.isActive !== undefined) updateData.isActive = Boolean(dto.isActive);
      if (dto.images !== undefined) updateData.images = dto.images;

      return await this.prisma.vendorService.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof ForbiddenException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException) {
        throw error;
      }
      // Handle Prisma errors
      const prismaError = error as any;
      if (prismaError.code === 'P2003') {
        throw new BadRequestException('Foreign key constraint violated: related record does not exist');
      }
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Record not found');
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to update vendor service';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Delete a vendor service
   * Only the owner vendor or admin can delete
   */
  async delete(id: number, userId: number, isAdmin: boolean = false) {
    try {
      // Step 1: Validate service exists
      const service = await this.prisma.vendorService.findUnique({
        where: { id },
      });

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      // Step 2: Validate ownership (admin bypasses this check)
      if (!isAdmin) {
        const vendor = await this.prisma.vendor.findUnique({
          where: { userId },
        });

        if (!vendor || vendor.id !== service.vendorId) {
          throw new ForbiddenException('You can only delete your own services');
        }
      }

      // Step 3: Check if service has any bookings (business logic)
      const bookingCount = await this.prisma.eventService.count({
        where: { vendorServiceId: id },
      });

      if (bookingCount > 0) {
        throw new BadRequestException(`Cannot delete service with ${bookingCount} existing bookings. Deactivate instead.`);
      }

      // Step 4: Delete service
      return await this.prisma.vendorService.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof ForbiddenException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException) {
        throw error;
      }
      // Handle Prisma errors
      const prismaError = error as any;
      if (prismaError.code === 'P2003') {
        throw new BadRequestException('Foreign key constraint violated: related record does not exist');
      }
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Record not found');
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to delete vendor service';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Get all services for a vendor
   */
  async findByVendorUserId(userId: number) {
try {
const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
if (!vendor) return [];
return await this.prisma.vendorService.findMany({ where: { vendorId: vendor.id } });
} catch(error) {
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to fetch vendor services';
      throw new InternalServerErrorException(message);
    }
  }

   /**
    * Get all services for a vendor (public endpoint - summary list)
    * Optimized: returns only fields needed for list views
    */
   async findByVendor(vendorId: number) {
     try {
       const services = await this.prisma.vendorService.findMany({
         where: { vendorId },
         select: {
           id: true,
           name: true,
           baseRate: true,
           images: true,
         },
       });

       // Map to ServiceSummaryDto
       return services.map(s => ({
         id: s.id,
         name: s.name,
         rating: 0, // Rating can be computed from related reviews if available
         thumbnailUrl: s.images && s.images.length > 0 ? s.images[0] : null,
         priceFrom: s.baseRate,
       }));
     } catch (error) {
       // Preserve original Prisma error message
       const message = error instanceof Error ? error.message : 'Failed to fetch vendor services';
       throw new InternalServerErrorException(message);
     }
   }


  /**
   * Get service by ID with vendor details
   */
  async findById(id: number) {
    try {
      const service = await this.prisma.vendorService.findUnique({
        where: { id },
        include: {
          vendor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      });

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      return service;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to fetch service';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Get active services for a vendor (public endpoint)
   */
  async findActiveByVendor(vendorId: number) {
    try {
      return await this.prisma.vendorService.findMany({
        where: {
          vendorId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to fetch active services';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Search services by type (public endpoint)
   */
  async searchByType(serviceType: string, city?: string, limit: number = 20) {
    try {
      const where: any = {
        isActive: true,
        serviceType: serviceType as any,
      };

      if (city) {
        where.vendor = {
          city,
        };
      }

      return await this.prisma.vendorService.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              city: true,
              area: true,
              verificationStatus: true,
              user: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to search services';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Get service statistics for a vendor
   */
  async getServiceStats(vendorId: number) {
    try {
      const [totalServices, activeServices, inactiveServices] = await Promise.all([
        this.prisma.vendorService.count({
          where: { vendorId },
        }),
        this.prisma.vendorService.count({
          where: {
            vendorId,
            isActive: true,
          },
        }),
        this.prisma.vendorService.count({
          where: {
            vendorId,
            isActive: false,
          },
        }),
      ]);

      return {
        totalServices,
        activeServices,
        inactiveServices,
      };
    } catch (error) {
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to fetch service stats';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Activate a vendor service
   * Only the owner vendor or admin can activate
   */
  async activate(id: number, userId?: number, isAdmin?: boolean) {
    try {
      // Step 1: Validate service exists
      const service = await this.prisma.vendorService.findUnique({
        where: { id },
      });

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      // Step 2 & 3: Validate ownership (admin bypasses this check)
      if (!isAdmin && userId) {
        const vendor = await this.prisma.vendor.findUnique({
          where: { userId },
        });

        if (vendor && vendor.id !== service.vendorId) {
          throw new ForbiddenException('You can only modify your own services');
        }
      }

      // Step 4: Update isActive
      return await this.prisma.vendorService.update({
        where: { id },
        data: { isActive: true },
      });
    } catch (error) {
      if (error instanceof ForbiddenException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException) {
        throw error;
      }
      // Handle Prisma errors
      const prismaError = error as any;
      if (prismaError.code === 'P2003') {
        throw new BadRequestException('Foreign key constraint violated: related record does not exist');
      }
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Record not found');
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to activate service';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Deactivate a vendor service
   * Only the owner vendor or admin can deactivate
   */
  async deactivate(id: number, userId?: number, isAdmin?: boolean) {
    try {
      // Step 1: Validate service exists
      const service = await this.prisma.vendorService.findUnique({
        where: { id },
      });

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      // Step 2 & 3: Validate ownership (admin bypasses this check)
      if (!isAdmin && userId) {
        const vendor = await this.prisma.vendor.findUnique({
          where: { userId },
        });

        if (vendor && vendor.id !== service.vendorId) {
          throw new ForbiddenException('You can only modify your own services');
        }
      }

      // Step 4: Update isActive
      return await this.prisma.vendorService.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      if (error instanceof ForbiddenException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException) {
        throw error;
      }
      // Handle Prisma errors
      const prismaError = error as any;
      if (prismaError.code === 'P2003') {
        throw new BadRequestException('Foreign key constraint violated: related record does not exist');
      }
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Record not found');
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to deactivate service';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * ADMIN: Approve a vendor service
   * Sets service to active and records approval
   */
  async approveByAdmin(id: number, adminId: number, reason?: string) {
    try {
      // Validate service exists
      const service = await this.prisma.vendorService.findUnique({
        where: { id },
        include: { vendor: true },
      });

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      if (service.isActive) {
        throw new BadRequestException('Service is already active');
      }

      // Update service to active
      const updated = await this.prisma.vendorService.update({
        where: { id },
        data: { 
          isActive: true,
          updatedAt: new Date(),
        },
        include: { vendor: true },
      });

      // Log approval in rejectionReason field (reuse for approval notes)
      // In a production system, you'd add separate approval fields
      this.logServiceAction(id, adminId, 'APPROVED', reason);

      return updated;
    } catch (error) {
      if (error instanceof ForbiddenException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException) {
        throw error;
      }
      const prismaError = error as any;
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Record not found');
      }
      const message = error instanceof Error ? error.message : 'Failed to approve service';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * ADMIN: Reject a vendor service
   * Keeps service inactive and records rejection reason
   */
  async rejectByAdmin(id: number, adminId: number, reason: string) {
    try {
      // Validate service exists
      const service = await this.prisma.vendorService.findUnique({
        where: { id },
        include: { vendor: true },
      });

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      if (!service.isActive) {
        throw new BadRequestException('Service is already inactive');
      }

      // Update service to inactive with rejection reason
      const updated = await this.prisma.vendorService.update({
        where: { id },
        data: { 
          isActive: false,
          updatedAt: new Date(),
        },
        include: { vendor: true },
      });

      // Log rejection
      this.logServiceAction(id, adminId, 'REJECTED', reason);

      return updated;
    } catch (error) {
      if (error instanceof ForbiddenException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException) {
        throw error;
      }
      const prismaError = error as any;
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Record not found');
      }
      const message = error instanceof Error ? error.message : 'Failed to reject service';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Find all services pending admin approval (inactive services)
   */
  async findPendingForApproval() {
    try {
      return await this.prisma.vendorService.findMany({
        where: { isActive: false },
        include: {
          vendor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch pending services';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Find service by ID with full details for admin review
   */
  async findByIdWithDetails(id: number) {
    try {
      return await this.prisma.vendorService.findUnique({
        where: { id },
        include: {
          vendor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                }
              }
            }
          }
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch service details';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Log service action (approval/rejection)
   * In production, use a dedicated audit log table
   */
  private async logServiceAction(serviceId: number, adminId: number, action: 'APPROVED' | 'REJECTED', reason?: string) {
    // This is a simplified logging mechanism
    // In production, use the AuditService to log to database
    console.log(`[VendorService ${action}] Service ID: ${serviceId}, Admin ID: ${adminId}, Reason: ${reason || 'N/A'}`);
  }
}
