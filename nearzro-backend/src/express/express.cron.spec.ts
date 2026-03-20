import { Test, TestingModule } from '@nestjs/testing';
import { ExpressCron } from './express.cron';
import { PrismaService } from '../prisma/prisma.service';
import { ExpressStatus } from '@prisma/client';

describe('ExpressCron', () => {
  let cron: ExpressCron;
  let prisma: PrismaService;

  const mockPrisma = {
    expressRequest: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpressCron,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    cron = module.get<ExpressCron>(ExpressCron);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(cron).toBeDefined();
  });

  describe('expireExpressRequests', () => {
    it('should update expired express requests to EXPIRED status', async () => {
      // Arrange
      const mockNow = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockReturnValue(mockNow as unknown as Date);

      mockPrisma.expressRequest.updateMany.mockResolvedValue({ count: 2 });

      // Act
      await cron.expireExpressRequests();

      // Assert
      expect(mockPrisma.expressRequest.updateMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [ExpressStatus.PENDING, ExpressStatus.IN_PROGRESS],
          },
          expiresAt: {
            lt: mockNow,
          },
        },
        data: {
          status: ExpressStatus.EXPIRED,
        },
      });
    });

    it('should not call updateMany when no expired requests', async () => {
      // Arrange
      const mockNow = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockReturnValue(mockNow as unknown as Date);

      mockPrisma.expressRequest.updateMany.mockResolvedValue({ count: 0 });

      // Act
      await cron.expireExpressRequests();

      // Assert
      expect(mockPrisma.expressRequest.updateMany).toHaveBeenCalled();
    });

    it('should only target PENDING and IN_PROGRESS statuses', async () => {
      // Arrange
      const mockNow = new Date();
      jest.spyOn(global, 'Date').mockReturnValue(mockNow as unknown as Date);

      mockPrisma.expressRequest.updateMany.mockResolvedValue({ count: 0 });

      // Act
      await cron.expireExpressRequests();

      // Assert
      expect(mockPrisma.expressRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: [ExpressStatus.PENDING, ExpressStatus.IN_PROGRESS],
            },
          }),
        }),
      );
    });

    it('should set status to EXPIRED', async () => {
      // Arrange
      const mockNow = new Date();
      jest.spyOn(global, 'Date').mockReturnValue(mockNow as unknown as Date);

      mockPrisma.expressRequest.updateMany.mockResolvedValue({ count: 1 });

      // Act
      await cron.expireExpressRequests();

      // Assert
      expect(mockPrisma.expressRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: ExpressStatus.EXPIRED,
          },
        }),
      );
    });

    it('should not affect COMPLETED requests', async () => {
      // Arrange
      const mockNow = new Date();
      jest.spyOn(global, 'Date').mockReturnValue(mockNow as unknown as Date);

      mockPrisma.expressRequest.updateMany.mockResolvedValue({ count: 0 });

      // Act
      await cron.expireExpressRequests();

      // Assert
      const calledWith = mockPrisma.expressRequest.updateMany.mock.calls[0][0];
      expect(calledWith.where.status.in).not.toContain(ExpressStatus.COMPLETED);
      expect(calledWith.where.status.in).not.toContain(ExpressStatus.EXPIRED);
      expect(calledWith.where.status.in).not.toContain(ExpressStatus.CANCELLED);
    });

    it('should not affect CANCELLED requests', async () => {
      // Arrange
      const mockNow = new Date();
      jest.spyOn(global, 'Date').mockReturnValue(mockNow as unknown as Date);

      mockPrisma.expressRequest.updateMany.mockResolvedValue({ count: 0 });

      // Act
      await cron.expireExpressRequests();

      // Assert
      const calledWith = mockPrisma.expressRequest.updateMany.mock.calls[0][0];
      expect(calledWith.where.status.in).not.toContain(ExpressStatus.CANCELLED);
    });
  });
});
