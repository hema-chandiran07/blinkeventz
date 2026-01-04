import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Patch,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import{ApiTags} from '@nestjs/swagger';
@ApiTags('Venues')

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  // 🏢 VENUE OWNER → create venue
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @Post()
  createVenue(@Req() req: any, @Body() dto: CreateVenueDto) {
    return this.venuesService.createVenue(dto, req.user.userId);
  }

  // 👤 PUBLIC → view approved venues
  @Get()
  getApprovedVenues() {
    return this.venuesService.getApprovedVenues();
  }

  // 👑 ADMIN → approve venue
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
@Patch(':id/approve')
approveVenue(@Param('id') id: string) {
  return this.venuesService.approveVenue(Number(id));
}

  // 🟢 FIX: Change Role.OWNER to Role.VENUE_OWNER
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER) 
@Get('my')
getMyVenues(@Req() req: any) {
  return this.venuesService.getVenuesByOwner(req.user.userId);
}

}
