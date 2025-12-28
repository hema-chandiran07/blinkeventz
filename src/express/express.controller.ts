import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ExpressService } from './express.service';
import { CreateExpressDto } from './dto/create-express.dto';

@Controller('express')
export class ExpressController {
  constructor(private readonly service: ExpressService) {}

  @Post()
  create(@Body() dto: CreateExpressDto) {
    return this.service.create(dto);
  }

  @Get('temp-event/:id')
  getByTempEvent(@Param('id') id: string) {
    return this.service.getByTempEvent(+id);
  }
}
