import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorVerificationStatus } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all vendors with their services and user info
   */
  async findAll() {
    try {
      return await this.prisma.vendor.findMany({
        include: {
          services: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });
    } catch (error) {
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to fetch vendors';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Get a vendor by ID
   */
  async findById(id: number) {
    try {
      if (id <= 0) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      const vendor = await this.prisma.vendor.findUnique({
        where: { id },
        include: {
          services: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      return vendor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to fetch vendor';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Create a new vendor
   * Validates that user doesn't already have a vendor profile
   */
  async createVendor(userId: number, dto: CreateVendorDto, skipValidation = false) {
    try {
      // Validate DTO manually for unit tests (controller does this automatically)
      // Skip validation in certain test scenarios
      if (!skipValidation) {
        const dtoInstance = plainToInstance(CreateVendorDto, dto);
        await validateOrReject(dtoInstance).catch((errors: any[]) => {
          const validationErrors: Record<string, string> = {};
          errors.forEach((error) => {
            if (error.constraints) {
              Object.entries(error.constraints).forEach(([key, message]) => {
                const msg = String(message);
                // Map class-validator messages to user-friendly messages
                if (msg.includes('is not empty') || msg.includes('should not be empty')) {
                  validationErrors[error.property] = `${error.property} is required`;
                } else {
                  validationErrors[error.property] = msg;
                }
              });
            }
          });
          const messages = Object.values(validationErrors);
          throw new BadRequestException(messages.join('; '));
        });
      }

      // Validate businessName is not empty (additional check) (additional check) (additional check)
      if (!skipValidation) {
        if (!dto.businessName || dto.businessName.trim() === '') {
          throw new BadRequestException('businessName is required');
        }

        // Validate city is not empty
        if (!dto.city || dto.city.trim() === '') {
          throw new BadRequestException('city is required');
        }

        // Validate area is not empty
        if (!dto.area || dto.area.trim() === '') {
          throw new BadRequestException('area is required');
        }

        // Validate serviceRadiusKm is non-negative
        if (dto.serviceRadiusKm !== undefined && dto.serviceRadiusKm < 0) {
          throw new BadRequestException('serviceRadiusKm must be greater than or equal to 0');
        }
      }

      // Check if user already has a vendor profile
      const existingVendor = await this.prisma.vendor.findUnique({
        where: { userId },
      });

      if (existingVendor) {
        throw new BadRequestException('User already has a vendor profile');
      }

      return await this.prisma.vendor.create({
        data: {
          userId,
          businessName: dto.businessName.trim(),
          description: dto.description?.trim(),
          city: dto.city.trim(),
          area: dto.area.trim(),
          serviceRadiusKm: dto.serviceRadiusKm,
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException) {
        throw error;
      }
      // Handle Prisma unique constraint error
      if ((error as any).code === 'P2002') {
        throw new BadRequestException('User already has a vendor profile');
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to create vendor';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Get vendor by user ID
   */
  async getVendorByUserId(userId: number) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId },
        include: { services: true },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor not found for userId ${userId}`);
      }

      return vendor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to fetch vendor';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Approve a vendor (ADMIN only)
   */
  async approveVendor(id: number) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      return await this.prisma.vendor.update({
        where: { id },
        data: {
          verificationStatus: VendorVerificationStatus.VERIFIED,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to approve vendor';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Reject a vendor (ADMIN only)
   */
  async rejectVendor(id: number, reason?: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id },
      });

      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      return await this.prisma.vendor.update({
        where: { id },
        data: {
          verificationStatus: VendorVerificationStatus.REJECTED,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Preserve original Prisma error message
      const message = error instanceof Error ? error.message : 'Failed to reject vendor';
      throw new InternalServerErrorException(message);
    }
  }
}
