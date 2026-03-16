import { Test, TestingModule } from '@nestjs/testing';
import { ExpressService } from './express.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExpressService', () => {
  let service: ExpressService;

  const mockPrisma = {
    expressEnquiry: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpressService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExpressService>(ExpressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
