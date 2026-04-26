import { Test, TestingModule } from '@nestjs/testing';
import { ExpressController } from './express.controller';
import { ExpressService } from './express.service';
import { ExpressPlanType, ExpressStatus } from '@prisma/client';
import { AuthRequest } from '../auth/auth-request.interface';

describe('ExpressController', () => {
  let controller: ExpressController;
  let service: ExpressService;

  // Fixed: Correct service method mocks
  const mockExpressService = {
    createForUser: jest.fn(),
    getByEventForUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpressController],
      providers: [
        { provide: ExpressService, useValue: mockExpressService },
      ],
    }).compile();

    controller = module.get<ExpressController>(ExpressController);
    service = module.get<ExpressService>(ExpressService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.createForUser with correct parameters', async () => {
      // Arrange
      const req = { user: { userId: 1 } } as AuthRequest;
      const dto = { EventId: 10, planType: ExpressPlanType.FIXED };
      const mockResponse = {
        id: 1,
        EventId: 10,
        userId: 1,
        planType: ExpressPlanType.FIXED,
        status: ExpressStatus.PENDING,
      };

      mockExpressService.createForUser.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.create(req, dto);

      // Assert
      expect(mockExpressService.createForUser).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate exceptions from service', async () => {
      // Arrange
      const req = { user: { userId: 1 } } as AuthRequest;
      const dto = { EventId: 10, planType: ExpressPlanType.FIXED };

      mockExpressService.createForUser.mockRejectedValue(
        new Error('Service error'),
      );

      // Act & Assert
      await expect(controller.create(req, dto)).rejects.toThrow('Service error');
    });
  });

  describe('getByEvent', () => {
    it('should call service.getByEventForUser with correct parameters', async () => {
      // Arrange
      const req = { user: { userId: 1 } } as AuthRequest;
      const mockResponse = {
        id: 1,
        EventId: 10,
        userId: 1,
        planType: ExpressPlanType.FIXED,
        status: ExpressStatus.PENDING,
      };

      mockExpressService.getByEventForUser.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getByEvent(req, '10');

      // Assert
      expect(mockExpressService.getByEventForUser).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(mockResponse);
    });

    it('should return null when express not found', async () => {
      // Arrange
      const req = { user: { userId: 1 } } as AuthRequest;

      mockExpressService.getByEventForUser.mockResolvedValue(null);

      // Act
      const result = await controller.getByEvent(req, '999');

      // Assert
      expect(mockExpressService.getByEventForUser).toHaveBeenCalledWith(1, 999);
      expect(result).toBeNull();
    });

    it('should propagate exceptions from service', async () => {
      // Arrange
      const req = { user: { userId: 1 } } as AuthRequest;

      mockExpressService.getByEventForUser.mockRejectedValue(
        new Error('Service error'),
      );

      // Act & Assert
      await expect(controller.getByEvent(req, '10')).rejects.toThrow(
        'Service error',
      );
    });
  });
});
