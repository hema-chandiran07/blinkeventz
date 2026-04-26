import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpressService } from './express.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExpressPlanType, ExpressStatus } from '@prisma/client';
import { CreateExpressDto } from './dto/create-express.dto';

// Mock the entire express module to control exports
jest.mock('../express/express.rules', () => ({
  getMinHoursForExpressByArea: jest.fn((area: string) => {
    const tierMap: Record<string, string> = {
      'Anna Nagar': 'TIER_1',
      'Nungambakkam': 'TIER_1',
      'Porur': 'TIER_2',
      'Avadi': 'TIER_3',
      'Sripeerumbudur': 'TIER_4',
    };
    const hoursMap: Record<string, number> = {
      TIER_1: 1,
      TIER_2: 1,
      TIER_3: 2,
      TIER_4: 2,
    };
    const tier = tierMap[area];
    if (!tier) {
      throw new BadRequestException('Express is not available in this area');
    }
    return hoursMap[tier];
  }),
}));

describe('ExpressService', () => {
  let service: ExpressService;
  let prisma: PrismaService;

  // Fixed: Correct Prisma mock with event and expressRequest models
  const mockPrisma = {
    event: {
      findUnique: jest.fn(),
    },
    expressRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpressService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExpressService>(ExpressService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createForUser', () => {
    const userId = 1;
    const dto = { EventId: 10, planType: ExpressPlanType.FIXED } as CreateExpressDto;

    describe('validation errors', () => {
      it('should throw BadRequestException if event not found', async () => {
        // Arrange
        mockPrisma.event.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.createForUser(userId, dto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.createForUser(userId, dto)).rejects.toThrow(
          'event not found',
        );
      });

      it('should throw ForbiddenException if user is not the owner', async () => {
        // Arrange
        mockPrisma.event.findUnique.mockResolvedValue({
          id: 10,
          userId: 999, // Different user
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          area: 'Anna Nagar',
          expressRequest: null,
        });

        // Act & Assert
        await expect(service.createForUser(userId, dto)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(service.createForUser(userId, dto)).rejects.toThrow(
          'Access denied',
        );
      });

      it('should throw BadRequestException if express already exists', async () => {
        // Arrange
        mockPrisma.event.findUnique.mockResolvedValue({
          id: 10,
          userId: 1,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          area: 'Anna Nagar',
          expressRequest: { id: 1 }, // Already exists
        });

        // Act & Assert
        await expect(service.createForUser(userId, dto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.createForUser(userId, dto)).rejects.toThrow(
          'Express already created',
        );
      });

      it('should throw BadRequestException if event date is missing', async () => {
        // Arrange
        mockPrisma.event.findUnique.mockResolvedValue({
          id: 10,
          userId: 1,
          date: null, // Missing date
          area: 'Anna Nagar',
          expressRequest: null,
        });

        // Act & Assert
        await expect(service.createForUser(userId, dto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.createForUser(userId, dto)).rejects.toThrow(
          'Event date missing',
        );
      });

      it('should throw BadRequestException if event area is missing', async () => {
        // Arrange
        mockPrisma.event.findUnique.mockResolvedValue({
          id: 10,
          userId: 1,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          area: null, // Missing area
          expressRequest: null,
        });

        // Act & Assert
        await expect(service.createForUser(userId, dto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.createForUser(userId, dto)).rejects.toThrow(
          'Event area is required',
        );
      });

      // Note: Time validation and area tier validation are tested in express.rules.spec.ts
      // These tests verify the service correctly calls the rules function
    });

    describe('successful creation', () => {
      it('should create express request for TIER_1 area with 1+ hour before event', async () => {
        // Arrange
        const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now
        
        mockPrisma.event.findUnique.mockResolvedValue({
          id: 10,
          userId: 1,
          date: futureDate,
          area: 'Anna Nagar', // TIER_1
          expressRequest: null,
        });

        const expectedExpressRequest = {
          id: 1,
          EventId: 10,
          userId: 1,
          planType: ExpressPlanType.FIXED,
          status: ExpressStatus.PENDING,
          expressFee: 0,
        };
        mockPrisma.expressRequest.create.mockResolvedValue(expectedExpressRequest);

        // Act
        const result = await service.createForUser(userId, dto);

        // Assert
        expect(result).toEqual(expectedExpressRequest);
        expect(mockPrisma.expressRequest.create).toHaveBeenCalledWith({
          data: {
            EventId: 10,
            userId: 1,
            planType: ExpressPlanType.FIXED,
            status: ExpressStatus.PENDING,
            startedAt: expect.any(Date),
            expiresAt: expect.any(Date),
            expressFee: 0,
          },
        });
      });

      it('should create express request for TIER_2 area with 1+ hour before event', async () => {
        // Arrange
        const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
        
        mockPrisma.event.findUnique.mockResolvedValue({
          id: 10,
          userId: 1,
          date: futureDate,
          area: 'Porur', // TIER_2
          expressRequest: null,
        });

        mockPrisma.expressRequest.create.mockResolvedValue({
          id: 1,
          EventId: 10,
        });

        // Act
        const result = await service.createForUser(userId, dto);

        // Assert
        expect(result).toBeDefined();
        expect(mockPrisma.expressRequest.create).toHaveBeenCalled();
      });

      it('should create express request for TIER_3 area with 2+ hours before event', async () => {
        // Arrange
        const futureDate = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now
        
        mockPrisma.event.findUnique.mockResolvedValue({
          id: 10,
          userId: 1,
          date: futureDate,
          area: 'Avadi', // TIER_3
          expressRequest: null,
        });

        mockPrisma.expressRequest.create.mockResolvedValue({
          id: 1,
          EventId: 10,
        });

        // Act
        const result = await service.createForUser(userId, dto);

        // Assert
        expect(result).toBeDefined();
        expect(mockPrisma.expressRequest.create).toHaveBeenCalled();
      });

      it('should create express request for TIER_4 area with 2+ hours before event', async () => {
        // Arrange
        const futureDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
        
        mockPrisma.event.findUnique.mockResolvedValue({
          id: 10,
          userId: 1,
          date: futureDate,
          area: 'Sripeerumbudur', // TIER_4
          expressRequest: null,
        });

        mockPrisma.expressRequest.create.mockResolvedValue({
          id: 1,
          EventId: 10,
        });

        // Act
        const result = await service.createForUser(userId, dto);

        // Assert
        expect(result).toBeDefined();
        expect(mockPrisma.expressRequest.create).toHaveBeenCalled();
      });
    });

    describe('fee calculation', () => {
      it('should set expressFee to 0 when EXPRESS_PAID_ENABLED is false', async () => {
        // This is the default in our mock
        const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
        
        mockPrisma.event.findUnique.mockResolvedValue({
          id: 10,
          userId: 1,
          date: futureDate,
          area: 'Anna Nagar',
          expressRequest: null,
        });

        mockPrisma.expressRequest.create.mockResolvedValue({
          id: 1,
          EventId: 10,
          expressFee: 0,
        });

        await service.createForUser(userId, dto);

        expect(mockPrisma.expressRequest.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              expressFee: 0,
            }),
          }),
        );
      });
    });
  });

  describe('getByEventForUser', () => {
    const userId = 1;

    it('should return null if express request not found', async () => {
      // Arrange
      mockPrisma.expressRequest.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getByEventForUser(userId, 10);

      // Assert
      expect(result).toBeNull();
      expect(mockPrisma.expressRequest.findUnique).toHaveBeenCalledWith({
        where: { EventId: 10 },
      });
    });

    it('should throw ForbiddenException if user does not own the express request', async () => {
      // Arrange
      mockPrisma.expressRequest.findUnique.mockResolvedValue({
        id: 1,
        EventId: 10,
        userId: 999, // Different user
      });

      // Act & Assert
      await expect(service.getByEventForUser(userId, 10)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getByEventForUser(userId, 10)).rejects.toThrow(
        'Access denied',
      );
    });

    it('should return express request if user owns it', async () => {
      // Arrange
      const mockExpressRequest = {
        id: 1,
        EventId: 10,
        userId: 1,
        planType: ExpressPlanType.FIXED,
        status: ExpressStatus.PENDING,
      };
      mockPrisma.expressRequest.findUnique.mockResolvedValue(mockExpressRequest);

      // Act
      const result = await service.getByEventForUser(userId, 10);

      // Assert
      expect(result).toEqual(mockExpressRequest);
    });
  });
});
