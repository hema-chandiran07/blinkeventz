import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { VendorRegisterDto } from './dto/vendor-register.dto';
import { VenueOwnerRegisterDto } from './dto/venue-owner-register.dto';
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

  // 👑 ADMIN registration (requires existing admin)
  async registerAdmin(dto: RegisterDto) {
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
        role: Role.ADMIN,
        isEmailVerified: true, // Admin accounts are pre-verified
      },
    });

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
        isEmailVerified: true,
      },
      token: this.jwtService.sign(payload),
      message: 'Admin account created successfully',
    };
  }

  // 🏢 VENUE OWNER registration - requires OTP verification
  // Allows same email as VENDOR (user can have both businesses)
  async registerVenueOwner(dto: VenueOwnerRegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { venues: true },
    });

    // If user exists and already has VENUE_OWNER role with venues, reject
    if (existingUser && existingUser.role === Role.VENUE_OWNER && existingUser.venues.length > 0) {
      throw new BadRequestException('Email already registered as Venue Owner');
    }

    // If user exists (e.g., as VENDOR), add venue to their profile
    if (existingUser) {
      // Verify password matches existing account
      if (existingUser.passwordHash) {
        const isPasswordValid = await bcrypt.compare(dto.password, existingUser.passwordHash);
        if (!isPasswordValid) {
          throw new BadRequestException('Password does not match existing account');
        }
      } else {
        // OAuth user - set password
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { passwordHash: hashedPassword },
        });
      }

      // Update user's name if different (in case they want to use a different display name)
      if (dto.name !== existingUser.name) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { name: dto.name },
        });
      }

      // Create venue profile for existing user
      const venue = await this.prisma.venue.create({
        data: {
          ownerId: existingUser.id,
          name: dto.venueName,
          type: dto.venueType as any,
          description: dto.description,
          city: dto.city,
          area: dto.area,
          address: 'Address to be updated by owner',
          pincode: '000000',
          capacityMin: 100,
          capacityMax: dto.capacity || 500,
          basePriceMorning: 50000,
          basePriceEvening: 75000,
          basePriceFullDay: 120000,
          status: 'PENDING_APPROVAL',
        },
      });

      return {
        user: {
          id: existingUser.id,
          name: dto.name, // Return the NEW name they entered
          email: existingUser.email,
          role: Role.VENUE_OWNER, // Return VENUE_OWNER so they can access venue dashboard
          isEmailVerified: existingUser.isEmailVerified,
        },
        requiresOtp: !existingUser.isEmailVerified,
        message: 'Venue added successfully. Please verify your email with OTP.',
      };
    }

    // Create new user with VENUE_OWNER role
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        role: Role.VENUE_OWNER,
        isEmailVerified: false,
      },
    });

    // Create venue profile
    await this.prisma.venue.create({
      data: {
        ownerId: user.id,
        name: dto.venueName,
        type: dto.venueType as any,
        description: dto.description,
        city: dto.city,
        area: dto.area,
        address: 'Address to be updated by owner',
        pincode: '000000',
        capacityMin: 100,
        capacityMax: dto.capacity || 500,
        basePriceMorning: 50000,
        basePriceEvening: 75000,
        basePriceFullDay: 120000,
        status: 'PENDING_APPROVAL',
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
  // Allows same email as VENUE_OWNER (user can have both businesses)
  async registerVendor(dto: VendorRegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { vendor: true },
    });

    // If user exists and already has a vendor profile, reject
    if (existingUser && existingUser.role === Role.VENDOR && existingUser.vendor) {
      throw new BadRequestException('Email already registered as Vendor');
    }

    // If user exists (e.g., as VENUE_OWNER or CUSTOMER), add vendor profile
    if (existingUser) {
      // Verify password matches if user has one
      if (existingUser.passwordHash) {
        const isPasswordValid = await bcrypt.compare(dto.password, existingUser.passwordHash);
        if (!isPasswordValid) {
          throw new BadRequestException('Password does not match existing account');
        }
      } else {
        // OAuth user - set password
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { passwordHash: hashedPassword },
        });
      }

      // Update user's name if different (in case they want to use a different display name)
      if (dto.name !== existingUser.name) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { name: dto.name },
        });
      }

      // Create vendor profile for existing user
      const vendor = await this.prisma.vendor.create({
        data: {
          userId: existingUser.id,
          businessName: dto.businessName,
          description: dto.description,
          city: dto.city,
          area: dto.area,
          serviceRadiusKm: dto.serviceRadiusKm || 50,
          verificationStatus: 'PENDING',
        },
      });

      // Create initial vendor service
      await this.prisma.vendorService.create({
        data: {
          vendorId: vendor.id,
          name: `${dto.businessName} - ${dto.businessType}`,
          serviceType: dto.businessType as any,
          baseRate: 50000,
          pricingModel: 'PER_EVENT',
          isActive: true,
        },
      });

      return {
        user: {
          id: existingUser.id,
          name: dto.name, // Return the NEW name they entered
          email: existingUser.email,
          role: Role.VENDOR,
          isEmailVerified: existingUser.isEmailVerified,
        },
        requiresOtp: !existingUser.isEmailVerified,
        message: 'Vendor profile added successfully. Please verify your email with OTP.',
      };
    }

    // Create new user with VENDOR role
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        role: Role.VENDOR,
        isEmailVerified: false,
      },
    });

    // Create vendor profile
    const vendor = await this.prisma.vendor.create({
      data: {
        userId: user.id,
        businessName: dto.businessName,
        description: dto.description,
        city: dto.city,
        area: dto.area,
        serviceRadiusKm: dto.serviceRadiusKm || 50,
        verificationStatus: 'PENDING',
      },
    });

    // Create initial vendor service using vendor.id (not user.id)
    await this.prisma.vendorService.create({
      data: {
        vendorId: vendor.id,
        name: `${dto.businessName} - ${dto.businessType}`,
        serviceType: dto.businessType as any,
        baseRate: 50000,
        pricingModel: 'PER_EVENT',
        isActive: true,
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


  // 🔐 Login - accepts email OR username (name)
  // Determines role based on what profiles user has (vendor/venue)
  async login(dto: LoginDto) {
    // Find user by email OR username (name)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { name: dto.email }, // Allow using username as login identifier
        ],
      },
      include: {
        vendor: true,
        venues: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid email/username or password');
    }

    // Check if user has a password (OAuth users don't have password)
    if (!user.passwordHash) {
      throw new BadRequestException('Please login using Google or Facebook to access your account');
    }

    // Validate password if provided
    if (!dto.password || dto.password.length < 1) {
      throw new BadRequestException('Invalid email/username or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email/username or password');
    }

    // Determine role based on what profiles user has
    // Priority: If they have BOTH vendor and venue, use the role from their last registration
    // For simplicity: VENDOR if they have vendor profile, VENUE_OWNER if they have venue profile
    // If they have both, we'll use the role stored in the user table
    let effectiveRole = user.role;
    
    // If user has vendor profile, they can access vendor dashboard
    // If user has venue profile, they can access venue dashboard
    // We'll return their stored role, but the frontend should check what profiles exist
    
    const payload = {
      sub: user.id,
      email: user.email,
      role: effectiveRole,
      hasVendorProfile: !!user.vendor,
      hasVenueProfile: user.venues && user.venues.length > 0,
    };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: effectiveRole,
        hasVendorProfile: !!user.vendor,
        hasVenueProfile: user.venues && user.venues.length > 0,
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