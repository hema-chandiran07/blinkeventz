import { Test, TestingModule } from '@nestjs/testing';
import { AIPlannerController } from './ai-planner.controller';

describe('AiPlannerController', () => {
  let controller: AIPlannerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIPlannerController],
    }).compile();

    controller = module.get<AIPlannerController>(AIPlannerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
