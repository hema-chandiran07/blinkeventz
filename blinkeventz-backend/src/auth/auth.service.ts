import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {}

  // 👤 CUSTOMER registration - NO auto login, requires OTP verification
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        role: Role.CUSTOMER,
        isEmailVerified: false, // Requires OTP verification
      },
    });

    // Return user without token - OTP verification required first
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: false,
      },
      requiresOtp: true,
      message: 'Registration successful. Please verify your email with OTP.',
    };
  }

  // 🏢 VENUE OWNER registration - requires OTP verification
  async registerVenueOwner(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        role: Role.VENUE_OWNER,
        isEmailVerified: false, // Requires OTP verification
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: false,
      },
      requiresOtp: true,
      message: 'Registration successful. Please verify your email with OTP.',
    };
  }

  // 🏪 VENDOR registration - requires OTP verification
  async registerVendor(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 1️⃣ Create USER with VENDOR role
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        role: Role.VENDOR,
        isEmailVerified: false, // Requires OTP verification
      },
    });

    // 2️⃣ Create VENDOR PROFILE
    await this.prisma.vendor.create({
      data: {
        userId: user.id,
        businessName: dto.name,
        city: 'NOT_SET',
        area: 'NOT_SET',
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: false,
      },
      requiresOtp: true,
      message: 'Registration successful. Please verify your email with OTP.',
    };
  }


  // 🔐 Login
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Please login using Google');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: this.jwtService.sign(payload),
    };
  }
  async googleLogin(googleUser: {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}) {
  let user = await this.prisma.user.findUnique({
    where: { googleId: googleUser.googleId },
  });

  if (!user) {
    user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (user && !user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.googleId },
      });
    }
  }

  if (!user) {
    user = await this.prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        role: Role.CUSTOMER,
        passwordHash: null,
      },
    });
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      picture: user.googleId ? googleUser.picture : undefined,
    },
    token: this.jwtService.sign(payload),
  };
}

  async facebookLogin(facebookUser: {
  facebookId: string;
  email: string;
  name: string;
  picture?: string;
}) {
  let user = await this.prisma.user.findUnique({
    where: { facebookId: facebookUser.facebookId },
  });

  if (!user) {
    user = await this.prisma.user.findUnique({
      where: { email: facebookUser.email },
    });

    if (user && !user.facebookId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { facebookId: facebookUser.facebookId },
      });
    }
  }

  if (!user) {
    user = await this.prisma.user.create({
      data: {
        email: facebookUser.email,
        name: facebookUser.name,
        facebookId: facebookUser.facebookId,
        role: Role.CUSTOMER,
        passwordHash: null,
      },
    });
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      picture: user.facebookId ? facebookUser.picture : undefined,
    },
    token: this.jwtService.sign(payload),
  };
}

  // 🔑 FORGOT PASSWORD - Send reset email
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Don't reveal if email exists or not (security best practice)
      return { 
        success: true, 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      };
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetTokenExpiry,
      },
    });

    // TODO: Send email with reset link
    // For now, log the token (in production, use SendGrid or similar)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
    console.log('📧 Password Reset Link:', resetLink);
    console.log('⚠️  In production, this would be sent via email to:', dto.email);

    return { 
      success: true, 
      message: 'If an account exists with this email, you will receive a password reset link.' 
    };
  }

  // 🔑 RESET PASSWORD - Reset password with token
  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Find user with valid reset token
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiry: {
          gte: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update user password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return {
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    };
  }

  // 📧 SEND OTP
  async sendOtp(email: string, phone?: string) {
    return this.otpService.sendOtp(email, phone);
  }

  // ✅ VERIFY OTP
  async verifyOtp(email: string, otp: string) {
    return this.otpService.verifyOtp(email, otp);
  }
}