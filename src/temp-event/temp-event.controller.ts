import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { TempEventService } from './temp-event.service';
import { CreateTempEventDto } from './dto/create-temp-event.dto';

@Controller('temp-event')
export class TempEventController {
  constructor(private readonly service: TempEventService) {}

  @Post()
  create(@Body() dto: CreateTempEventDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.findById(+id);
  }
}
