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
import { DatabaseStorageService } from '../storage/database-storage.service';
import { unlinkSync } from 'fs';
import { EmailProvider } from '../notifications/providers/email.provider';

// Constants for security configuration
const BCRYPT_ROUNDS = 12; // Higher security
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private configService: ConfigService,
    private s3Service: S3Service,
    private databaseStorageService: DatabaseStorageService,
    private emailProvider: EmailProvider,
  ) {}

  /**
   * Hybrid Staging Pattern: Upload files to S3 if AWS keys exist, otherwise store as Base64 in DB
   * Supports both disk-based and memory-based file objects
   */
  private async processUploads(uploadedFiles: Express.Multer.File[]): Promise<string[]> {
    if (!uploadedFiles || uploadedFiles.length === 0) return [];

    return await Promise.all(uploadedFiles.map(async (file) => {
      // Check if production AWS keys exist in the environment
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET) {
        try {
          // 1. Upload to S3
          const s3Url = await this.s3Service.uploadKycDocument(file);

          // 2. Delete the local staging file to save server space (if it exists on disk)
          if (file.path) {
            try { unlinkSync(file.path); } catch (e) { /* ignore cleanup errors */ }
          }

          // 3. Return the cloud URL for the database
          return s3Url;
        } catch (error: any) {
          console.warn(`⚠️ S3 Upload failed, falling back to database storage:`, error.message);
          return await this.databaseStorageService.storeFile(file);
        }
      } else {
        // LOCAL/POSTGRES MODE: Keys are missing. Store file as Base64 data URL in database.
        return await this.databaseStorageService.storeFile(file);
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
  async registerVenueOwner(
    dto: VenueOwnerRegisterDto,
    files: {
      venueImages?: Express.Multer.File[];
      kycDocFiles?: Express.Multer.File[];
      venueGovtCertificateFiles?: Express.Multer.File[];
    } = {},
  ) {
    const venueImageUrls = await this.processUploads(files.venueImages || []);
    const kycDocUrls = await this.processUploads(files.kycDocFiles || []);
    const govtCertUrls = await this.processUploads(files.venueGovtCertificateFiles || []);

    const kycDocType = dto.kycDocType;
    const kycDocNumber = dto.kycDocNumber;

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { venues: true, vendor: true },
    });

    const existingVenueByUsername = await this.prisma.venue.findFirst({
      where: { username: dto.name },
    });

    if (existingVenueByUsername) {
      throw new BadRequestException('Username already taken. Please choose a different username.');
    }

    if (existingUser && existingUser.venues.length > 0) {
      throw new BadRequestException('Email already registered as Venue Owner');
    }

    // Existing User upgrading to Venue Owner
    if (existingUser) {
      if (existingUser.passwordHash) {
        const isPasswordValid = await bcrypt.compare(dto.password, existingUser.passwordHash);
        if (!isPasswordValid) {
          throw new BadRequestException('Password does not match existing account');
        }
      } else {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { passwordHash: hashedPassword },
        });
      }

      const venue = await this.prisma.venue.create({
        data: {
          ownerId: existingUser.id,
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
          venueImages: venueImageUrls,
          kycDocType: kycDocType,
          kycDocNumber: kycDocNumber,
          kycDocFiles: kycDocUrls || [],
          venueGovtCertificateFiles: govtCertUrls || [], 
          photos: {
            create: venueImageUrls.map((url, index) => ({
              url,
              isCover: index === 0,
              category: 'MAIN' as any,
            })),
          },
        },
      });

      if (kycDocUrls && kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
        try {
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
          if (error.code !== 'P2002') console.error('KYC creation error:', error.message);
        }
      }

      return {
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          isEmailVerified: existingUser.isEmailVerified,
          hasVendorProfile: !!existingUser.vendor,
          hasVenueProfile: true,
        },
        requiresOtp: !existingUser.isEmailVerified,
        message: 'Venue added successfully. Please verify your email with OTP.',
      };
    }

    // Create NEW user with VENUE_OWNER role
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: dto.name,
            email: dto.email,
            passwordHash: hashedPassword,
            role: Role.VENUE_OWNER,
            isEmailVerified: false,
          },
        });

        try {
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
              photos: {
                create: venueImageUrls.map((url, index) => ({
                  url,
                  isCover: index === 0,
                  category: 'MAIN' as any,
                })),
              },
            },
          });
        } catch (error: any) {
          console.error('Venue creation error:', error.message);
        }

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
        if (fields?.includes('email')) throw new BadRequestException('This email is already registered.');
        if (fields?.includes('phone')) throw new BadRequestException('This mobile number is already registered.');
        if (fields?.includes('username')) throw new BadRequestException('This username is already taken.');
        if (fields?.includes('docNumberHash')) throw new BadRequestException('This document has already been registered.');
        throw new BadRequestException('An account with these details already exists.');
      }
      throw new BadRequestException('Registration failed. Please check your details and try again.');
    }
  }

  // 🏪 VENDOR registration - requires OTP verification
  async registerVendor(
    dto: VendorRegisterDto,
    files: {
      businessImages?: Express.Multer.File[];
      kycDocFiles?: Express.Multer.File[];
      foodLicenseFiles?: Express.Multer.File[];
    } = {},
  ) {
    const businessImageUrls = await this.processUploads(files.businessImages || []);
    const kycDocUrls = await this.processUploads(files.kycDocFiles || []);
    const foodLicenseUrls = await this.processUploads(files.foodLicenseFiles || []);

    const kycDocType = dto.kycDocType;
    const kycDocNumber = dto.kycDocNumber;

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { vendor: true, venues: true },
    });

    const existingVendorByUsername = await this.prisma.vendor.findUnique({
      where: { username: dto.name },
    });

    if (existingVendorByUsername) {
      throw new BadRequestException('Username already taken. Please choose a different username.');
    }

    if (existingUser && existingUser.vendor) {
      throw new BadRequestException('Email already registered as Vendor');
    }

    // Existing User upgrading to Vendor
    if (existingUser) {
      if (existingUser.passwordHash) {
        const isPasswordValid = await bcrypt.compare(dto.password, existingUser.passwordHash);
        if (!isPasswordValid) throw new BadRequestException('Password does not match existing account');
      } else {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { passwordHash: hashedPassword },
        });
      }

      const vendor = await this.prisma.vendor.create({
        data: {
          userId: existingUser.id,
          username: dto.name,
          businessName: dto.businessName,
          businessType: dto.businessType,
          description: dto.description,
          city: dto.city,
          area: dto.area,
          phone: dto.phone,
          serviceRadiusKm: dto.serviceRadiusKm || 50,
          verificationStatus: 'PENDING',
          businessImages: businessImageUrls,
          kycDocType: kycDocType,
          kycDocNumber: kycDocNumber,
          kycDocFiles: kycDocUrls || [],
          foodLicenseFiles: dto.businessType === 'CATERING' ? foodLicenseUrls : [],
          portfolioImages: {
            create: businessImageUrls.map((url, index) => ({
              imageUrl: url,
              isCover: index === 0,
              category: 'WORK_SAMPLE' as any,
            })),
          },
        },
      });

      if (kycDocUrls && kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
        try {
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
          if (error.code !== 'P2002') console.error('KYC creation error:', error.message);
        }
      }

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

      const token = this.jwtService.sign({ userId: existingUser.id, role: existingUser.role });

      return {
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          isEmailVerified: existingUser.isEmailVerified,
          hasVendorProfile: true,
          hasVenueProfile: existingUser.venues && existingUser.venues.length > 0,
        },
        token,
        requiresOtp: !existingUser.isEmailVerified,
        message: 'Vendor profile added successfully. Please verify your email with OTP.',
      };
    }

    // Create NEW user with VENDOR role
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: dto.name,
            email: dto.email,
            passwordHash: hashedPassword,
            role: Role.VENDOR,
            isEmailVerified: false,
          },
        });

        const vendor = await tx.vendor.create({
          data: {
            userId: user.id,
            username: dto.name,
            businessName: dto.businessName,
            businessType: dto.businessType,
            description: dto.description,
            city: dto.city,
            area: dto.area,
            phone: dto.phone,
            serviceRadiusKm: dto.serviceRadiusKm || 50,
            verificationStatus: 'PENDING',
            businessImages: businessImageUrls,
            kycDocType: kycDocType,
            kycDocNumber: kycDocNumber,
            kycDocFiles: kycDocUrls || [],
            foodLicenseFiles: dto.businessType === 'CATERING' ? foodLicenseUrls : [],
            portfolioImages: {
              create: businessImageUrls.map((url, index) => ({
                imageUrl: url,
                isCover: index === 0,
                category: 'WORK_SAMPLE' as any,
              })),
            },
          },
        });

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

        await tx.vendorService.create({
          data: {
            vendorId: vendor.id,
            name: `${dto.businessName} - ${dto.businessType}`,
            serviceType: dto.businessType as any,
            baseRate: dto.basePrice || 50000,
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
        if (fields?.includes('email')) throw new BadRequestException('This email is already registered.');
        if (fields?.includes('phone')) throw new BadRequestException('This mobile number is already registered.');
        if (fields?.includes('username')) throw new BadRequestException('This username is already taken.');
        if (fields?.includes('docNumberHash')) throw new BadRequestException('This document has already been registered.');
        throw new BadRequestException('An account with these details already exists.');
      }
      throw new BadRequestException('Registration failed. Please check your details and try again.');
    }
  }


  // 🔐 Login
  async login(dto: LoginDto) {
    let user: any;
    let loginRole: 'email' | 'vendor_username' | 'venue_username' | 'user_name' = 'email';

    user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { vendor: true, venues: true },
    });

    if (!user) {
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
      user = await this.prisma.user.findFirst({
        where: { name: dto.email },
        include: { vendor: true, venues: true },
      });
      if (user) loginRole = 'user_name';
    }

    if (!user) throw new BadRequestException('Invalid email/username or password');
    if (!user.passwordHash) throw new BadRequestException('Please login using Google or Facebook to access your account');
    if (!user.isActive) throw new ForbiddenException('User inactive');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new BadRequestException('Invalid email/username or password');

    const hasVendorProfile = !!user.vendor;
    const hasVenueProfile = user.venues && user.venues.length > 0;
    let effectiveRole = user.role;

    if (loginRole === 'vendor_username') {
      effectiveRole = Role.VENDOR;
    } else if (loginRole === 'venue_username') {
      effectiveRole = Role.VENUE_OWNER;
    } else if (hasVendorProfile && hasVenueProfile) {
      const vendorCreatedAt = user.vendor.createdAt;
      const firstVenueCreatedAt = user.venues[0]?.createdAt;
      if (vendorCreatedAt < firstVenueCreatedAt) effectiveRole = Role.VENDOR;
      else effectiveRole = Role.VENUE_OWNER;
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: effectiveRole,
      hasVendorProfile,
      hasVenueProfile,
    };

    let displayName = user.name;
    if (loginRole === 'vendor_username' && user.vendor) {
      displayName = user.vendor.username || user.name;
    } else if (loginRole === 'venue_username' && user.venues && user.venues.length > 0) {
      const loggedVenue = user.venues.find((v: any) => v.username === dto.email);
      displayName = loggedVenue?.username || user.venues[0]?.username || user.name;
    }

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

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
        image: user.image, // NEW: Returns profile image
      },
      token: this.jwtService.sign(payload),
      refreshToken,
    };
  }

  // 🔑 OAuth flows (Google & Facebook handled by handleOAuthLogin below)
  async googleLogin(googleUser: any) { return this.handleOAuthLogin(googleUser, 'google'); }
  async facebookLogin(facebookUser: any) { return this.handleOAuthLogin(facebookUser, 'facebook'); }

  // 🔑 FORGOT PASSWORD
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address.');
    }

    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); 
    const otpHash = await bcrypt.hash(plainOtp, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: otpHash, 
        passwordResetExpiry: otpExpiry,
      },
    });

    try {
      await this.emailProvider.send(
        dto.email,
        'NearZro - Password Reset OTP',
        `Your password reset OTP is: ${plainOtp}. It is valid for 15 minutes.`,
        `<h2>NearZro Password Reset</h2><p>Your OTP is: <strong>${plainOtp}</strong></p>`
      );
    } catch (error) {
      if (process.env.NODE_ENV !== 'development') throw error;
    }

    return { success: true, message: 'OTP sent successfully.' };
  }

  // 🔑 VERIFY RESET OTP
  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.passwordResetToken || !user.passwordResetExpiry) {
      return { valid: false, message: 'Invalid or expired OTP' };
    }

    if (user.passwordResetExpiry < new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: null, passwordResetExpiry: null },
      });
      return { valid: false, message: 'OTP has expired.' };
    }

    const isValid = await bcrypt.compare(String(dto.otp).trim(), user.passwordResetToken);
    if (!isValid) return { valid: false, message: 'Invalid OTP' };

    return { valid: true, message: 'OTP verified successfully' };
  }

  // 🔑 RESET PASSWORD
  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) throw new BadRequestException('Passwords do not match');

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!passwordRegex.test(dto.newPassword)) throw new BadRequestException('Weak password');

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordResetToken || !user.passwordResetExpiry) throw new BadRequestException('Invalid OTP flow');

    if (user.passwordResetExpiry < new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: null, passwordResetExpiry: null },
      });
      throw new BadRequestException('OTP has expired.');
    }

    const isValid = await bcrypt.compare(String(dto.otp).trim(), user.passwordResetToken);
    if (!isValid) throw new BadRequestException('Invalid OTP');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });

    return { success: true, message: 'Password reset successfully.' };
  }

   async sendOtp(email: string, phone?: string, ip?: string) { return this.otpService.sendOtp(email, phone, ip); }
  async verifyOtp(email: string, otp: string) { return this.otpService.verifyOtp(email, otp); }

  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({ where: { email: email.toLowerCase().trim() } });
    return !!user;
  }

  async checkPhoneExists(phone: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({ where: { phone: phone.trim() } });
    return !!user;
  }

  // ============================================
  // SECURITY IMPROVEMENTS
  // ============================================

  async generateTokens(user: { id: number; email: string; role: Role; hasVendorProfile?: boolean; hasVenueProfile?: boolean }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hasVendorProfile: user.hasVendorProfile || false,
      hasVenueProfile: user.hasVenueProfile || false,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const prismaAny = this.prisma as any;
    await prismaAny.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt: refreshTokenExpiry,
        deviceInfo: 'oauth',
      },
    });

    return { accessToken, refreshToken, expiresIn: 900, tokenType: 'Bearer' };
  }

  async handleOAuthLogin(oauthUser: any, provider: 'google' | 'facebook', intendedRole?: string) {
    const isGoogle = provider === 'google';
    const oauthId = isGoogle ? oauthUser.googleId : oauthUser.facebookId;

    if (!oauthId) throw new BadRequestException(`Invalid ${provider} profile data`);

    let user = isGoogle
      ? await this.prisma.user.findUnique({ where: { googleId: oauthId }, include: { vendor: true, venues: true } })
      : await this.prisma.user.findUnique({ where: { facebookId: oauthId }, include: { vendor: true, venues: true } });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: oauthUser.email },
        include: { vendor: true, venues: true },
      });

      if (user) {
        const updateData = isGoogle ? { googleId: oauthId } : { facebookId: oauthId };
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: { vendor: true, venues: true },
        });
      }
    }

    if (!user) {
      const userRole = intendedRole ? (intendedRole as Role) : Role.CUSTOMER;
      const createData = isGoogle
        ? { email: oauthUser.email, name: oauthUser.name, googleId: oauthId, role: userRole, passwordHash: null, isEmailVerified: true }
        : { email: oauthUser.email, name: oauthUser.name, facebookId: oauthId, role: userRole, passwordHash: null, isEmailVerified: true };

      user = await this.prisma.user.create({
        data: createData,
        include: { vendor: true, venues: true },
      });

      if (userRole === Role.VENDOR) {
        await this.prisma.vendor.create({
          data: { userId: user.id, businessName: `${oauthUser.name}'s Business`, city: 'TBD', area: 'TBD' },
        });
      } else if (userRole === Role.VENUE_OWNER) {
        await this.prisma.venue.create({
          data: { ownerId: user.id, name: `${oauthUser.name}'s Venue`, type: 'OTHER', address: 'TBD', city: 'TBD', area: 'TBD', pincode: '000000', capacityMin: 100, capacityMax: 500, status: 'PENDING_APPROVAL' },
        });
      }
    }

    if (!user.isActive) throw new UnauthorizedException('Your account has been deactivated.');

    const vendor = user.vendor || await this.prisma.vendor.findUnique({ where: { userId: user.id } });
    const venues = user.venues || await this.prisma.venue.findMany({ where: { ownerId: user.id } });

    const finalRole = intendedRole ? (intendedRole as Role) : user.role;

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email!,
      role: finalRole,
      hasVendorProfile: !!vendor,
      hasVenueProfile: venues.length > 0,
    });

    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: finalRole } };
  }

  async refreshToken(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { token: tokenHash, expiresAt: { gte: new Date() }, revoked: false },
      include: { user: true },
    });

    if (!storedToken || !storedToken.user) throw new UnauthorizedException('Invalid or expired refresh token');

    const user = storedToken.user;
    const vendor = await this.prisma.vendor.findUnique({ where: { userId: user.id } });
    const venues = await this.prisma.venue.findMany({ where: { ownerId: user.id } }) || [];

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    return this.generateTokens({
      id: user.id,
      email: user.email!,
      role: user.role,
      hasVendorProfile: !!vendor,
      hasVenueProfile: venues.length > 0,
    });
  }

  async revokeAllUserTokens(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  async revokeToken(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { token: tokenHash, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

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
        image: true, // NEW: Returns profile image
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}