import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { OtpService } from './otp.service';
import { SendOtpDto, VerifyOtpDto, SendPhoneOtpDto, VerifyPhoneOtpDto } from './dto/otp.dto';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('OTP Verification')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('send')
  @ApiOperation({ summary: 'Send OTP to email/phone' })
  @ApiBody({ type: SendOtpDto })
  async sendOtp(@Body() dto: SendOtpDto) {
    return await this.otpService.sendOtp(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('send-phone')
  @ApiOperation({ summary: 'Send OTP to phone number' })
  @ApiBody({ type: SendPhoneOtpDto })
   async sendPhoneOtp(@Body() dto: SendPhoneOtpDto) {
     return await this.otpService.sendOtp(undefined, dto.phone, undefined);
   }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-phone')
  @ApiOperation({ summary: 'Verify phone OTP' })
  @ApiBody({ type: VerifyPhoneOtpDto })
   async verifyPhoneOtp(@Body() dto: VerifyPhoneOtpDto) {
     return await this.otpService.verifyOtp(dto.phone, dto.otp);
   }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify')
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return await this.otpService.verifyOtp(dto.email, dto.otp);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
   @Post('resend')
   @ApiOperation({ summary: 'Resend OTP' })
   @ApiBody({ type: SendOtpDto })
    async resendOtp(@Body() dto: SendOtpDto) {
      return await this.otpService.sendOtp(dto.email, dto.phone, undefined);
    }
 }