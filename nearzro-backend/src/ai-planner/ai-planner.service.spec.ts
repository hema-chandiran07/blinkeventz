import { Test, TestingModule } from '@nestjs/testing';
import { AIPlannerService } from './ai-planner.service';

describe('AiPlannerService', () => {
  let service: AIPlannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AIPlannerService],
    }).compile();

    service = module.get<AIPlannerService>(AIPlannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
