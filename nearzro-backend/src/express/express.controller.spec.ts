import { Test, TestingModule } from '@nestjs/testing';
import { ExpressController } from './express.controller';
import { ExpressService } from './express.service';

describe('ExpressController', () => {
  let controller: ExpressController;

  const mockExpressService = {
    submitEnquiry: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpressController],
      providers: [
        { provide: ExpressService, useValue: mockExpressService },
      ],
    }).compile();

    controller = module.get<ExpressController>(ExpressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
