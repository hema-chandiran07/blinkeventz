import { Test, TestingModule } from '@nestjs/testing';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { VendorServicesService } from './vendor-services/vendor-services.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseStorageService } from '../storage/database-storage.service';

describe('VendorsController', () => {
  let controller: VendorsController;

  const mockVendorsService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    createVendor: jest.fn(),
    getVendorByUserId: jest.fn(),
    approveVendor: jest.fn(),
    rejectVendor: jest.fn(),
  };

  const mockVendorServicesService = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockPrismaService = {
    vendorService: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockDatabaseStorageService = {
    storeFile: jest.fn().mockResolvedValue('data-url'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorsController],
      providers: [
        { provide: VendorsService, useValue: mockVendorsService },
        { provide: VendorServicesService, useValue: mockVendorServicesService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DatabaseStorageService, useValue: mockDatabaseStorageService },
      ],
    }).compile();

    controller = module.get<VendorsController>(VendorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
