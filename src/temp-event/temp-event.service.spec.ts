import { Test, TestingModule } from '@nestjs/testing';
import { TempEventService } from './temp-event.service';

describe('TempEventService', () => {
  let service: TempEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TempEventService],
    }).compile();

    service = module.get<TempEventService>(TempEventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
