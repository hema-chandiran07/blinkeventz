import { Test, TestingModule } from '@nestjs/testing';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorsController],
      providers: [
        {
          provide: VendorsService,
          useValue: mockVendorsService,
        },
      ],
    }).compile();

    controller = module.get<VendorsController>(VendorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
