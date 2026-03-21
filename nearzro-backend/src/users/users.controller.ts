import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { Controller, Get, Req, UseGuards, Param, NotFoundException, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  getAllUsers() {
    return this.usersService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req) {
    return req.user;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  adminRoute() {
    return 'ADMIN ACCESS GRANTED';
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  async getUserById(@Param('id', ParseIntPipe) id: string) {
    const user = await this.usersService.findById(+id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Get events for a specific user
  // RBAC: USER can only view own events, ADMIN can view any user's events
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER, Role.VENDOR, Role.VENUE_OWNER, Role.EVENT_MANAGER, Role.SUPPORT)
  @Get(':id/events')
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  async getUserEvents(
    @Param('id', ParseIntPipe) id: string,
    @Req() req: any,
  ) {
    // Check if user is trying to access their own data or is admin
    const requestedUserId = +id;
    const currentUserId = req.user.userId || req.user.id;
    const isAdmin = req.user.role === Role.ADMIN;

    if (currentUserId !== requestedUserId && !isAdmin) {
      throw new ForbiddenException('You can only view your own events');
    }

    return this.usersService.getUserEvents(requestedUserId);
  }

  // Get payments for a specific user
  // RBAC: USER can only view own payments, ADMIN can view any user's payments
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER, Role.VENDOR, Role.VENUE_OWNER, Role.EVENT_MANAGER, Role.SUPPORT)
  @Get(':id/payments')
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  async getUserPayments(
    @Param('id', ParseIntPipe) id: string,
    @Req() req: any,
  ) {
    // Check if user is trying to access their own data or is admin
    const requestedUserId = +id;
    const currentUserId = req.user.userId || req.user.id;
    const isAdmin = req.user.role === Role.ADMIN;

    if (currentUserId !== requestedUserId && !isAdmin) {
      throw new ForbiddenException('You can only view your own payments');
    }

    return this.usersService.getUserPayments(requestedUserId);
  }
}
