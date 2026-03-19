import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  // Mock Prisma service
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get current user by ID', async () => {
    const mockUser = { id: 1, email: 'test@test.com', role: 'CUSTOMER' };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.getMe(1);
    expect(result).toEqual(mockUser);
  });

  it('should return null for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await service.getMe(999);
    expect(result).toBeNull();
  });
});
