import { Test, TestingModule } from '@nestjs/testing';
import { VendorServicesService } from './vendor-services.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ServiceType, VendorPricingModel } from '@prisma/client';

describe('VendorServicesService', () => {
  let service: VendorServicesService;
  let prisma: PrismaService;

  // Mock data
  const mockVendor = {
    id: 1,
    userId: 1,
    businessName: 'Royal Catering Services',
    description: 'Premium wedding catering',
    city: 'Chennai',
    area: 'Velachery',
    serviceRadiusKm: 25,
    verificationStatus: 'PENDING' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVendor2 = {
    id: 2,
    userId: 2,
    businessName: 'Another Catering Co',
    description: 'Another catering service',
    city: 'Bangalore',
    area: 'MG Road',
    serviceRadiusKm: 30,
    verificationStatus: 'PENDING' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    id: 1,
    vendorId: 1,
    name: 'Wedding Catering',
    serviceType: ServiceType.CATERING,
    pricingModel: VendorPricingModel.PER_EVENT,
    baseRate: 50000,
    minGuests: 100,
    maxGuests: 500,
    description: 'Full catering service',
    inclusions: 'Staff, equipment',
    exclusions: 'Decorations',
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService2 = {
    id: 2,
    vendorId: 2,
    name: 'Corporate Catering',
    serviceType: ServiceType.CATERING,
    pricingModel: VendorPricingModel.PER_PERSON,
    baseRate: 500,
    minGuests: 50,
    maxGuests: 200,
    description: 'Corporate event catering',
    inclusions: 'Staff, equipment',
    exclusions: 'Decorations',
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock PrismaService
  const mockPrisma = {
    vendor: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    vendorService: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorServicesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<VendorServicesService>(VendorServicesService);
    prisma = module.get<PrismaService>(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('POSITIVE TEST CASES', () => {
    describe('create', () => {
      it('should create a service successfully', async () => {
        // Arrange
        const createDto = {
          name: 'Wedding Catering',
          serviceType: ServiceType.CATERING,
          pricingModel: VendorPricingModel.PER_EVENT,
          baseRate: 50000,
          minGuests: 100,
          maxGuests: 500,
          description: 'Full catering service',
          inclusions: 'Staff, equipment',
          exclusions: 'Decorations',
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
        mockPrisma.vendorService.findFirst.mockResolvedValue(null);
        mockPrisma.vendorService.create.mockResolvedValue({
          id: 1,
          vendorId: 1,
          ...createDto,
          isActive: false,
        });

        // Act
        const result = await service.create(1, createDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.name).toBe('Wedding Catering');
        expect(result.isActive).toBe(false);
      });

      it('should create service with minimal data', async () => {
        // Arrange
        const createDto = {
          name: 'Basic Catering',
          serviceType: ServiceType.CATERING,
          pricingModel: VendorPricingModel.PER_EVENT,
          baseRate: 10000,
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
        mockPrisma.vendorService.findFirst.mockResolvedValue(null);
        mockPrisma.vendorService.create.mockResolvedValue({
          id: 1,
          vendorId: 1,
          ...createDto,
          isActive: false,
        });

        // Act
        const result = await service.create(1, createDto);

        // Assert
        expect(result).toBeDefined();
      });
    });

    describe('findByVendor', () => {
      it('should return services for a vendor', async () => {
        // Arrange
        const services = [mockService];
        mockPrisma.vendorService.findMany.mockResolvedValue(services);

        // Act
        const result = await service.findByVendor(1);

        // Assert
        expect(result).toEqual(services);
      });

      it('should return empty array when no services exist', async () => {
        // Arrange
        mockPrisma.vendorService.findMany.mockResolvedValue([]);

        // Act
        const result = await service.findByVendor(1);

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('activate', () => {
      it('should activate a service successfully', async () => {
        // Arrange
        const activatedService = { ...mockService, isActive: true };
        mockPrisma.vendorService.findUnique.mockResolvedValue(mockService);
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor); // Owner vendor
        mockPrisma.vendorService.update.mockResolvedValue(activatedService);

        // Act - userId=1 is the owner of service (vendorId=1)
        const result = await service.activate(1, 1, false);

        // Assert
        expect(result.isActive).toBe(true);
      });

      it('should allow admin to activate any service', async () => {
        // Arrange
        const activatedService = { ...mockService, isActive: true };
        mockPrisma.vendorService.findUnique.mockResolvedValue(mockService);
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor2); // Different vendor
        mockPrisma.vendorService.update.mockResolvedValue(activatedService);

        // Act - Admin bypasses ownership check
        const result = await service.activate(1, 2, true); // userId=2 but isAdmin=true

        // Assert
        expect(result.isActive).toBe(true);
      });
    });

    describe('deactivate', () => {
      it('should deactivate a service successfully', async () => {
        // Arrange
        const activeService = { ...mockService, isActive: true };
        const deactivatedService = { ...mockService, isActive: false };
        mockPrisma.vendorService.findUnique.mockResolvedValue(activeService);
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor); // Owner vendor
        mockPrisma.vendorService.update.mockResolvedValue(deactivatedService);

        // Act - userId=1 is the owner of service
        const result = await service.deactivate(1, 1, false);

        // Assert
        expect(result.isActive).toBe(false);
      });
    });
  });

  describe('SECURITY TESTS (Ownership Validation)', () => {
    describe('activate', () => {
      it('SECURITY: vendor CANNOT activate another vendor service - should throw ForbiddenException', async () => {
        // Arrange: Vendor 1 (userId=1) tries to activate Vendor 2's service (vendorId=2)
        mockPrisma.vendorService.findUnique.mockResolvedValue(mockService2); // Service belongs to vendor 2
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor); // Vendor 1's profile

        // Act & Assert - Should throw ForbiddenException
        await expect(service.activate(2, 1, false)).rejects.toThrow(ForbiddenException);
        await expect(service.activate(2, 1, false)).rejects.toMatchObject({
          message: 'You can only modify your own services',
        });
      });

      it('SECURITY: vendor CANNOT deactivate another vendor service - should throw ForbiddenException', async () => {
        // Arrange: Vendor 1 tries to deactivate Vendor 2's service
        mockPrisma.vendorService.findUnique.mockResolvedValue(mockService2); // Service belongs to vendor 2
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor); // Vendor 1's profile

        // Act & Assert - Should throw ForbiddenException
        await expect(service.deactivate(2, 1, false)).rejects.toThrow(ForbiddenException);
        await expect(service.deactivate(2, 1, false)).rejects.toMatchObject({
          message: 'You can only modify your own services',
        });
      });

      it('ADMIN can activate any service (bypasses ownership)', async () => {
        // Arrange - Admin can activate any vendor's service
        const activatedService = { ...mockService, isActive: true };
        mockPrisma.vendorService.findUnique.mockResolvedValue(mockService);
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor2);
        mockPrisma.vendorService.update.mockResolvedValue(activatedService);

        // Act - Admin bypasses ownership check
        const result = await service.activate(1, 999, true); // Any userId with isAdmin=true

        // Assert
        expect(result.isActive).toBe(true);
      });
    });
  });

  describe('VALIDATION TESTS', () => {
    describe('create', () => {
      it('should reject negative baseRate', async () => {
        // Arrange
        const createDto = {
          name: 'Test Service',
          serviceType: ServiceType.CATERING,
          pricingModel: VendorPricingModel.PER_EVENT,
          baseRate: -1000, // Negative
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);

        // Act & Assert
        await expect(service.create(1, createDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(1, createDto)).rejects.toMatchObject({
          message: 'baseRate must be greater than or equal to 0',
        });
      });

      it('should reject minGuests greater than maxGuests', async () => {
        // Arrange
        const createDto = {
          name: 'Test Service',
          serviceType: ServiceType.CATERING,
          pricingModel: VendorPricingModel.PER_EVENT,
          baseRate: 10000,
          minGuests: 500, // Greater than max
          maxGuests: 100,
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);

        // Act & Assert
        await expect(service.create(1, createDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(1, createDto)).rejects.toMatchObject({
          message: 'minGuests cannot be greater than maxGuests',
        });
      });

      it('should reject invalid serviceType enum', async () => {
        // Arrange
        const createDto = {
          name: 'Test Service',
          serviceType: 'INVALID_TYPE' as any,
          pricingModel: VendorPricingModel.PER_EVENT,
          baseRate: 10000,
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);

        // Act & Assert - This would be caught by class-validator
        await expect(service.create(1, createDto)).rejects.toThrow();
      });

      it('should reject invalid pricingModel enum', async () => {
        // Arrange
        const createDto = {
          name: 'Test Service',
          serviceType: ServiceType.CATERING,
          pricingModel: 'INVALID_MODEL' as any,
          baseRate: 10000,
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);

        // Act & Assert - This would be caught by class-validator
        await expect(service.create(1, createDto)).rejects.toThrow();
      });
    });
  });

  describe('BUSINESS RULE TESTS', () => {
    describe('create', () => {
      it('should fail when vendor profile does not exist', async () => {
        // Arrange
        const createDto = {
          name: 'Test Service',
          serviceType: ServiceType.CATERING,
          pricingModel: VendorPricingModel.PER_EVENT,
          baseRate: 10000,
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.create(999, createDto)).rejects.toThrow(ForbiddenException);
        await expect(service.create(999, createDto)).rejects.toMatchObject({
          message: 'Vendor profile not found',
        });
      });

      it('should fail when duplicate service is created', async () => {
        // Arrange - Creating duplicate service (same name for same vendor)
        const createDto = {
          name: 'Wedding Catering',
          serviceType: ServiceType.CATERING,
          pricingModel: VendorPricingModel.PER_EVENT,
          baseRate: 50000,
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
        mockPrisma.vendorService.findFirst.mockResolvedValue(mockService); // Already exists

        // Act & Assert
        await expect(service.create(1, createDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(1, createDto)).rejects.toMatchObject({
          message: 'Service with this name already exists for your vendor profile',
        });
      });
    });

    describe('activate', () => {
      it('should fail when service does not exist', async () => {
        // Arrange
        mockPrisma.vendorService.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.activate(999, 1, false)).rejects.toThrow(NotFoundException);
        await expect(service.activate(999, 1, false)).rejects.toMatchObject({
          message: 'Service not found',
        });
      });
    });

    describe('deactivate', () => {
      it('should fail when service does not exist', async () => {
        // Arrange
        mockPrisma.vendorService.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.deactivate(999, 1, false)).rejects.toThrow(NotFoundException);
        await expect(service.deactivate(999, 1, false)).rejects.toMatchObject({
          message: 'Service not found',
        });
      });
    });

    describe('findByVendor', () => {
      it('should handle empty vendor services list', async () => {
        // Arrange
        mockPrisma.vendorService.findMany.mockResolvedValue([]);

        // Act
        const result = await service.findByVendor(999);

        // Assert
        expect(result).toEqual([]);
      });

      it('should handle invalid vendorId parameter', async () => {
        // Arrange
        mockPrisma.vendorService.findMany.mockResolvedValue([]);

        // Act
        const result = await service.findByVendor(-1);

        // Assert
        expect(result).toEqual([]);
      });
    });
  });

  describe('EDGE CASE TESTS', () => {
    it('should handle extremely large description', async () => {
      // Arrange - Use a description that's under the 2000 character limit
      const largeDescription = 'A'.repeat(2000);
      const createDto = {
        name: 'Test Service',
        serviceType: ServiceType.CATERING,
        pricingModel: VendorPricingModel.PER_EVENT,
        baseRate: 10000,
        description: largeDescription,
      };
      
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(null);
      mockPrisma.vendorService.create.mockResolvedValue({
        id: 1,
        vendorId: 1,
        ...createDto,
        isActive: false,
      });

      // Act
      const result = await service.create(1, createDto);

      // Assert
      expect(result.description).toBe(largeDescription);
    });

    it('should handle service with zero minGuests and maxGuests', async () => {
      // Arrange
      const createDto = {
        name: 'Test Service',
        serviceType: ServiceType.CATERING,
        pricingModel: VendorPricingModel.PER_EVENT,
        baseRate: 10000,
        minGuests: 0,
        maxGuests: 0,
      };
      
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(null);
      mockPrisma.vendorService.create.mockResolvedValue({
        id: 1,
        vendorId: 1,
        ...createDto,
        isActive: false,
      });

      // Act
      const result = await service.create(1, createDto);

      // Assert
      expect(result.minGuests).toBe(0);
      expect(result.maxGuests).toBe(0);
    });

    it('should handle service with very large baseRate', async () => {
      // Arrange
      const createDto = {
        name: 'Luxury Service',
        serviceType: ServiceType.CATERING,
        pricingModel: VendorPricingModel.PER_EVENT,
        baseRate: Number.MAX_SAFE_INTEGER,
      };
      
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(null);
      mockPrisma.vendorService.create.mockResolvedValue({
        id: 1,
        vendorId: 1,
        ...createDto,
        isActive: false,
      });

      // Act
      const result = await service.create(1, createDto);

      // Assert
      expect(result.baseRate).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle null optional fields', async () => {
      // Arrange
      const createDto = {
        name: 'Test Service',
        serviceType: ServiceType.CATERING,
        pricingModel: VendorPricingModel.PER_EVENT,
        baseRate: 10000,
        description: undefined,
        inclusions: undefined,
        exclusions: undefined,
        minGuests: undefined,
        maxGuests: undefined,
      };
      
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(null);
      mockPrisma.vendorService.create.mockResolvedValue({
        id: 1,
        vendorId: 1,
        ...createDto,
        isActive: false,
      });

      // Act
      const result = await service.create(1, createDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('should toggle service from active to inactive correctly', async () => {
      // Arrange - Start with active service
      const activeService = { ...mockService, isActive: true };
      mockPrisma.vendorService.findUnique.mockResolvedValue(activeService);
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor); // Owner
      mockPrisma.vendorService.update.mockResolvedValue({ ...mockService, isActive: false });

      // Act
      const result = await service.deactivate(1, 1, false);

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('should toggle service from inactive to active correctly', async () => {
      // Arrange - Start with inactive service
      const inactiveService = { ...mockService, isActive: false };
      mockPrisma.vendorService.findUnique.mockResolvedValue(inactiveService);
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor); // Owner
      mockPrisma.vendorService.update.mockResolvedValue({ ...mockService, isActive: true });

      // Act
      const result = await service.activate(1, 1, false);

      // Assert
      expect(result.isActive).toBe(true);
    });

    it('should handle multiple services for same vendor', async () => {
      // Arrange
      const services = [
        mockService,
        { ...mockService, id: 2, name: 'Corporate Catering' },
        { ...mockService, id: 3, name: 'Birthday Catering' },
      ];
      mockPrisma.vendorService.findMany.mockResolvedValue(services);

      // Act
      const result = await service.findByVendor(1);

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  describe('ERROR HANDLING TESTS', () => {
    it('should handle Prisma connection error', async () => {
      // Arrange
      const createDto = {
        name: 'Test Service',
        serviceType: ServiceType.CATERING,
        pricingModel: VendorPricingModel.PER_EVENT,
        baseRate: 10000,
      };
      
      mockPrisma.vendor.findUnique.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.create(1, createDto)).rejects.toThrow('Database connection failed');
    });

    it('should handle findByVendor Prisma error', async () => {
      // Arrange
      mockPrisma.vendorService.findMany.mockRejectedValue(new Error('Query failed'));

      // Act & Assert
      await expect(service.findByVendor(1)).rejects.toThrow('Query failed');
    });

    it('should handle activate Prisma error', async () => {
      // Arrange
      mockPrisma.vendorService.findUnique.mockResolvedValue(mockService);
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.update.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(service.activate(1, 1, false)).rejects.toThrow('Update failed');
    });

    it('should handle deactivate Prisma error', async () => {
      // Arrange
      mockPrisma.vendorService.findUnique.mockResolvedValue(mockService);
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.update.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(service.deactivate(1, 1, false)).rejects.toThrow('Update failed');
    });
  });

  describe('PERMISSION AND ROLE TESTS', () => {
    it('VENDOR role can create service', async () => {
      // Arrange
      const createDto = {
        name: 'Vendor Service',
        serviceType: ServiceType.CATERING,
        pricingModel: VendorPricingModel.PER_EVENT,
        baseRate: 10000,
      };
      
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(null);
      mockPrisma.vendorService.create.mockResolvedValue({
        id: 1,
        vendorId: 1,
        ...createDto,
        isActive: false,
      });

      // Act
      const result = await service.create(1, createDto);

      // Assert
      expect(result).toBeDefined();
    });

    it('VENDOR role can activate own service', async () => {
      // Arrange - Vendor 1 activates their own service
      mockPrisma.vendorService.findUnique.mockResolvedValue(mockService); // vendorId: 1
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor); // Vendor with userId=1
      mockPrisma.vendorService.update.mockResolvedValue({ ...mockService, isActive: true });

      // Act
      const result = await service.activate(1, 1, false);

      // Assert
      expect(result.isActive).toBe(true);
    });

    it('ADMIN role can activate any vendor service', async () => {
      // Arrange - Admin activates vendor 1's service
      mockPrisma.vendorService.findUnique.mockResolvedValue(mockService);
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor2); // Different vendor
      mockPrisma.vendorService.update.mockResolvedValue({ ...mockService, isActive: true });

      // Act
      const result = await service.activate(1, 2, true); // isAdmin=true

      // Assert
      expect(result.isActive).toBe(true);
    });
  });
});
