import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import{ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import type { AuthRequest } from './auth-request.interface';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 👤 Normal USER registration
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // 🏢 VENUE OWNER registration
   @Public()
  @Post('register-venue-owner')
  registerVenueOwner(@Body() dto: RegisterDto) {
    return this.authService.registerVenueOwner(dto);
  }
  
  // 🏪 VENDOR registration
@Public()
@Post('register-vendor')
registerVendor(@Body() dto: RegisterDto) {
  return this.authService.registerVendor(dto);
}


  // 🔐 Login (all roles)
   @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // 👤 Logged-in user info
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  me(@Req() req: AuthRequest) {
    return req.user;
  }
  // 🚀 Redirect to Google
@Public()
@Get('google')
@UseGuards(AuthGuard('google'))
googleAuth() {
  // redirects to Google
}

// 🎯 Google callback
 @Public()
@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleAuthCallback(@Req() req) {
  return this.authService.googleLogin(req.user);
}

}
