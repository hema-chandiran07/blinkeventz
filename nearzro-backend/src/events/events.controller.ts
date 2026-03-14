import {
  Controller, 
  Post, 
  Body, 
  Req, 
  Get, 
  Param, 
  Patch, 
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { AddEventServiceDto } from './dto/add-event-service.dto';
import { AssignManagerDto } from './dto/assign-manager.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { EventOwnerGuard } from './guards/event-owner.guard';
import { EventManagerGuard } from './guards/event-manager.guard';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET ALL EVENTS (Public)
   * 
   * Returns paginated list of events with basic info.
   * Does NOT expose customer PII.
   */
  @Public()
  @Get()
  @ApiQuery({ type: EventQueryDto })
  findAll(@Query() query: EventQueryDto) {
    return this.eventsService.findAll(query);
  }

  /**
   * CREATE EVENT
   * 
   * Creates a new event for the authenticated customer.
   */
  @Roles(Role.CUSTOMER)
  @Post()
  @ApiBody({ type: CreateEventDto })
  create(@Req() req, @Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(req.user.userId, dto);
  }

  /**
   * GET MY EVENTS
   * 
   * Returns events owned by the current user.
   */
  @Roles(Role.CUSTOMER)
  @Get('my')
  @ApiQuery({ type: EventQueryDto })
  myEvents(@Req() req, @Query() query: EventQueryDto) {
    return this.eventsService.getMyEvents(req.user.userId, query);
  }

  /**
   * GET SINGLE EVENT
   * 
   * Returns event details. Accessible by owner, assigned manager, or admin.
   */
  @Roles(Role.CUSTOMER, Role.EVENT_MANAGER, Role.ADMIN)
  @Get(':id')
  @ApiParam({ name: 'id', example: 1 })
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id, req.user.userId, req.user.role);
  }

  /**
   * UPDATE EVENT
   * 
   * Updates an event. Only owner or admin can update.
   */
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @Patch(':id')
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateEventDto })
  @UseGuards(EventOwnerGuard)
  update(
    @Req() req, 
    @Param('id', ParseIntPipe) id: number, 
    @Body() dto: UpdateEventDto
  ) {
    return this.eventsService.updateEvent(id, req.user.userId, req.user.role, dto);
  }

  /**
   * DELETE EVENT (ADMIN ONLY)
   * 
   * Deletes an event and all related services.
   */
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiParam({ name: 'id', example: 1 })
  @UseGuards(EventOwnerGuard)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.deleteEvent(id);
  }

  /**
   * ADD SERVICE TO EVENT
   * 
   * Adds a service to an event. Owner, assigned manager, or admin can add.
   */
  @Roles(Role.CUSTOMER, Role.EVENT_MANAGER, Role.ADMIN)
  @Post(':id/services')
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: AddEventServiceDto })
  @UseGuards(EventManagerGuard)
  addService(
    @Req() req,
    @Param('id', ParseIntPipe) id: number, 
    @Body() dto: AddEventServiceDto,
  ) {
    return this.eventsService.addService(id, req.user.userId, req.user.role, dto);
  }

  /**
   * ASSIGN EVENT MANAGER (ADMIN ONLY)
   * 
   * Assigns an event manager to an event.
   */
  @Roles(Role.ADMIN)
  @Patch(':id/assign-manager')
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: AssignManagerDto })
  assignManager(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignManagerDto,
  ) {
    return this.eventsService.assignManager(id, dto.managerId);
  }
}
