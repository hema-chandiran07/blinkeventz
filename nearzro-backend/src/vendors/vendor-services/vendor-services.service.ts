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
   * Get all services for a vendor
   */
  async findByVendor(vendorId: number) {
    try {
      return await this.prisma.vendorService.findMany({
        where: { vendorId },
      });
    } catch (error) {
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to fetch vendor services';
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
}
