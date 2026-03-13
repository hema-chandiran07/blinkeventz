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
  async registerVenueOwner(
    dto: VenueOwnerRegisterDto,
    venueImageUrls: string[] = [],
    kycDocUrl?: string,
    kycDocType?: string,
    kycDocNumber?: string,
    kycDocUrls?: string[], // Array of KYC document URLs (1-5 images)
  ) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { venues: true, vendor: true },
    });

    // Check if username already exists in Venue table
    const existingVenueByUsername = await this.prisma.venue.findFirst({
      where: { username: dto.name },
    });

    if (existingVenueByUsername) {
      throw new BadRequestException('Username already taken. Please choose a different username.');
    }

    // If user exists and already has a venue, reject (prevent duplicate venue registration)
    if (existingUser && existingUser.venues.length > 0) {
      throw new BadRequestException('Email already registered as Venue Owner');
    }

    // If user exists (e.g., as VENDOR or CUSTOMER), add venue to their profile
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

      // ⚠️ Do NOT update user's name - keep original username for login
      // The username (name) should remain as the first one registered
      // dto.name is stored as venue username for login

      // Create venue profile for existing user
      const venue = await this.prisma.venue.create({
        data: {
          ownerId: existingUser.id,
          username: dto.name, // Store as username for venue-specific login
          name: dto.venueName,
          type: dto.venueType as any,
          description: dto.description,
          city: dto.city,
          area: dto.area,
          address: 'Address to be updated by owner',
          pincode: '000000',
          capacityMin: 100,
          capacityMax: dto.capacity ? parseInt(dto.capacity as any, 10) || 500 : 500,
          basePriceMorning: 50000,
          basePriceEvening: 75000,
          basePriceFullDay: 120000,
          status: 'PENDING_APPROVAL',
          images: venueImageUrls, // Save venue images
        },
      });

      // Create KYC documents if provided (support 1-5 images)
      if (kycDocUrls && kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
        try {
          // Create a KYC document record for each image
          for (const docUrl of kycDocUrls) {
            await this.prisma.kycDocument.create({
              data: {
                userId: existingUser.id,
                docType: kycDocType as any,
                docNumber: kycDocNumber,
                docNumberHash: crypto.createHash('sha256').update(kycDocNumber).digest('hex'),
                docFileUrl: docUrl,
                status: 'PENDING',
              },
            });
          }
        } catch (error: any) {
          // Ignore duplicate KYC errors
          if (error.code !== 'P2002') {
            console.error('KYC creation error:', error.message);
          }
        }
      }

      return {
        user: {
          id: existingUser.id,
          name: existingUser.name, // Keep original username
          email: existingUser.email,
          role: existingUser.role, // Keep original role - frontend uses hasVenueProfile/hasVendorProfile
          isEmailVerified: existingUser.isEmailVerified,
          hasVendorProfile: !!existingUser.vendor,
          hasVenueProfile: true, // Just added a venue
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
    try {
      await this.prisma.venue.create({
        data: {
          ownerId: user.id,
          username: dto.name, // Store username for venue-specific login
          name: dto.venueName,
          type: dto.venueType as any,
          description: dto.description,
          city: dto.city,
          area: dto.area,
          address: 'Address to be updated by owner',
          pincode: '000000',
          capacityMin: 100,
          capacityMax: dto.capacity ? parseInt(dto.capacity as any, 10) || 500 : 500,
          basePriceMorning: 50000,
          basePriceEvening: 75000,
          basePriceFullDay: 120000,
          status: 'PENDING_APPROVAL',
          images: venueImageUrls || [], // Save venue images
        },
      });
    } catch (error: any) {
      console.error('Venue creation error:', error.message);
      // Continue anyway - user is created
    }

    // Create KYC documents if provided (support 1-5 images)
    if (kycDocUrls && kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
      try {
        // Create a KYC document record for each image
        for (const docUrl of kycDocUrls) {
          await this.prisma.kycDocument.create({
            data: {
              userId: user.id,
              docType: kycDocType as any,
              docNumber: kycDocNumber,
              docNumberHash: crypto.createHash('sha256').update(kycDocNumber).digest('hex'),
              docFileUrl: docUrl,
              status: 'PENDING',
            },
          });
        }
      } catch (error: any) {
        // Ignore duplicate KYC errors
        if (error.code !== 'P2002') {
          console.error('KYC creation error:', error.message);
        }
      }
    }

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
  async registerVendor(
    dto: VendorRegisterDto,
    businessImageUrls: string[] = [],
    kycDocUrl?: string,
    kycDocType?: string,
    kycDocNumber?: string,
    kycDocUrls?: string[], // Array of KYC document URLs (1-5 images)
  ) {
    // Check if user already exists by email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { vendor: true, venues: true },
    });

    // Check if username already exists in Vendor table
    const existingVendorByUsername = await this.prisma.vendor.findUnique({
      where: { username: dto.name },
    });

    if (existingVendorByUsername) {
      throw new BadRequestException('Username already taken. Please choose a different username.');
    }

    // If user exists and already has a vendor profile, reject (prevent duplicate vendor registration)
    if (existingUser && existingUser.vendor) {
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

      // ⚠️ Do NOT update user's name - keep original username for login
      // The username (name) should remain as the first one registered
      // dto.name is stored as vendor username for login

      // Create vendor profile for existing user
      const vendor = await this.prisma.vendor.create({
        data: {
          userId: existingUser.id,
          username: dto.name, // Store as username for vendor-specific login
          businessName: dto.businessName,
          description: dto.description,
          city: dto.city,
          area: dto.area,
          serviceRadiusKm: dto.serviceRadiusKm || 50,
          verificationStatus: 'PENDING',
          images: businessImageUrls, // Save business images
        },
      });

      // Create KYC documents if provided (support 1-5 images)
      if (kycDocUrls && kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
        try {
          // Create a KYC document record for each image
          for (const docUrl of kycDocUrls) {
            await this.prisma.kycDocument.create({
              data: {
                userId: existingUser.id,
                docType: kycDocType as any,
                docNumber: kycDocNumber,
                docNumberHash: crypto.createHash('sha256').update(kycDocNumber).digest('hex'),
                docFileUrl: docUrl,
                status: 'PENDING',
              },
            });
          }
        } catch (error: any) {
          // Ignore duplicate KYC errors
          if (error.code !== 'P2002') {
            console.error('KYC creation error:', error.message);
          }
        }
      }

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
          name: existingUser.name, // Keep original username
          email: existingUser.email,
          role: existingUser.role, // Keep original role - frontend uses hasVenueProfile/hasVendorProfile
          isEmailVerified: existingUser.isEmailVerified,
          hasVendorProfile: true, // Just added vendor profile
          hasVenueProfile: existingUser.venues && existingUser.venues.length > 0,
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
        username: dto.name, // Store username for vendor-specific login
        businessName: dto.businessName,
        description: dto.description,
        city: dto.city,
        area: dto.area,
        serviceRadiusKm: dto.serviceRadiusKm || 50,
        verificationStatus: 'PENDING',
        images: businessImageUrls, // Save business images
      },
    });

    // Create KYC documents if provided (support 1-5 images)
    if (kycDocUrls && kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
      try {
        // Create a KYC document record for each image
        for (const docUrl of kycDocUrls) {
          await this.prisma.kycDocument.create({
            data: {
              userId: user.id,
              docType: kycDocType as any,
              docNumber: kycDocNumber,
              docNumberHash: crypto.createHash('sha256').update(kycDocNumber).digest('hex'),
              docFileUrl: docUrl,
              status: 'PENDING',
            },
          });
        }
      } catch (error: any) {
        // Ignore duplicate KYC errors
        if (error.code !== 'P2002') {
          console.error('KYC creation error:', error.message);
        }
      }
    }

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
  // - Login with EMAIL → uses first registered profile (based on createdAt)
  // - Login with USERNAME → identifies specific role based on username in Vendor/Venue table
  async login(dto: LoginDto) {
    let user: any;
    let loginRole: 'email' | 'vendor_username' | 'venue_username' | 'user_name' = 'email';

    // First, try to find by email
    user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { vendor: true, venues: true },
    });

    if (!user) {
      // Try to find by username in Vendor table
      const vendor = await this.prisma.vendor.findUnique({
        where: { username: dto.email },
        include: { user: { include: { venues: true } } },
      });
      
      if (vendor) {
        user = vendor.user;
        loginRole = 'vendor_username';
      }
    }

    if (!user) {
      // Try to find by username in Venue table
      const venue = await this.prisma.venue.findFirst({
        where: { username: dto.email },
        include: { owner: { include: { vendor: true, venues: true } } },
      });
      
      if (venue) {
        user = venue.owner;
        loginRole = 'venue_username';
      }
    }

    if (!user) {
      // Try to find by user.name (legacy username)
      user = await this.prisma.user.findFirst({
        where: { name: dto.email },
        include: { vendor: true, venues: true },
      });
      
      if (user) {
        loginRole = 'user_name';
      }
    }

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

    // Determine role based on login method and available profiles
    const hasVendorProfile = !!user.vendor;
    const hasVenueProfile = user.venues && user.venues.length > 0;
    let effectiveRole = user.role;

    // If logged in with vendor username, force VENDOR role
    if (loginRole === 'vendor_username') {
      effectiveRole = Role.VENDOR;
    }
    // If logged in with venue username, force VENUE_OWNER role
    else if (loginRole === 'venue_username') {
      effectiveRole = Role.VENUE_OWNER;
    }
    // If login with EMAIL or user.name and user has both profiles, use the first registered one
    else if (hasVendorProfile && hasVenueProfile) {
      const vendorCreatedAt = user.vendor.createdAt;
      const firstVenueCreatedAt = user.venues[0]?.createdAt;
      
      if (vendorCreatedAt < firstVenueCreatedAt) {
        effectiveRole = Role.VENDOR;
      } else {
        effectiveRole = Role.VENUE_OWNER;
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: effectiveRole,
      hasVendorProfile,
      hasVenueProfile,
    };

    // Determine display name based on login method
    let displayName = user.name;
    if (loginRole === 'vendor_username' && user.vendor) {
      displayName = user.vendor.username || user.name;
    } else if (loginRole === 'venue_username' && user.venues && user.venues.length > 0) {
      // Find the venue they logged in with
      const loggedVenue = user.venues.find(v => v.username === dto.email);
      displayName = loggedVenue?.username || user.venues[0]?.username || user.name;
    }

    return {
      user: {
        id: user.id,
        name: displayName,
        email: user.email,
        role: effectiveRole,
        hasVendorProfile,
        hasVenueProfile,
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

  // ✉️ Check if email exists (for registration validation)
  async checkEmailExists(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        vendor: true,
        venues: true,
      },
    });

    if (!user) {
      return {
        exists: false,
        canRegister: true,
        message: 'Email is available for registration',
      };
    }

    // Check what profiles the user already has
    const hasVendor = !!user.vendor;
    const hasVenue = user.venues && user.venues.length > 0;

    return {
      exists: true,
      hasVendorProfile: hasVendor,
      hasVenueProfile: hasVenue,
      canRegisterAsVendor: !hasVendor,
      canRegisterAsVenue: !hasVenue,
      message: hasVendor && hasVenue
        ? 'Email already registered as both Vendor and Venue Owner'
        : hasVendor
        ? 'Email already registered as Vendor'
        : 'Email already registered as Venue Owner',
    };
  }
}
