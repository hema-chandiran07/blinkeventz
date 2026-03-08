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
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
@ApiTags('Venues')
@ApiBearerAuth()
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
  @Public()
  @Get()
  getApprovedVenues() {
    return this.venuesService.getApprovedVenues();
  }

  // 👤 PUBLIC → view single venue by ID
  @Public()
  @Get(':id')
  getVenueById(@Param('id') id: string) {
    return this.venuesService.findById(+id);
  }

  // 👤 PUBLIC → search venues
  @Public()
  @Get('search')
  searchVenues(@Req() req: any) {
    const query = req.query.q as string;
    return this.venuesService.searchVenues(query || '');
  }

  // 👑 ADMIN → approve venue
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  async approveVenue(@Param('id') id: string) {
    try {
      return this.venuesService.approveVenue(Number(id));
    } catch (error: any) {
      console.error('Error approving venue:', error);
      throw error;
    }
  }

  // 👑 ADMIN → reject venue
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  async rejectVenue(@Param('id') id: string) {
    try {
      return this.venuesService.rejectVenue(Number(id));
    } catch (error: any) {
      console.error('Error rejecting venue:', error);
      throw error;
    }
  }

  // 🟢 FIX: Change Role.OWNER to Role.VENUE_OWNER
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENUE_OWNER) 
@Get('my')
getMyVenues(@Req() req: any) {
  return this.venuesService.getVenuesByOwner(req.user.userId);
}
@UseGuards(JwtAuthGuard)
@Get('me')
getProfile(@Req() req) {
  return req.user;
}
}
