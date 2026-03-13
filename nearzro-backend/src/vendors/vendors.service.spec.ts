import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { VendorVerificationStatus, Role, ServiceType, VendorPricingModel } from '@prisma/client';

describe('VendorsService', () => {
  let service: VendorsService;
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
    verificationStatus: VendorVerificationStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    username: 'royal_catering',
    rejectionReason: null,
    images: [],
    services: [],
    user: {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+919999999999',
    },
  };

  const mockVendorService = {
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

  // Mock PrismaService
  const mockPrisma = {
    vendor: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
    prisma = module.get<PrismaService>(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('POSITIVE TEST CASES', () => {
    describe('createVendor', () => {
      it('should successfully create a vendor', async () => {
        // Arrange
        const createDto = {
          businessName: 'Royal Catering Services',
          description: 'Premium wedding catering',
          city: 'Chennai',
          area: 'Velachery',
          serviceRadiusKm: 25,
        };
        
        const expectedVendor = {
          id: 1,
          userId: 1,
          ...createDto,
          verificationStatus: VendorVerificationStatus.PENDING,
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(null); // No existing vendor
        mockPrisma.vendor.create.mockResolvedValue(expectedVendor);

        // Act
        const result = await service.createVendor(1, createDto, true);

        // Assert
        expect(result).toEqual(expectedVendor);
        expect(mockPrisma.vendor.create).toHaveBeenCalledWith({
          data: {
            userId: 1,
            businessName: 'Royal Catering Services',
            description: 'Premium wedding catering',
            city: 'Chennai',
            area: 'Velachery',
            serviceRadiusKm: 25,
          },
        });
      });
    });

    describe('findAll', () => {
      it('should return a list of vendors', async () => {
        // Arrange
        const vendors = [mockVendor];
        mockPrisma.vendor.findMany.mockResolvedValue(vendors);

        // Act
        const result = await service.findAll();

        // Assert
        expect(result).toEqual(vendors);
      });

      it('should return empty array when no vendors exist', async () => {
        // Arrange
        mockPrisma.vendor.findMany.mockResolvedValue([]);

        // Act
        const result = await service.findAll();

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('findById', () => {
      it('should return a vendor by ID', async () => {
        // Arrange
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);

        // Act
        const result = await service.findById(1);

        // Assert
        expect(result).toEqual(mockVendor);
      });
    });

    describe('getVendorByUserId', () => {
      it('should return vendor for a user', async () => {
        // Arrange
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);

        // Act
        const result = await service.getVendorByUserId(1);

        // Assert
        expect(result).toEqual(mockVendor);
      });
    });

    describe('approveVendor', () => {
      it('should approve vendor and update verification status to VERIFIED', async () => {
        // Arrange
        const approvedVendor = {
          ...mockVendor,
          verificationStatus: VendorVerificationStatus.VERIFIED,
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
        mockPrisma.vendor.update.mockResolvedValue(approvedVendor);

        // Act
        const result = await service.approveVendor(1);

        // Assert
        expect(result.verificationStatus).toBe(VendorVerificationStatus.VERIFIED);
      });
    });

    describe('rejectVendor', () => {
      it('should reject vendor and update verification status to REJECTED', async () => {
        // Arrange
        const rejectedVendor = {
          ...mockVendor,
          verificationStatus: VendorVerificationStatus.REJECTED,
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
        mockPrisma.vendor.update.mockResolvedValue(rejectedVendor);

        // Act
        const result = await service.rejectVendor(1);

        // Assert
        expect(result.verificationStatus).toBe(VendorVerificationStatus.REJECTED);
      });
    });
  });

  describe('NEGATIVE TEST CASES', () => {
    describe('createVendor', () => {
      it('should fail when vendor already exists for user', async () => {
        // Arrange
        const createDto = {
          businessName: 'Royal Catering Services',
          description: 'Premium wedding catering',
          city: 'Chennai',
          area: 'Velachery',
          serviceRadiusKm: 25,
        };
        
        mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor); // Existing vendor

        // Act & Assert
        await expect(service.createVendor(1, createDto)).rejects.toThrow(BadRequestException);
        await expect(service.createVendor(1, createDto)).rejects.toMatchObject({
          message: 'User already has a vendor profile',
        });
      });

      it('should handle Prisma unique constraint error', async () => {
        // Arrange
        const createDto = {
          businessName: 'Royal Catering Services',
          city: 'Chennai',
          area: 'Velachery',
        };
        
        mockPrisma.vendor.findUnique.mockRejectedValue({
          code: 'P2002',
          message: 'Unique constraint failed',
        });

        // Act & Assert
        await expect(service.createVendor(1, createDto)).rejects.toThrow(BadRequestException);
      });

      it('should fail when businessName is empty', async () => {
        // Arrange
        const createDto = {
          businessName: '',  // Empty string
          city: 'Chennai',
          area: 'Velachery',
        };

        // Act & Assert
        await expect(service.createVendor(1, createDto)).rejects.toThrow(BadRequestException);
        await expect(service.createVendor(1, createDto)).rejects.toMatchObject({
          message: 'businessName is required',
        });
      });

      it('should fail when city is empty', async () => {
        // Arrange
        const createDto = {
          businessName: 'Test Vendor',
          city: '',  // Empty string
          area: 'Velachery',
        };

        // Act & Assert
        await expect(service.createVendor(1, createDto)).rejects.toThrow(BadRequestException);
      });

      it('should fail when area is empty', async () => {
        // Arrange
        const createDto = {
          businessName: 'Test Vendor',
          city: 'Chennai',
          area: '',  // Empty string
        };

        // Act & Assert
        await expect(service.createVendor(1, createDto)).rejects.toThrow(BadRequestException);
      });

      it('should fail when serviceRadiusKm is negative', async () => {
        // Arrange
        const createDto = {
          businessName: 'Test Vendor',
          city: 'Chennai',
          area: 'Velachery',
          serviceRadiusKm: -10,  // Negative value
        };

        // Act & Assert
        await expect(service.createVendor(1, createDto)).rejects.toThrow(BadRequestException);
        await expect(service.createVendor(1, createDto)).rejects.toMatchObject({
          message: 'serviceRadiusKm must be greater than or equal to 0',
        });
      });
    });

    describe('findById', () => {
      it('should throw NotFoundException when vendor not found', async () => {
        // Arrange
        mockPrisma.vendor.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.findById(999)).rejects.toThrow(NotFoundException);
        await expect(service.findById(999)).rejects.toMatchObject({
          message: 'Vendor with ID 999 not found',
        });
      });

      it('should fail when invalid vendor id passed', async () => {
        // Arrange - passing non-existent ID
        mockPrisma.vendor.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.findById(0)).rejects.toThrow(NotFoundException);
      });
    });

    describe('getVendorByUserId', () => {
      it('should throw NotFoundException when vendor not found for user', async () => {
        // Arrange
        mockPrisma.vendor.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.getVendorByUserId(999)).rejects.toThrow(NotFoundException);
        await expect(service.getVendorByUserId(999)).rejects.toMatchObject({
          message: 'Vendor not found for userId 999',
        });
      });
    });

    describe('approveVendor', () => {
      it('should throw NotFoundException when vendor not found', async () => {
        // Arrange
        mockPrisma.vendor.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.approveVendor(999)).rejects.toThrow(NotFoundException);
      });
    });

    describe('rejectVendor', () => {
      it('should throw NotFoundException when vendor not found', async () => {
        // Arrange
        mockPrisma.vendor.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.rejectVendor(999)).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('EDGE CASE TESTS', () => {
    it('should handle vendor with no services', async () => {
      // Arrange
      const vendorWithNoServices = {
        ...mockVendor,
        services: [],
      };
      mockPrisma.vendor.findUnique.mockResolvedValue(vendorWithNoServices);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result.services).toEqual([]);
    });

    it('should handle vendor with multiple services', async () => {
      // Arrange
      const vendorWithServices = {
        ...mockVendor,
        services: [mockVendorService, { ...mockVendorService, id: 2 }],
      };
      mockPrisma.vendor.findUnique.mockResolvedValue(vendorWithServices);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result.services).toHaveLength(2);
    });

    it('should handle vendor with null description', async () => {
      // Arrange
      const createDto = {
        businessName: 'Test Vendor',
        description: undefined,  // Null description
        city: 'Chennai',
        area: 'Velachery',
      };
      
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.vendor.create.mockResolvedValue({
        id: 1,
        userId: 1,
        ...createDto,
        verificationStatus: VendorVerificationStatus.PENDING,
      });

      // Act
      const result = await service.createVendor(1, createDto, true); // skipValidation for tests

      // Assert
      expect(result.description).toBeUndefined();
    });

    it('should handle vendor with null serviceRadiusKm', async () => {
      // Arrange
      const createDto = {
        businessName: 'Test Vendor',
        city: 'Chennai',
        area: 'Velachery',
        serviceRadiusKm: undefined,  // Null
      };
      
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.vendor.create.mockResolvedValue({
        id: 1,
        userId: 1,
        businessName: 'Test Vendor',
        city: 'Chennai',
        area: 'Velachery',
        serviceRadiusKm: undefined,
        verificationStatus: VendorVerificationStatus.PENDING,
      });

      // Act
      const result = await service.createVendor(1, createDto, true);

      // Assert
      expect(result.serviceRadiusKm).toBeUndefined();
    });

    it('should trim whitespace from businessName, city, area', async () => {
      // Arrange
      const createDto = {
        businessName: '  Test Vendor  ',
        description: '  Description  ',
        city: '  Chennai  ',
        area: '  Velachery  ',
      };
      
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.vendor.create.mockResolvedValue({
        id: 1,
        userId: 1,
        businessName: 'Test Vendor',
        description: 'Description',
        city: 'Chennai',
        area: 'Velachery',
        verificationStatus: VendorVerificationStatus.PENDING,
      });

      // Act
      const result = await service.createVendor(1, createDto, true);

      // Assert
      expect(mockPrisma.vendor.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          businessName: 'Test Vendor',
          description: 'Description',
          city: 'Chennai',
          area: 'Velachery',
        },
      });
    });
  });

  describe('ERROR HANDLING TESTS', () => {
    it('should handle Prisma connection error in findAll', async () => {
      // Arrange
      mockPrisma.vendor.findMany.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow('Database connection failed');
    });

    it('should handle Prisma connection error in findById', async () => {
      // Arrange
      mockPrisma.vendor.findUnique.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.findById(1)).rejects.toThrow('Database error');
    });

    it('should handle Prisma connection error in createVendor', async () => {
      // Arrange
      const createDto = {
        businessName: 'Test Vendor',
        city: 'Chennai',
        area: 'Velachery',
      };
      
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.vendor.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.createVendor(1, createDto, true)).rejects.toThrow('Database error');
    });

    it('should handle Prisma connection error in approveVendor', async () => {
      // Arrange
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendor.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.approveVendor(1)).rejects.toThrow('Database error');
    });

    it('should handle Prisma connection error in rejectVendor', async () => {
      // Arrange
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendor.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.rejectVendor(1)).rejects.toThrow('Database error');
    });
  });
});
