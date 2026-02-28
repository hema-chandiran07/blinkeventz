import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { OtpService } from './otp.service';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('OTP Verification')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Public()
  @Post('send')
  @ApiOperation({ summary: 'Send OTP to email/phone' })
  @ApiBody({ type: SendOtpDto })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.email, dto.phone);
  }

  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.email, dto.otp);
  }

  @Public()
  @Post('resend')
  @ApiOperation({ summary: 'Resend OTP' })
  @ApiBody({ type: SendOtpDto })
  async resendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.resendOtp(dto.email, dto.phone);
  }
}
