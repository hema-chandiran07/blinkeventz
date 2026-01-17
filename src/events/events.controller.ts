import {
  Controller, Post, Body, Req, Get, Param, Patch,UseGuards} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { AddEventServiceDto } from './dto/add-event-service.dto';
import { AssignManagerDto } from './dto/assign-manager.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Roles(Role.CUSTOMER)
  @Post()
  @ApiBody({ type: CreateEventDto })
  create(@Req() req, @Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(req.user.id, dto);
  }

  @Roles(Role.CUSTOMER)
  @Get('my')
  myEvents(@Req() req) {
    return this.eventsService.getMyEvents(req.user.id);
  }

  @Roles(Role.CUSTOMER, Role.EVENT_MANAGER)
  @Post(':id/services')
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: AddEventServiceDto })
  addService(
    @Param('id') id: string,
    @Body() dto: AddEventServiceDto,
  ) {
    return this.eventsService.addService(+id, dto);
  }

  @Roles(Role.ADMIN,Role.EVENT_MANAGER)
  @Patch(':id/assign-manager')
  @ApiParam({ name: 'id', example: 1 })
  assignManager(
    @Param('id') id: string,
    @Body() dto: AssignManagerDto,
  ) {
    return this.eventsService.assignManager(+id, dto.managerId);
  }
}
