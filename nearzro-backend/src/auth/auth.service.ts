import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { VendorRegisterDto } from './dto/vendor-register.dto';
import { VenueOwnerRegisterDto } from './dto/venue-owner-register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyResetOtpDto } from './dto/forgot-password.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';
import { OtpService } from './otp.service';
import { S3Service } from '../storage/s3.service';
import { unlinkSync } from 'fs';
import { EmailProvider } from '../notifications/providers/email.provider';

// Constants for security configuration
const BCRYPT_ROUNDS = 12; // Higher security
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;
// Note: MAX_LOGIN_ATTEMPTS and LOCKOUT_DURATION_MINUTES removed to match original database schema

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private configService: ConfigService,
    private s3Service: S3Service,
    private emailProvider: EmailProvider,
  ) {}

  /**
   * Hybrid Staging Pattern: Upload files to S3 if AWS keys exist, otherwise keep local
   */
  private async processUploads(uploadedFiles: Express.Multer.File[]): Promise<string[]> {
    if (!uploadedFiles || uploadedFiles.length === 0) return [];

    return await Promise.all(uploadedFiles.map(async (file) => {
      // Check if production AWS keys exist in the environment
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET) {
        try {
          // 1. Upload to S3
          const s3Url = await this.s3Service.uploadKycDocument(file);

          // 2. Delete the local staging file to save server space
          try { unlinkSync(file.path); } catch (e) { console.error('Failed to delete temp file', e); }

          // 3. Return the cloud URL for the database
          return s3Url;
        } catch (error: any) {
          console.warn(`⚠️ S3 Upload failed, falling back to local storage:`, error.message);
          return `/uploads/${file.filename}`;
        }
      } else {
        // LOCAL MODE: Keys are missing. Keep the file in ./uploads
        return `/uploads/${file.filename}`;
      }
    }));
  }

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

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone || null,
          passwordHash: hashedPassword,
          role: Role.CUSTOMER,
          isEmailVerified: false, // Requires OTP verification
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const fields = error?.meta?.target as string[];
      
        if (fields?.includes('email')) {
          throw new BadRequestException('This email is already registered. Please use a different email.');
        }
        if (fields?.includes('phone')) {
          throw new BadRequestException('This mobile number is already registered. Please use a different number.');
        }
        if (fields?.includes('username')) {
          throw new BadRequestException('This username is already taken. Please choose a different username.');
        }
        if (fields?.includes('docNumberHash')) {
          throw new BadRequestException('This document has already been registered. Please use a different document.');
        }
        throw new BadRequestException('An account with these details already exists.');
      }
      
      // For ALL other unknown errors — never expose error.message
      throw new BadRequestException('Registration failed. Please check your details and try again.');
    }

    // Create customer profile with preferred city
    if (dto.preferredCity) {
      await this.prisma.customerProfile.create({
        data: {
          userId: user.id,
          preferredCity: dto.preferredCity,
        },
      });
    }

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
    files: {
      venueImages?: Express.Multer.File[];
      kycDocFiles?: Express.Multer.File[];
      venueGovtCertificateFiles?: Express.Multer.File[];
    } = {},
  ) {
    // Process file uploads: S3 if AWS keys present, local otherwise
    const venueImageUrls = await this.processUploads(files.venueImages || []);
    const kycDocUrls = await this.processUploads(files.kycDocFiles || []);
    const govtCertUrls = await this.processUploads(files.venueGovtCertificateFiles || []);

    // Extract KYC info from DTO
    const kycDocUrl = kycDocUrls[0];
    const kycDocType = dto.kycDocType;
    const kycDocNumber = dto.kycDocNumber;

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
          address: dto.address || 'Address to be updated by owner',
          pincode: dto.pincode || '000000',
          capacityMin: dto.capacityMin || 100,
          capacityMax: dto.capacityMax || 500,
          basePriceMorning: dto.basePriceMorning || 0,
          basePriceEvening: dto.basePriceEvening || 0,
          basePriceFullDay: dto.basePriceFullDay || 0,
          status: 'PENDING_APPROVAL',
          venueImages: venueImageUrls, // Save venue images
          kycDocType: kycDocType,
          kycDocNumber: kycDocNumber,
           kycDocFiles: kycDocUrls || [],
           venueGovtCertificateFiles: govtCertUrls || [], // Trade License (MANDATORY)
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
    
    // Use transaction to ensure atomicity - if venue creation fails, user creation also rolls back
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
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
       // Create venue profile
  await tx.venue.create({
    data: {
      ownerId: user.id,
      username: dto.name,
      name: dto.venueName,
      type: dto.venueType as any,
      description: dto.description,
      city: dto.city,
      area: dto.area,
      address: dto.address || 'Address to be updated by owner',
      pincode: dto.pincode || '000000',
      capacityMin: dto.capacityMin || 100,
      capacityMax: dto.capacityMax || 500,
      basePriceMorning: dto.basePriceMorning || 0,
      basePriceEvening: dto.basePriceEvening || 0,
      basePriceFullDay: dto.basePriceFullDay || 0,
      status: 'PENDING_APPROVAL',

      venueImages: venueImageUrls || [],
      kycDocType: kycDocType,
      kycDocNumber: kycDocNumber,
      kycDocFiles: kycDocUrls || [],
      venueGovtCertificateFiles: govtCertUrls || [],
    },
  });
    } catch (error: any) {
      console.error('Venue creation error:', error.message);
      // Continue anyway - user is created
    }

        // Create KYC documents if provided (support 1-5 images)
        if (kycDocUrls && kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
          for (const docUrl of kycDocUrls) {
            await tx.kycDocument.create({
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
        }

        return user;
      });

      return {
        user: {
          id: result.id,
          name: result.name,
          email: result.email,
          role: result.role,
          isEmailVerified: false,
        },
        requiresOtp: true,
        message: 'Registration successful. Please verify your email with OTP.',
      };
    } catch (error: any) {
      console.error('Venue owner registration failed:', error.message);
      if (error?.code === 'P2002') {
        const fields = error?.meta?.target as string[];
      
        if (fields?.includes('email')) {
          throw new BadRequestException('This email is already registered. Please use a different email.');
        }
        if (fields?.includes('phone')) {
          throw new BadRequestException('This mobile number is already registered. Please use a different number.');
        }
        if (fields?.includes('username')) {
          throw new BadRequestException('This username is already taken. Please choose a different username.');
        }
        if (fields?.includes('docNumberHash')) {
          throw new BadRequestException('This document has already been registered. Please use a different document.');
        }
        throw new BadRequestException('An account with these details already exists.');
      }
      
      // For ALL other unknown errors — never expose error.message
      throw new BadRequestException('Registration failed. Please check your details and try again.');
    }
  }

  // 🏪 VENDOR registration - requires OTP verification
  // Allows same email as VENUE_OWNER (user can have both businesses)
  async registerVendor(
    dto: VendorRegisterDto,
    files: {
      businessImages?: Express.Multer.File[];
      kycDocFiles?: Express.Multer.File[];
      foodLicenseFiles?: Express.Multer.File[];
    } = {},
  ) {
    // Process file uploads: S3 if AWS keys present, local otherwise
    const businessImageUrls = await this.processUploads(files.businessImages || []);
    const kycDocUrls = await this.processUploads(files.kycDocFiles || []);
    const foodLicenseUrls = await this.processUploads(files.foodLicenseFiles || []);

    // Extract KYC info from DTO
    const kycDocUrl = kycDocUrls[0];
    const kycDocType = dto.kycDocType;
    const kycDocNumber = dto.kycDocNumber;
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
          businessType: dto.businessType,
          description: dto.description,
          city: dto.city,
          area: dto.area,
          phone: dto.phone,
          serviceRadiusKm: dto.serviceRadiusKm || 50,
          verificationStatus: 'PENDING',
          businessImages: businessImageUrls, // Save business images
          kycDocType: kycDocType,
          kycDocNumber: kycDocNumber,
          kycDocFiles: kycDocUrls || [],
          foodLicenseFiles: dto.businessType === 'CATERING' ? foodLicenseUrls : [], // FSSAI (CONDITIONAL)
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

      // Generate token for auto-login after registration
      const token = this.jwtService.sign({ userId: existingUser.id, role: existingUser.role });

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
        token,
        requiresOtp: !existingUser.isEmailVerified,
        message: 'Vendor profile added successfully. Please verify your email with OTP.',
      };
    }

    // Create new user with VENDOR role
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    // Use transaction to ensure atomicity - if any step fails, everything rolls back
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            name: dto.name,
            email: dto.email,
            passwordHash: hashedPassword,
            role: Role.VENDOR,
            isEmailVerified: false,
          },
        });

        // Create vendor profile
        const vendor = await tx.vendor.create({
          data: {
            userId: user.id,
            username: dto.name, // Store username for vendor-specific login
            businessName: dto.businessName,
            businessType: dto.businessType,
            description: dto.description,
            city: dto.city,
            area: dto.area,
            phone: dto.phone,
            serviceRadiusKm: dto.serviceRadiusKm || 50,
            verificationStatus: 'PENDING',
            businessImages: businessImageUrls, // Save business images
            kycDocType: kycDocType,
            kycDocNumber: kycDocNumber,
            kycDocFiles: kycDocUrls || [],
            foodLicenseFiles: dto.businessType === 'CATERING' ? foodLicenseUrls : [], // FSSAI (CONDITIONAL)
          },
        });

        // Create KYC documents if provided (support 1-5 images)
        if (kycDocUrls && kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
          for (const docUrl of kycDocUrls) {
            await tx.kycDocument.create({
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
        }

        // Create initial vendor service with registration details
        await tx.vendorService.create({
          data: {
            vendorId: vendor.id,
            name: `${dto.businessName} - ${dto.businessType}`,
            serviceType: dto.businessType as any,
            baseRate: dto.basePrice || 50000, // Use provided base price or default
            pricingModel: (dto.pricingModel as any) || 'PER_EVENT',
            minGuests: dto.minGuests || null,
            maxGuests: dto.maxGuests || null,
            description: dto.description || null,
            inclusions: dto.inclusions || null,
            exclusions: dto.exclusions || null,
            isActive: true,
          },
        });

        return { user, vendor };
      });

      // Generate token for auto-login after registration
      const token = this.jwtService.sign({ userId: result.user.id, role: result.user.role });

      return {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          isEmailVerified: false,
        },
        token,
        requiresOtp: true,
        message: 'Registration successful. Please verify your email with OTP.',
      };
    } catch (error: any) {
      console.error('Vendor registration failed:', error.message);
      if (error?.code === 'P2002') {
        const fields = error?.meta?.target as string[];
      
        if (fields?.includes('email')) {
          throw new BadRequestException('This email is already registered. Please use a different email.');
        }
        if (fields?.includes('phone')) {
          throw new BadRequestException('This mobile number is already registered. Please use a different number.');
        }
        if (fields?.includes('username')) {
          throw new BadRequestException('This username is already taken. Please choose a different username.');
        }
        if (fields?.includes('docNumberHash')) {
          throw new BadRequestException('This document has already been registered. Please use a different document.');
        }
        throw new BadRequestException('An account with these details already exists.');
      }
      
      // For ALL other unknown errors — never expose error.message
      throw new BadRequestException('Registration failed. Please check your details and try again.');
    }
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

    // Store refresh token in database
    await this.prisma.refreshToken.create({
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

  // 🔑 FORGOT PASSWORD - Generate 6-digit OTP and send via email
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address. Please check for typos or create a new account.');
    }

    // Generate 6-digit OTP (strictly formatted as string)
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Hash the OTP using bcrypt before storing
    const otpHash = await bcrypt.hash(plainOtp, 10);

    // Store hashed OTP in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: otpHash, // Stored as bcrypt hash
        passwordResetExpiry: otpExpiry,
      },
    });

    // Always log OTP to terminal for debugging
    console.log('\n=========================================');
    console.log(`🔐 Password Reset OTP for ${user.email}: ${plainOtp}`);
    console.log('=========================================\n');
    
    // Send OTP via email directly (bypass OtpService to avoid split brain)
    try {
      await this.emailProvider.send(
        dto.email,
        'NearZro - Password Reset OTP',
        `Your password reset OTP is: ${plainOtp}. It is valid for 15 minutes. Do not share this code with anyone.`,
        `<!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px; }
              .container { max-width: 500px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 32px; }
              .otp { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff; text-align: center; margin: 24px 0; }
              .footer { color: #888; font-size: 12px; margin-top: 24px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 style="color: #ffffff; margin-bottom: 8px;">NearZro Password Reset</h2>
              <p style="color: #cccccc;">Your verification code is:</p>
              <div class="otp">${plainOtp}</div>
              <p style="color: #cccccc;">This code expires in 15 minutes.</p>
              <div class="footer">
                If you didn't request this, please ignore this email.
              </div>
            </div>
          </body>
        </html>`
      );
    } catch (error) {
      // In development, still allow the flow
      if (process.env.NODE_ENV !== 'development') {
        throw error;
      }
      // Email failed, but OTP is still logged above in DEV mode
    }

    return { 
      success: true, 
      message: 'If an account exists with this email, you will receive a password reset OTP.' 
    };
  }

  // 🔑 VERIFY RESET OTP - Verify the 6-digit OTP
  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordResetToken || !user.passwordResetExpiry) {
      return { valid: false, message: 'Invalid or expired OTP' };
    }

    // Check if OTP has expired FIRST
    if (user.passwordResetExpiry < new Date()) {
      // Clear expired OTP
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });
      return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    // Clean and verify the incoming OTP using bcrypt.compare
    const cleanOtp = String(dto.otp).trim();
    const isValid = await bcrypt.compare(cleanOtp, user.passwordResetToken);

    if (!isValid) {
      return { valid: false, message: 'Invalid OTP' };
    }

    return { valid: true, message: 'OTP verified successfully' };
  }

  // 🔑 RESET PASSWORD - Reset password using verified OTP
  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!passwordRegex.test(dto.newPassword)) {
      throw new BadRequestException('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordResetToken || !user.passwordResetExpiry) {
      throw new BadRequestException('Invalid or expired OTP. Please start the password reset process again.');
    }

    // Check if OTP has expired FIRST
    if (user.passwordResetExpiry < new Date()) {
      // Clear expired OTP
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Clean and verify the incoming OTP using bcrypt.compare
    const cleanOtp = String(dto.otp).trim();
    const isValid = await bcrypt.compare(cleanOtp, user.passwordResetToken);

    if (!isValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    // Update user password and clear reset OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    // Invalidate all existing sessions (revoke all refresh tokens)
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });

    // Log audit event (optional: integrate with audit service)
    console.log(`🔐 Password reset completed for user ${user.id} (${user.email}) at`, new Date().toISOString());

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
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() }
    });
    return !!user;
  }

  // 📱 Check if phone exists (for registration validation)
  async checkPhoneExists(phone: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { phone: phone.trim() }
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
   * Supports role-aware OAuth for VENDOR and VENUE_OWNER roles
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
    intendedRole?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    user: {
      id: number;
      email: string | null;
      name: string | null;
      role: Role;
    };
  }> {
    console.log('🔍 handleOAuthLogin called with:', JSON.stringify({ oauthUser, provider, intendedRole }, null, 2));
    
    const isGoogle = provider === 'google';
    const oauthId = isGoogle ? oauthUser.googleId : oauthUser.facebookId;

    if (!oauthId) {
      console.log('⚠️ Invalid OAuth profile data - no oauthId');
      throw new BadRequestException(`Invalid ${provider} profile data`);
    }

    // Validate intendedRole if provided
    const validRoles = ['CUSTOMER', 'VENDOR', 'VENUE_OWNER'];
    if (intendedRole && !validRoles.includes(intendedRole)) {
      throw new BadRequestException(`Invalid role: ${intendedRole}`);
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
      // Determine role for new user
      const userRole = intendedRole ? (intendedRole as Role) : Role.CUSTOMER;
      
      const createData = isGoogle
        ? {
            email: oauthUser.email,
            name: oauthUser.name,
            googleId: oauthId,
            role: userRole,
            passwordHash: null,
            isEmailVerified: true,
          }
        : {
            email: oauthUser.email,
            name: oauthUser.name,
            facebookId: oauthId,
            role: userRole,
            passwordHash: null,
            isEmailVerified: true,
          };

      user = await this.prisma.user.create({
        data: createData,
        include: { vendor: true, venues: true },
      });

       // Create stub profiles based on role
       if (userRole === Role.VENDOR) {
         // Create a pending vendor profile stub
         await this.prisma.vendor.create({
           data: {
             userId: user.id,
             businessName: `${oauthUser.name}'s Business`,
             city: 'TBD',
             area: 'TBD',
           },
         });
       } else if (userRole === Role.VENUE_OWNER) {
         // Create a pending venue profile stub
         await this.prisma.venue.create({
           data: {
             ownerId: user.id,
             name: `${oauthUser.name}'s Venue`,
             type: 'OTHER',
             address: 'TBD',
             city: 'TBD',
             area: 'TBD',
             pincode: '000000',
             capacityMin: 100,
             capacityMax: 500,
             status: 'PENDING_APPROVAL',
           },
         });
       }
    } else {
      // User exists - check for role collision
      if (intendedRole) {
        const existingRole = user.role;
        
        // If user's existing role doesn't match intended role, throw error
        // Exception: Allow VENDOR and VENUE_OWNER to coexist (user can have both businesses)
        if (existingRole !== intendedRole as Role) {
          // Check if user is trying to add a second business type
          const hasVendor = !!user.vendor;
          const hasVenue = user.venues && user.venues.length > 0;
          
          if (intendedRole === 'VENDOR' && !hasVendor) {
            // User is VENUE_OWNER or CUSTOMER, wants to add VENDOR profile
            // This is allowed - create vendor stub
            await this.prisma.vendor.create({
              data: {
                userId: user.id,
                businessName: `${oauthUser.name}'s Business`,
                city: 'TBD',
                area: 'TBD',
                verificationStatus: 'PENDING',
              },
            });
            console.log('✅ Created vendor stub for existing user:', user.id);
          } else if (intendedRole === 'VENUE_OWNER' && !hasVenue) {
            // User is VENDOR or CUSTOMER, wants to add VENUE_OWNER profile
            // This is allowed - create venue stub
            await this.prisma.venue.create({
              data: {
                ownerId: user.id,
                name: `${oauthUser.name}'s Venue`,
                type: 'HALL',
                address: 'TBD',
                city: 'TBD',
                area: 'TBD',
                pincode: '000000',
                capacityMin: 100,
                capacityMax: 500,
                status: 'PENDING_APPROVAL',
              },
            });
            console.log('✅ Created venue stub for existing user:', user.id);
          } else if (intendedRole === 'CUSTOMER' && existingRole !== Role.CUSTOMER) {
            // Non-customer trying to login as CUSTOMER - this is allowed
            // They can access customer features with their existing role
          } else {
            // Role collision - user already has this business type
            throw new ForbiddenException(
              `You already have a ${existingRole} account. Please use the correct portal or create a separate account.`
            );
          }
        }
      }
    }

    // Check if user is active
    if (!user!.isActive) {
      // Send email notification about deactivated account
      try {
        await this.emailProvider.send(
          user!.email!,
          'Your Account Has Been Deactivated',
          `Dear ${user!.name},\n\nWe noticed you tried to sign in to your NearZro account. Your account has been deactivated by an administrator.\n\nIf you believe this is an error or would like to have your account reactivated, please contact our support team.\n\nBest regards,\nThe NearZro Team`,
          `<h2>Account Deactivated</h2><p>Dear ${user!.name},</p><p>We noticed you tried to sign in to your NearZro account. <strong>Your account has been deactivated by an administrator.</strong></p><p>If you believe this is an error or would like to have your account reactivated, please contact our support team.</p><p>Best regards,<br>The NearZro Team</p>`
        );
        console.log('📧 Deactivation notification email sent to:', user!.email!);
      } catch (error) {
        console.warn('⚠️ Failed to send deactivation notification email:', error);
      }

      throw new UnauthorizedException('Your account has been deactivated. Please contact an administrator to reactivate your account.');
    }

    // Get vendor and venues if not loaded
    const vendor = user!.vendor || await this.prisma.vendor.findUnique({ where: { userId: user!.id } });
    const venues = user!.venues || await this.prisma.venue.findMany({ where: { ownerId: user!.id } });

    // Use the intendedRole if defined, otherwise default to user.role
    const finalRole = intendedRole ? (intendedRole as Role) : user!.role;

    // Generate tokens
    const tokens = await this.generateTokens({
      id: user!.id,
      email: user!.email!,
      role: finalRole,
      hasVendorProfile: !!vendor,
      hasVenueProfile: venues.length > 0,
    });

    // Return both tokens and user data
    return {
      ...tokens,
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        role: finalRole,
      }
    };
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
   * Get user profile with fresh role from database (not from JWT token)
   * This ensures role changes are reflected immediately without re-login
   */
  async getUserProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Hash password reset token before storing (security improvement)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Note: Account lockout features (failedLoginAttempts, lockedUntil)
  // have been removed to match the original database schema
}
