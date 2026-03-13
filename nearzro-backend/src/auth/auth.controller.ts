import { Body, Controller, Get, Post, Req, UseGuards, UseInterceptors, UploadedFiles, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VendorRegisterDto } from './dto/vendor-register.dto';
import { VenueOwnerRegisterDto } from './dto/venue-owner-register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { AuthGuard } from '@nestjs/passport';
import{ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import type { AuthRequest } from './auth-request.interface';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

// Warn if OAuth not configured
if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
  console.log('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID in .env to enable Google login.');
}
if (!process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID === 'YOUR_FACEBOOK_APP_ID') {
  console.log('⚠️  Facebook OAuth not configured. Set FACEBOOK_APP_ID in .env to enable Facebook login.');
}
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

  // 👑 ADMIN registration (requires existing admin token)
  @Roles(Role.ADMIN)
  @Post('register-admin')
  registerAdmin(@Body() dto: RegisterDto) {
    return this.authService.registerAdmin(dto);
  }

  // 🏢 VENUE OWNER registration (with images & KYC)
  @Public()
  @Post('register-venue-owner')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'venueImages', maxCount: 5 },
      { name: 'kycDocFiles', maxCount: 5 },
    ], {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  registerVenueOwner(
    @Body() dto: VenueOwnerRegisterDto,
    @UploadedFiles() files: { venueImages?: Express.Multer.File[], kycDocFiles?: Express.Multer.File[] },
  ) {
    // Validate minimum 1 venue image
    if (!files.venueImages || files.venueImages.length === 0) {
      throw new BadRequestException('Please upload at least 1 venue image (maximum 5 allowed)');
    }

    // Validate KYC documents (1-5 images)
    if (!files.kycDocFiles || files.kycDocFiles.length === 0) {
      throw new BadRequestException('Please upload at least 1 KYC document image (maximum 5 allowed)');
    }
    if (files.kycDocFiles.length > 5) {
      throw new BadRequestException('Maximum 5 KYC document images allowed');
    }

    const venueImageUrls = files.venueImages?.map(f => `/uploads/${f.filename}`) || [];
    const kycDocUrls = files.kycDocFiles?.map(f => `/uploads/${f.filename}`) || [];

    return this.authService.registerVenueOwner(dto, venueImageUrls, kycDocUrls[0], dto.kycDocType, dto.kycDocNumber, kycDocUrls);
  }

  // 🏪 VENDOR registration (with images & KYC)
  @Public()
  @Post('register-vendor')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'businessImages', maxCount: 5 },
      { name: 'kycDocFiles', maxCount: 5 },
    ], {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  registerVendor(
    @Body() dto: VendorRegisterDto,
    @UploadedFiles() files: { businessImages?: Express.Multer.File[], kycDocFiles?: Express.Multer.File[] },
  ) {
    // Validate minimum 1 business image
    if (!files.businessImages || files.businessImages.length === 0) {
      throw new BadRequestException('Please upload at least 1 business image (maximum 5 allowed)');
    }

    // Validate KYC documents (1-5 images)
    if (!files.kycDocFiles || files.kycDocFiles.length === 0) {
      throw new BadRequestException('Please upload at least 1 KYC document image (maximum 5 allowed)');
    }
    if (files.kycDocFiles.length > 5) {
      throw new BadRequestException('Maximum 5 KYC document images allowed');
    }

    const businessImageUrls = files.businessImages?.map(f => `/uploads/${f.filename}`) || [];
    const kycDocUrls = files.kycDocFiles?.map(f => `/uploads/${f.filename}`) || [];

    return this.authService.registerVendor(dto, businessImageUrls, kycDocUrls[0], dto.kycDocType, dto.kycDocNumber, kycDocUrls);
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

  // ✉️ Check if email exists (for registration validation)
  @Public()
  @Post('check-email')
  async checkEmail(@Body() body: { email: string }) {
    return this.authService.checkEmailExists(body.email);
  }

  // 🚀 Redirect to Google
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // redirects to Google OAuth
  }

  // 🎯 Google callback - returns JWT token for frontend
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req) {
    try {
      const result = await this.authService.googleLogin(req.user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const token = result.token;
      const user = result.user;
      
      // Redirect to frontend with token in URL
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`;
      
      // Use response to redirect
      req.res?.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      req.res?.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }

  // 📘 Redirect to Facebook
  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth() {
    // redirects to Facebook OAuth
  }

  // 🎯 Facebook callback - returns JWT token for frontend
  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthCallback(@Req() req) {
    try {
      const result = await this.authService.facebookLogin(req.user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const token = result.token;
      const user = result.user;
      
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`;
      req.res?.redirect(redirectUrl);
    } catch (error) {
      console.error('Facebook OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      req.res?.redirect(`${frontendUrl}/login?error=facebook_auth_failed`);
    }
  }

  // 🔑 FORGOT PASSWORD - Send reset email
  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // 🔑 RESET PASSWORD - Reset password with token
  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // 📧 SEND OTP - For registration verification
  @Public()
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.email, dto.phone);
  }

  // ✅ VERIFY OTP - Verify OTP during registration
  @Public()
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

}
