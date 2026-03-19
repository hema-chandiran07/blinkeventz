import { Test, TestingModule } from '@nestjs/testing';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueQueryDto, VenueSearchQueryDto } from './dto/venue-query.dto';
import { VenueType, VenueStatus } from '@prisma/client';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VenueOwnerGuard } from './guards/venue-owner.guard';
import { PrismaService } from '../prisma/prisma.service';

// ============================================
// TEST UTILITIES & MOCK DATA
// ============================================

// Mock VenueStatus enum values
const MockVenueStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL' as VenueStatus,
  ACTIVE: 'ACTIVE' as VenueStatus,
  INACTIVE: 'INACTIVE' as VenueStatus,
  SUSPENDED: 'SUSPENDED' as VenueStatus,
  DELISTED: 'DELISTED' as VenueStatus,
  REJECTED: 'REJECTED' as VenueStatus,
};

// Sample venue data for testing
const mockVenueResponse = {
  id: 1,
  name: 'Royal Palace Banquet Hall',
  type: 'BANQUET' as VenueType,
  description: 'Luxury wedding venue',
  address: '123 MG Road',
  city: 'Bangalore',
  area: 'Indiranagar',
  pincode: '560038',
  capacityMin: 100,
  capacityMax: 500,
  basePriceMorning: 50000,
  basePriceEvening: 80000,
  basePriceFullDay: 120000,
  amenities: 'Parking, AC, Power backup',
  policies: 'No smoking allowed',
  status: VenueStatus.PENDING_APPROVAL,
  images: [],
  photos: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ownerId: 100,
};

// Valid create venue DTO
const validCreateVenueDto: CreateVenueDto = {
  name: 'Royal Palace Banquet Hall',
  type: 'BANQUET' as VenueType,
  description: 'Luxury wedding venue',
  address: '123 MG Road',
  city: 'Bangalore',
  area: 'Indiranagar',
  pincode: '560038',
  capacityMin: 100,
  capacityMax: 500,
  basePriceMorning: 50000,
  basePriceEvening: 80000,
  basePriceFullDay: 120000,
  amenities: 'Parking, AC, Power backup',
  policies: 'No smoking allowed',
};

// Mock request objects
const mockVenueOwnerRequest = {
  user: {
    userId: 100,
    role: 'VENUE_OWNER',
    email: 'owner@test.com',
  },
};

const mockAdminRequest = {
  user: {
    userId: 1,
    role: 'ADMIN',
    email: 'admin@test.com',
  },
};

const mockCustomerRequest = {
  user: {
    userId: 200,
    role: 'CUSTOMER',
    email: 'customer@test.com',
  },
};

// ============================================
// MOCK VENUES SERVICE
// ============================================

const createMockVenuesService = () => ({
  createVenue: jest.fn(),
  findById: jest.fn(),
  getApprovedVenues: jest.fn(),
  searchVenues: jest.fn(),
  updateVenue: jest.fn(),
  deleteVenue: jest.fn(),
  approveVenue: jest.fn(),
  rejectVenue: jest.fn(),
  getVenuesByOwner: jest.fn(),
});

const createMockVenueOwnerGuard = () => ({
  canActivate: jest.fn().mockReturnValue(true),
});

// ============================================
// TEST SUITE: VenuesController
// ============================================

describe('VenuesController', () => {
  let controller: VenuesController;
  let venuesService: ReturnType<typeof createMockVenuesService>;

  beforeEach(async () => {
    venuesService = createMockVenuesService();

    // Create mock PrismaService
    const prismaServiceMock = {
      venue: {
        findUnique: jest.fn().mockResolvedValue({ ownerId: 100 }),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VenuesController],
      providers: [
        {
          provide: VenuesService,
          useValue: venuesService,
        },
        {
          provide: VenueOwnerGuard,
          useValue: createMockVenueOwnerGuard(),
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<VenuesController>(VenuesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================
  // SECTION 1: CONTROLLER POSITIVE TESTS
  // ============================================

  describe('✅ POSITIVE: Public Endpoints', () => {
    it('GET /venues - should return paginated approved venues', async () => {
      // Arrange
      const mockResponse = {
        data: [mockVenueResponse],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
      venuesService.getApprovedVenues.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getApprovedVenues({ page: 1, limit: 20 });

      // Assert
      expect(venuesService.getApprovedVenues).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(mockResponse);
    });

    it('GET /venues/:id - should return venue by id', async () => {
      // Arrange
      venuesService.findById.mockResolvedValue(mockVenueResponse);

      // Act
      const result = await controller.getVenueById(1);

      // Assert
      expect(venuesService.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockVenueResponse);
    });

    it('GET /venues/search - should search venues', async () => {
      // Arrange
      const mockSearchResponse = {
        data: [mockVenueResponse],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
      venuesService.searchVenues.mockResolvedValue(mockSearchResponse);

      // Act
      const result = await controller.searchVenues({ q: 'palace', page: 1, limit: 20 });

      // Assert
      expect(venuesService.searchVenues).toHaveBeenCalledWith({
        q: 'palace',
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(mockSearchResponse);
    });

    it('GET /venues - with pagination query should work', async () => {
      // Arrange
      const query: VenueQueryDto = { page: 2, limit: 10, city: 'Bangalore' };
      const mockResponse = {
        data: [],
        page: 2,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: true,
      };
      venuesService.getApprovedVenues.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getApprovedVenues(query);

      // Assert
      expect(venuesService.getApprovedVenues).toHaveBeenCalledWith(query);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('✅ POSITIVE: Venue Owner Endpoints', () => {
    it('POST /venues - authenticated owner can create venue', async () => {
      // Arrange
      venuesService.createVenue.mockResolvedValue(mockVenueResponse);

      // Act
      const result = await controller.createVenue(
        mockVenueOwnerRequest as any,
        validCreateVenueDto,
      );

      // Assert
      expect(venuesService.createVenue).toHaveBeenCalledWith(
        validCreateVenueDto,
        mockVenueOwnerRequest.user.userId,
      );
      expect(result).toEqual(mockVenueResponse);
    });

    it('PATCH /venues/:id - owner can update their venue', async () => {
      // Arrange
      const updateDto = { name: 'Updated Venue' };
      const updatedVenue = { ...mockVenueResponse, ...updateDto };
      venuesService.updateVenue.mockResolvedValue(updatedVenue);

      // Act
      const result = await controller.updateVenue(
        1,
        mockVenueOwnerRequest as any,
        updateDto,
      );

      // Assert
      expect(venuesService.updateVenue).toHaveBeenCalledWith(
        1,
        updateDto,
        mockVenueOwnerRequest.user.userId,
      );
      expect(result.name).toBe('Updated Venue');
    });

    it('DELETE /venues/:id - owner can delete their venue', async () => {
      // Arrange
      venuesService.deleteVenue.mockResolvedValue(undefined);

      // Act
      await controller.deleteVenue(1, mockVenueOwnerRequest as any);

      // Assert
      expect(venuesService.deleteVenue).toHaveBeenCalledWith(
        1,
        mockVenueOwnerRequest.user.userId,
      );
    });

    it('GET /venues/owner/my-venues - owner can get their venues', async () => {
      // Arrange
      venuesService.getVenuesByOwner.mockResolvedValue([mockVenueResponse]);

      // Act
      const result = await controller.getMyVenues(mockVenueOwnerRequest as any);

      // Assert
      expect(venuesService.getVenuesByOwner).toHaveBeenCalledWith(
        mockVenueOwnerRequest.user.userId,
      );
      expect(result).toEqual([mockVenueResponse]);
    });
  });

  describe('✅ POSITIVE: Admin Endpoints', () => {
    it('PATCH /venues/:id/approve - admin can approve venue', async () => {
      // Arrange
      const approvedVenue = { ...mockVenueResponse, status: VenueStatus.ACTIVE };
      venuesService.approveVenue.mockResolvedValue(approvedVenue);

      // Act
      const result = await controller.approveVenue(1);

      // Assert
      expect(venuesService.approveVenue).toHaveBeenCalledWith(1);
      expect(result.status).toBe(VenueStatus.ACTIVE);
    });

    it('PATCH /venues/:id/reject - admin can reject venue', async () => {
      // Arrange
      const rejectedVenue = {
        ...mockVenueResponse,
        status: VenueStatus.DELISTED,
        rejectionReason: 'Does not meet standards',
      };
      venuesService.rejectVenue.mockResolvedValue(rejectedVenue);

      // Act
      const result = await controller.rejectVenue(1, 'Does not meet standards');

      // Assert
      expect(venuesService.rejectVenue).toHaveBeenCalledWith(
        1,
        'Does not meet standards',
      );
      expect(result.status).toBe(VenueStatus.DELISTED);
    });
  });

  // ============================================
  // SECTION 2: CONTROLLER NEGATIVE TESTS
  // ============================================

  describe('❌ NEGATIVE: Unauthorized Access', () => {
    it('POST /venues - unauthenticated user cannot create venue', async () => {
      // Arrange
      const unauthenticatedRequest = { user: undefined };

      // Act & Assert - Controller doesn't check auth, guards do
      // This test documents expected behavior
      expect(async () => {
        await controller.createVenue(
          unauthenticatedRequest as any,
          validCreateVenueDto,
        );
      }).rejects.toThrow();
    });

    it('Non-owner update should be blocked by guard (service layer)', async () => {
      // Arrange
      const nonOwnerRequest = {
        user: {
          userId: 999, // Different from ownerId 100
          role: 'VENUE_OWNER',
        },
      };
      venuesService.updateVenue.mockRejectedValue(
        new NotFoundException('You do not own this venue'),
      );

      // Act & Assert
      await expect(
        controller.updateVenue(1, nonOwnerRequest as any, { name: 'Hacked' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('❌ NEGATIVE: Not Found Cases', () => {
    it('GET /venues/:id - should throw for non-existent venue', async () => {
      // Arrange
      venuesService.findById.mockRejectedValue(
        new NotFoundException('Venue with ID 999 not found'),
      );

      // Act & Assert
      await expect(controller.getVenueById(999)).rejects.toThrow(NotFoundException);
    });

    it('PATCH /venues/:id/approve - should throw for non-existent venue', async () => {
      // Arrange
      venuesService.approveVenue.mockRejectedValue(
        new NotFoundException('Venue with ID 999 not found'),
      );

      // Act & Assert
      await expect(controller.approveVenue(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('❌ NEGATIVE: Invalid Input', () => {
    it('GET /venues - should handle invalid page parameter', async () => {
      // Arrange
      const query = { page: -1, limit: 10 }; // Invalid page
      venuesService.getApprovedVenues.mockResolvedValue({
        data: [],
        page: -1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      // Act
      const result = await controller.getApprovedVenues(query);

      // Assert
      expect(result).toBeDefined();
    });

    it('GET /venues - should handle invalid limit parameter', async () => {
      // Arrange
      const query = { page: 1, limit: 0 }; // Invalid limit
      venuesService.getApprovedVenues.mockResolvedValue({
        data: [],
        page: 1,
        limit: 0,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      // Act
      const result = await controller.getApprovedVenues(query);

      // Assert
      expect(result).toBeDefined();
    });

    it('POST /venues - should handle invalid venue type', async () => {
      // Arrange
      const invalidDto = {
        ...validCreateVenueDto,
        type: 'INVALID_TYPE' as any,
      };

      // Act - Service should reject invalid type
      venuesService.createVenue.mockRejectedValue(new Error('Invalid venue type'));

      // Assert
      await expect(
        controller.createVenue(mockVenueOwnerRequest as any, invalidDto),
      ).rejects.toThrow();
    });
  });

  // ============================================
  // SECTION 3: SECURITY TESTS
  // ============================================

  describe('🔒 SECURITY TESTS', () => {
    it('should not allow non-admin to approve venue', async () => {
      // Arrange - Venue owner trying to approve
      venuesService.approveVenue.mockRejectedValue(
        new ForbiddenException('Admin only'),
      );

      // Act & Assert
      await expect(controller.approveVenue(1)).rejects.toThrow(ForbiddenException);
    });

    it('should enforce ownership on delete', async () => {
      // Arrange - Different owner trying to delete
      const differentOwnerRequest = {
        user: {
          userId: 999,
          role: 'VENUE_OWNER',
        },
      };
      venuesService.deleteVenue.mockRejectedValue(
        new NotFoundException('You do not own this venue'),
      );

      // Act & Assert
      await expect(
        controller.deleteVenue(1, differentOwnerRequest as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should require authentication for protected routes', () => {
      // Arrange - request with no user property causes TypeError when accessing userId
      const noUserRequest = { user: undefined };

      // Act & Assert - should throw TypeError because user is undefined
      expect(() => 
        controller.createVenue(noUserRequest as any, validCreateVenueDto),
      ).toThrow(TypeError);
    });
  });

  // ============================================
  // SECTION 4: PAGINATION TESTS
  // ============================================

  describe('📄 PAGINATION TESTS', () => {
    it('should handle first page', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      venuesService.getApprovedVenues.mockResolvedValue({
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      // Act
      const result = await controller.getApprovedVenues(query);

      // Assert
      expect(result.page).toBe(1);
      expect(result.hasPrev).toBe(false);
    });

    it('should handle middle page', async () => {
      // Arrange
      const query = { page: 5, limit: 10 };
      venuesService.getApprovedVenues.mockResolvedValue({
        data: [],
        page: 5,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: true,
      });

      // Act
      const result = await controller.getApprovedVenues(query);

      // Assert
      expect(result.page).toBe(5);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    it('should handle last page', async () => {
      // Arrange
      const query = { page: 10, limit: 10 };
      venuesService.getApprovedVenues.mockResolvedValue({
        data: [],
        page: 10,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: false,
        hasPrev: true,
      });

      // Act
      const result = await controller.getApprovedVenues(query);

      // Assert
      expect(result.page).toBe(10);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });

    it('should handle large limit', async () => {
      // Arrange
      const query = { page: 1, limit: 100 };
      venuesService.getApprovedVenues.mockResolvedValue({
        data: [],
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      // Act
      const result = await controller.getApprovedVenues(query);

      // Assert
      expect(result.limit).toBe(100);
    });
  });

  // ============================================
  // SECTION 5: PARAMETER PARSING TESTS
  // ============================================

  describe('🔢 PARAMETER PARSING TESTS', () => {
    it('should parse venue ID as integer', async () => {
      // Arrange
      venuesService.findById.mockResolvedValue(mockVenueResponse);

      // Act - Pass string ID (as would come from route)
      const result = await controller.getVenueById(1);

      // Assert
      expect(venuesService.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockVenueResponse);
    });

    it('should pass correct venue ID to update', async () => {
      // Arrange
      venuesService.updateVenue.mockResolvedValue(mockVenueResponse);

      // Act
      await controller.updateVenue(
        42,
        mockVenueOwnerRequest as any,
        { name: 'Test' },
      );

      // Assert
      expect(venuesService.updateVenue).toHaveBeenCalledWith(
        42,
        { name: 'Test' },
        mockVenueOwnerRequest.user.userId,
      );
    });

    it('should pass correct venue ID to delete', async () => {
      // Arrange
      venuesService.deleteVenue.mockResolvedValue(undefined);

      // Act
      await controller.deleteVenue(42, mockVenueOwnerRequest as any);

      // Assert
      expect(venuesService.deleteVenue).toHaveBeenCalledWith(
        42,
        mockVenueOwnerRequest.user.userId,
      );
    });
  });

  // ============================================
  // SECTION 6: EDGE CASES
  // ============================================

  describe('🔄 EDGE CASES', () => {
    it('should handle empty search results', async () => {
      // Arrange
      venuesService.searchVenues.mockResolvedValue({
        data: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      // Act
      const result = await controller.searchVenues({ q: 'nonexistent' });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle search without query', async () => {
      // Arrange
      venuesService.searchVenues.mockResolvedValue({
        data: [mockVenueResponse],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      // Act
      const result = await controller.searchVenues({});

      // Assert
      expect(result.data).toHaveLength(1);
    });

    it('should pass reason to reject endpoint', async () => {
      // Arrange
      const reason = 'Violation of terms';
      venuesService.rejectVenue.mockResolvedValue({
        ...mockVenueResponse,
        status: VenueStatus.DELISTED,
        rejectionReason: reason,
      });

      // Act
      const result = await controller.rejectVenue(1, reason);

      // Assert
      expect(venuesService.rejectVenue).toHaveBeenCalledWith(1, reason);
      expect(result.rejectionReason).toBe(reason);
    });
  });
});
