import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { Controller, Get, Req, UseGuards, Param, NotFoundException, ParseIntPipe, ForbiddenException, Body, Patch, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiParam, ApiOperation, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============================================================================
  // GET USERS
  // ============================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all users (admin only)' })
  getAllUsers() {
    return this.usersService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@Req() req) {
    return req.user;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  @ApiOperation({ summary: 'Admin-only route test' })
  adminRoute() {
    return 'ADMIN ACCESS GRANTED';
  }

  // ============================================================================
  // UPDATE USER PROFILE
  // ============================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        phone: { type: 'string', example: '+919876543210' },
        city: { type: 'string', example: 'Mumbai' },
        area: { type: 'string', example: 'Bandra' },
      },
    },
  })
  async updateProfile(
    @Req() req: any,
    @Body() body: { name?: string; phone?: string; city?: string; area?: string },
  ) {
    return this.usersService.updateProfile(req.user.userId || req.user.id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  @ApiOperation({ summary: 'Update current user password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['currentPassword', 'newPassword'],
      properties: {
        currentPassword: { type: 'string', example: 'OldPassword123' },
        newPassword: { type: 'string', example: 'NewPassword456' },
      },
    },
  })
  async updatePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.updatePassword(req.user.userId || req.user.id, body);
  }

  // ============================================================================
  // USER EVENTS & PAYMENTS (must be BEFORE :id route)
  // ============================================================================

  // Get events for a specific user
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER, Role.VENDOR, Role.VENUE_OWNER, Role.EVENT_MANAGER, Role.SUPPORT)
  @Get(':id/events')
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiOperation({ summary: 'Get events for a user' })
  async getUserEvents(
    @Param('id', ParseIntPipe) id: string,
    @Req() req: any,
  ) {
    const requestedUserId = +id;
    const currentUserId = req.user.userId || req.user.id;
    const isAdmin = req.user.role === Role.ADMIN;

    if (Number(currentUserId) !== Number(requestedUserId) && !isAdmin) {
      throw new ForbiddenException('You can only view your own events');
    }

    return this.usersService.getUserEvents(requestedUserId);
  }

  // Get payments for a specific user
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER, Role.VENDOR, Role.VENUE_OWNER, Role.EVENT_MANAGER, Role.SUPPORT)
  @Get(':id/payments')
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiOperation({ summary: 'Get payments for a user' })
  async getUserPayments(
    @Param('id', ParseIntPipe) id: string,
    @Req() req: any,
  ) {
    const requestedUserId = +id;
    const currentUserId = req.user.userId || req.user.id;
    const isAdmin = req.user.role === Role.ADMIN;

    if (Number(currentUserId) !== Number(requestedUserId) && !isAdmin) {
      throw new ForbiddenException('You can only view your own payments');
    }

    return this.usersService.getUserPayments(requestedUserId);
  }

  // ============================================================================
  // DYNAMIC :id ROUTES (must be AFTER all specific routes)
  // ============================================================================

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  async getUserById(@Param('id', ParseIntPipe) id: string) {
    const user = await this.usersService.findById(+id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /// 👑 ADMIN → Update user (change role, status, etc.)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        phone: { type: 'string', example: '+919876543210' },
        role: { type: 'string', enum: ['CUSTOMER', 'VENDOR', 'VENUE_OWNER', 'ADMIN', 'EVENT_MANAGER', 'SUPPORT'] },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, body, req.user.userId || req.user.id);
  }

  /// 👑 ADMIN → Delete user (soft delete or hard delete)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.deleteUser(id, req.user.userId || req.user.id);
  }
}
