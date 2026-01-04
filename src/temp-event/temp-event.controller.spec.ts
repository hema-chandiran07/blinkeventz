import { Test, TestingModule } from '@nestjs/testing';
import { TempEventController } from './temp-event.controller';

describe('TempEventController', () => {
  let controller: TempEventController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TempEventController],
    }).compile();

    controller = module.get<TempEventController>(TempEventController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
