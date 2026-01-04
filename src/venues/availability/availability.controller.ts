import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import{ApiTags} from '@nestjs/swagger';
@ApiTags('availability')

@Controller('availability')
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  // CREATE AVAILABILITY (VENUE OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Post()
  createAvailability(@Body() body: any) {
    return this.availabilityService.create(
      Number(body.venueId),
      new Date(body.date),
      body.timeSlot,
    );
  }

  // GET AVAILABILITY BY VENUE
  @UseGuards(JwtAuthGuard)
  @Get(':venueId')
  getAvailability(@Param('venueId') venueId: string) {
    return this.availabilityService.findByVenue(Number(venueId));
  }
}
