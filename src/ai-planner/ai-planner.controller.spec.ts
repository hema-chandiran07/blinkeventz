import { Test, TestingModule } from '@nestjs/testing';
import { AiPlannerController } from './ai-planner.controller';

describe('AiPlannerController', () => {
  let controller: AiPlannerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiPlannerController],
    }).compile();

    controller = module.get<AiPlannerController>(AiPlannerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
