import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

// Constants for security configuration
const BCRYPT_ROUNDS = 12; // Higher security
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private configService: ConfigService,
  ) {}

  // 👤 CUSTOMER registration - NO auto login, requires OTP verification
  async register(dto: RegisterDto) {
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Password strength validation
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!strongPassword.test(dto.password)) {
      throw new BadRequestException('Weak password');
    }

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

    // Send OTP for email verification
    await this.otpService.sendOtp(user.email!, undefined);

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
    filesOrBusinessImageUrls: string[] | any = [],
    kycDocUrl?: string,
    kycDocType?: string,
    kycDocNumber?: string,
    kycDocUrls?: string[], // Array of KYC document URLs (1-5 images)
  ) {
    // Handle both old signature (businessImageUrls array) and new signature (files object)
    let businessImageUrls: string[];
    if (Array.isArray(filesOrBusinessImageUrls)) {
      businessImageUrls = filesOrBusinessImageUrls;
    } else if (filesOrBusinessImageUrls && filesOrBusinessImageUrls.businessImages) {
      // New signature: files object with businessImages
      businessImageUrls = filesOrBusinessImageUrls.businessImages.map((f: any) => `/uploads/${f.filename}`);
      kycDocUrls = filesOrBusinessImageUrls.kycDocFiles?.map((f: any) => `/uploads/${f.filename}`);
      kycDocUrl = kycDocUrls?.[0];
    } else {
      businessImageUrls = [];
    }
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

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenException('User inactive');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account locked');
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

    // Generate refresh token with longer expiration
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpiry = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    // Hash refresh token before storing (security best practice)
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Store refresh token in database - using type assertion for Prisma
    const prismaAny = this.prisma as any;
    await prismaAny.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt: refreshTokenExpiry,
        deviceInfo: 'login',
      },
    });

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
      refreshToken,
    };
  }
  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }) {
    if (!googleUser.email) {
      throw new BadRequestException('Email is required');
    }

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
    accessToken: this.jwtService.sign(payload),
  };
}

  async facebookLogin(facebookUser: {
    facebookId: string;
    email: string;
    name: string;
    picture?: string;
  }) {
    if (!facebookUser.email) {
      throw new BadRequestException('Email is required');
    }

    // First: Try to find user by facebookId
    const existingByFacebookId = await this.prisma.user.findUnique({
      where: { facebookId: facebookUser.facebookId },
    });

    if (existingByFacebookId) {
      // User found by facebookId - use this user
      const user = existingByFacebookId;
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
          picture: facebookUser.picture,
        },
        accessToken: this.jwtService.sign(payload),
      };
    }

    // Second: Try to find user by email
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: facebookUser.email },
    });

    if (existingByEmail) {
      // Link existing account with facebookId
      const user = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { facebookId: facebookUser.facebookId },
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
          picture: facebookUser.picture,
        },
        accessToken: this.jwtService.sign(payload),
      };
    }

    // Third: Create new user
    const newUser = await this.prisma.user.create({
      data: {
        email: facebookUser.email,
        name: facebookUser.name,
        facebookId: facebookUser.facebookId,
        role: Role.CUSTOMER,
        passwordHash: null,
      },
    });

    const payload = {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };
    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        picture: facebookUser.picture,
      },
      accessToken: this.jwtService.sign(payload),
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

    // Save token to database using passwordResetToken table
    const prismaAny = this.prisma as any;
    await prismaAny.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt: resetTokenExpiry,
      },
    });

    // Also update user with token for backward compatibility
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

    // Find the reset token first
    const prismaAny = this.prisma as any;
    const resetTokenRecord = await prismaAny.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!resetTokenRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is expired
    if (resetTokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Find user with the token
    const user = await this.prisma.user.findUnique({
      where: { id: resetTokenRecord.userId },
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

    // Delete the used reset token
    await prismaAny.passwordResetToken.delete({
      where: { id: resetTokenRecord.id },
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
  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return !!user;
  }

  // ============================================
  // SECURITY IMPROVEMENTS - New Methods
  // ============================================

  /**
   * Generate access and refresh tokens for a user
   */
  async generateTokens(user: {
    id: number;
    email: string;
    role: Role;
    hasVendorProfile?: boolean;
    hasVenueProfile?: boolean;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hasVendorProfile: user.hasVendorProfile || false,
      hasVenueProfile: user.hasVenueProfile || false,
    };

    // Generate access token with short expiration
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // Generate refresh token with longer expiration
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpiry = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    // Hash refresh token before storing (security best practice)
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Store refresh token in database - using type assertion for Prisma
    const prismaAny = this.prisma as any;
    await prismaAny.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt: refreshTokenExpiry,
        deviceInfo: 'oauth',
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }

  /**
   * Handle OAuth login - creates or updates user and generates tokens
   */
  async handleOAuthLogin(
    oauthUser: {
      googleId?: string;
      facebookId?: string;
      email: string;
      name: string;
      picture?: string;
    },
    provider: 'google' | 'facebook',
  ) {
    const isGoogle = provider === 'google';
    const oauthId = isGoogle ? oauthUser.googleId : oauthUser.facebookId;

    if (!oauthId) {
      throw new BadRequestException(`Invalid ${provider} profile data`);
    }

    // Find user by OAuth ID
    let user = isGoogle
      ? await this.prisma.user.findUnique({
          where: { googleId: oauthId },
          include: { vendor: true, venues: true },
        })
      : await this.prisma.user.findUnique({
          where: { facebookId: oauthId },
          include: { vendor: true, venues: true },
        });

    // If not found by OAuth ID, try by email
    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: oauthUser.email },
        include: { vendor: true, venues: true },
      });

      // Link OAuth account to existing user
      if (user) {
        const updateData = isGoogle
          ? { googleId: oauthId }
          : { facebookId: oauthId };

        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: { vendor: true, venues: true },
        });
      }
    }

    // Create new user if doesn't exist
    if (!user) {
      const createData = isGoogle
        ? {
            email: oauthUser.email,
            name: oauthUser.name,
            googleId: oauthId,
            role: Role.CUSTOMER,
            passwordHash: null,
            isEmailVerified: true,
          }
        : {
            email: oauthUser.email,
            name: oauthUser.name,
            facebookId: oauthId,
            role: Role.CUSTOMER,
            passwordHash: null,
            isEmailVerified: true,
          };

      user = await this.prisma.user.create({
        data: createData,
        include: { vendor: true, venues: true },
      });
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Get vendor and venues if not loaded
    const vendor = user.vendor || await this.prisma.vendor.findUnique({ where: { userId: user.id } });
    const venues = user.venues || await this.prisma.venue.findMany({ where: { ownerId: user.id } });

    // Generate tokens
    return this.generateTokens({
      id: user.id,
      email: user.email!,
      role: user.role,
      hasVendorProfile: !!vendor,
      hasVenueProfile: venues.length > 0,
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string) {
    // Hash the incoming token to compare with stored hash
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Find valid refresh token
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: tokenHash,
        expiresAt: { gte: new Date() },
        revoked: false,
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Additional check: verify token is not expired (belt and suspenders)
    if (storedToken.expiresAt && storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check if token is revoked
    if (storedToken.revoked) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user from the included relation or fetch separately
    let user = storedToken.user;
    
    if (!user) {
      // Fetch user separately if not included
      user = await this.prisma.user.findUnique({
        where: { id: storedToken.userId },
      }) as typeof user;
    }
    
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });
    const venues = await this.prisma.venue.findMany({
      where: { ownerId: user.id },
    }) || [];

    // Revoke old refresh token (token rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    // Generate new tokens
    return this.generateTokens({
      id: user.id,
      email: user.email!,
      role: user.role,
      hasVendorProfile: !!vendor,
      hasVenueProfile: venues.length > 0,
    });
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllUserTokens(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  /**
   * Revoke specific refresh token
   */
  async revokeToken(refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.refreshToken.updateMany({
      where: { token: tokenHash, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  /**
   * Hash password reset token before storing (security improvement)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Check and handle account lockout
   */
  private async checkAccountLockout(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    if (!user) return;

    const lockedUntil = user.lockedUntil as Date | null;
    
    // Check if account is locked
    if (lockedUntil && lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account is locked. Try again in ${remainingMinutes} minutes`,
      );
    }
  }

  /**
   * Record failed login attempt
   */
  private async recordFailedLogin(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    if (!user) return;

    const failedLoginAttempts = user.failedLoginAttempts as number;
    const newAttempts = failedLoginAttempts + 1;
    let lockedUntil: Date | null = null;

    // Lock account after max attempts
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      lockedUntil = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil,
      },
    });
  }

  /**
   * Reset failed login attempts on successful login
   */
  private async resetFailedLogin(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }
}
