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
import { Role } from '@prisma/client'; // Use Prisma Role everywhere
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
  ) { }

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

  // 👤 CUSTOMER registration
  async register(dto: RegisterDto) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) throw new BadRequestException('Invalid email format');

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!strongPassword.test(dto.password)) throw new BadRequestException('Weak password');

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone || null,
          passwordHash: hashedPassword,
          role: Role.CUSTOMER,
          isEmailVerified: false,
        },
      });
    } catch (error: any) {
      throw new BadRequestException('Registration failed.');
    }

    if (dto.preferredCity) {
      await this.prisma.customerProfile.create({
        data: { userId: user.id, preferredCity: dto.preferredCity },
      });
    }

    await this.otpService.sendOtp(user.email!, undefined);

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isEmailVerified: false },
      requiresOtp: true,
      message: 'Registration successful. Please verify your email with OTP.',
    };
  }

  // 👑 ADMIN registration
  async registerAdmin(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        role: Role.ADMIN,
        isEmailVerified: true,
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isEmailVerified: true },
      token: this.jwtService.sign(payload),
      message: 'Admin account created successfully',
    };
  }

  // 🏢 VENUE OWNER registration
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

    if (existingUser && existingUser.venues.length > 0) throw new BadRequestException('Email already registered as Venue Owner');

    if (existingUser) {
      if (existingUser.passwordHash) {
        const isPasswordValid = await bcrypt.compare(dto.password, existingUser.passwordHash);
        if (!isPasswordValid) throw new BadRequestException('Password mismatch');
      }

      // Upgrade role
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { role: Role.VENUE_OWNER },
      });

      await this.prisma.venue.create({
        data: {
          ownerId: existingUser.id,
          username: dto.name,
          name: dto.venueName,
          type: dto.venueType as any,
          description: dto.description,
          city: dto.city,
          area: dto.area,
          address: dto.address || 'Address TBD',
          pincode: dto.pincode || '000000',
          capacityMin: dto.capacityMin || 100,
          capacityMax: dto.capacityMax || 500,
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

      if (kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
        await this.prisma.kycDocument.create({
          data: {
            userId: existingUser.id,
            docType: kycDocType as any,
            docNumber: kycDocNumber,
            docNumberHash: crypto.createHash('sha256').update(kycDocNumber).digest('hex'),
            docFileUrl: kycDocUrls[0],
            status: 'PENDING',
          },
        }).catch(() => {});
      }

      return { user: { id: existingUser.id, email: existingUser.email, role: Role.VENUE_OWNER, hasVenueProfile: true }, message: 'Venue profile added.' };
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: dto.name, email: dto.email, passwordHash: hashedPassword, role: Role.VENUE_OWNER, isEmailVerified: false },
        });

        await tx.venue.create({
          data: {
            ownerId: user.id,
            username: dto.name,
            name: dto.venueName,
            type: dto.venueType as any,
            description: dto.description,
            city: dto.city,
            area: dto.area,
            address: dto.address || 'Address TBD',
            pincode: dto.pincode || '000000',
            capacityMin: dto.capacityMin || 100,
            capacityMax: dto.capacityMax || 500,
            status: 'PENDING_APPROVAL',
            venueImages: venueImageUrls,
            kycDocFiles: kycDocUrls || [],
            venueGovtCertificateFiles: govtCertUrls || [],
            photos: {
              create: venueImageUrls.map((url, index) => ({ url, isCover: index === 0, category: 'MAIN' as any })),
            },
          },
        });

        if (kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
          await tx.kycDocument.create({
            data: {
              userId: user.id,
              docType: kycDocType as any,
              docNumber: kycDocNumber,
              docNumberHash: crypto.createHash('sha256').update(kycDocNumber).digest('hex'),
              docFileUrl: kycDocUrls[0],
              status: 'PENDING',
            },
          });
        }
        return user;
      });

      await this.otpService.sendOtp(result.email!, undefined);
      return { user: { id: result.id, name: result.name, email: result.email, role: result.role, isEmailVerified: false }, requiresOtp: true, message: 'Registration successful.' };
    } catch (e) {
      throw new BadRequestException('Registration failed.');
    }
  }

  // 🏪 VENDOR registration
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
      include: { vendor: true },
    });

    if (existingUser && existingUser.vendor) throw new BadRequestException('Already registered as Vendor');

    if (existingUser) {
      if (existingUser.passwordHash) {
        const ispV = await bcrypt.compare(dto.password, existingUser.passwordHash);
        if (!ispV) throw new BadRequestException('Password mismatch');
      }

      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { role: Role.VENDOR },
      });

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
          verificationStatus: 'PENDING',
          businessImages: businessImageUrls,
          kycDocType: kycDocType,
          kycDocNumber: kycDocNumber,
          kycDocFiles: kycDocUrls || [],
          foodLicenseFiles: dto.businessType === 'CATERING' ? foodLicenseUrls : [],
          portfolioImages: {
            create: businessImageUrls.map((url, index) => ({ imageUrl: url, isCover: index === 0, category: 'WORK_SAMPLE' as any })),
          },
        },
      });

      if (kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
        await this.prisma.kycDocument.create({
          data: {
            userId: existingUser.id,
            docType: kycDocType as any,
            docNumber: kycDocNumber,
            docNumberHash: crypto.createHash('sha256').update(kycDocNumber).digest('hex'),
            docFileUrl: kycDocUrls[0],
            status: 'PENDING',
          },
        }).catch(() => {});
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

      return { user: { id: existingUser.id, email: existingUser.email, role: Role.VENDOR }, message: 'Vendor profile added.' };
    }

    const hP = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: dto.name, email: dto.email, passwordHash: hP, role: Role.VENDOR, isEmailVerified: false },
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
            verificationStatus: 'PENDING',
            businessImages: businessImageUrls,
            kycDocFiles: kycDocUrls || [],
            foodLicenseFiles: dto.businessType === 'CATERING' ? foodLicenseUrls : [],
            portfolioImages: {
              create: businessImageUrls.map((url, index) => ({ imageUrl: url, isCover: index === 0, category: 'WORK_SAMPLE' as any })),
            },
          },
        });

        await tx.vendorService.create({
          data: {
            vendorId: vendor.id,
            name: dto.businessName,
            serviceType: dto.businessType as any,
            baseRate: 50000,
            pricingModel: 'PER_EVENT',
            isActive: true,
          },
        });

        if (kycDocUrls.length > 0 && kycDocType && kycDocNumber) {
          await tx.kycDocument.create({
            data: {
              userId: user.id,
              docType: kycDocType as any,
              docNumber: kycDocNumber,
              docNumberHash: crypto.createHash('sha256').update(kycDocNumber).digest('hex'),
              docFileUrl: kycDocUrls[0],
              status: 'PENDING',
            },
          });
        }
        return user;
      });

      await this.otpService.sendOtp(result.email!, undefined);
      return { user: { id: result.id, name: result.name, email: result.email, role: result.role, isEmailVerified: false }, requiresOtp: true, message: 'Registration successful.' };
    } catch (e) {
      throw new BadRequestException('Registration failed.');
    }
  }

  // 🔐 Login
  async login(dto: LoginDto) {
    let user: any = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { vendor: true, venues: true },
    });

    let loginRoleOverride: Role | null = null;

    if (!user) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { username: dto.email },
        include: { user: { include: { venues: true, vendor: true } } }
      });
      if (vendor) {
        user = vendor.user;
        loginRoleOverride = Role.VENDOR;
      }
    }

    if (!user) {
      const venue = await this.prisma.venue.findFirst({
        where: { username: dto.email },
        include: { owner: { include: { venues: true, vendor: true } } }
      });
      if (venue) {
        user = venue.owner;
        loginRoleOverride = Role.VENUE_OWNER;
      }
    }

    if (!user) throw new BadRequestException('Invalid credentials');
    if (!user.passwordHash) throw new BadRequestException('Please login via Google or Facebook.');
    if (!user.isActive) throw new ForbiddenException('User is inactive.');

    const isPV = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPV) throw new BadRequestException('Invalid credentials');

    // 🚀 SMART ROLE DETECTION
    // If login via email, check if they have profiles and upgrade the role in the JWT
    let effectiveRole = loginRoleOverride || user.role;
    if (!loginRoleOverride) {
      if (user.vendor) effectiveRole = Role.VENDOR;
      else if (user.venues && user.venues.length > 0) effectiveRole = Role.VENUE_OWNER;
    }

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email!,
      role: effectiveRole,
      hasVendorProfile: !!user.vendor,
      hasVenueProfile: user.venues && user.venues.length > 0
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: effectiveRole,
        hasVendorProfile: !!user.vendor,
        hasVenueProfile: user.venues && user.venues.length > 0,
        image: user.image
      },
      ...tokens,
    };
  }

  async generateTokens(user: { id: number, email: string, role: Role, hasVendorProfile?: boolean, hasVenueProfile?: boolean }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role, // This role is now synced with the database profile
      hasVendorProfile: user.hasVendorProfile,
      hasVenueProfile: user.hasVenueProfile
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await (this.prisma as any).refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 86400000),
      },
    });

    return { accessToken, refreshToken };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { success: true, message: 'OTP sent if email exists.' };

    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(plainOtp, 10);
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: otpHash, passwordResetExpiry: otpExpiry },
    });

    await this.emailProvider.send(dto.email, 'Password Reset OTP', `Your OTP is: ${plainOtp}`).catch(() => { });
    return { success: true, message: 'OTP sent to email.' };
  }

  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordResetToken || !user.passwordResetExpiry) return { valid: false };
    if (user.passwordResetExpiry < new Date()) return { valid: false };
    const isValid = await bcrypt.compare(String(dto.otp).trim(), user.passwordResetToken);
    return { valid: isValid };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordResetToken) throw new BadRequestException('Invalid session');
    const isValid = await bcrypt.compare(String(dto.otp).trim(), user.passwordResetToken);
    if (!isValid) throw new BadRequestException('Invalid OTP');

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword, passwordResetToken: null, passwordResetExpiry: null },
    });

    await this.revokeAllUserTokens(user.id);
    return { success: true, message: 'Password reset successfully.' };
  }

  async handleOAuthLogin(oauthUser: any, provider: 'google' | 'facebook', intendedRole?: string) {
    const isGoogle = provider === 'google';
    const oauthId = isGoogle ? oauthUser.googleId : oauthUser.facebookId;
    if (!oauthId) throw new BadRequestException(`Invalid ${provider} data`);

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: oauthId }, { facebookId: oauthId }, { email: oauthUser.email }] },
      include: { vendor: true, venues: true },
    });

    if (user) {
      if (isGoogle && !user.googleId) await this.prisma.user.update({ where: { id: user.id }, data: { googleId: oauthId } });
      if (!isGoogle && !user.facebookId) await this.prisma.user.update({ where: { id: user.id }, data: { facebookId: oauthId } });
    } else {
      const userRole = (intendedRole as Role) || Role.CUSTOMER;
      user = await this.prisma.user.create({
        data: { email: oauthUser.email, name: oauthUser.name, googleId: isGoogle ? oauthId : null, facebookId: isGoogle ? null : oauthId, role: userRole, isEmailVerified: true, passwordHash: null },
        include: { vendor: true, venues: true },
      });
    }

    // 🚀 SMART ROLE DETECTION for OAuth
    let effectiveRole = user.role;
    if (user.vendor) effectiveRole = Role.VENDOR;
    else if (user.venues && user.venues.length > 0) effectiveRole = Role.VENUE_OWNER;

    const tokens = await this.generateTokens({ 
      id: user.id, 
      email: user.email!, 
      role: effectiveRole, 
      hasVendorProfile: !!user.vendor, 
      hasVenueProfile: user.venues.length > 0 
    });
    return { ...tokens, user: { ...user, role: effectiveRole } };
  }

  async refreshToken(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await (this.prisma as any).refreshToken.findFirst({
      where: { token: tokenHash, revoked: false, expiresAt: { gte: new Date() } },
      include: { user: { include: { vendor: true, venues: true } } }
    });

    if (!stored) throw new UnauthorizedException('Token invalid or expired');
    await (this.prisma as any).refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    return this.generateTokens({ id: stored.user.id, email: stored.user.email!, role: stored.user.role, hasVendorProfile: !!stored.user.vendor, hasVenueProfile: stored.user.venues.length > 0 });
  }

  async revokeToken(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await (this.prisma as any).refreshToken.updateMany({ where: { token: tokenHash }, data: { revoked: true } });
  }

  async revokeAllUserTokens(userId: number) {
    await (this.prisma as any).refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
  }

  async getUserProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, isEmailVerified: true, image: true }
    });
  }

  async checkEmailExists(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return !!user;
  }

  async checkPhoneExists(phone: string) {
    const user = await this.prisma.user.findFirst({ where: { phone } });
    return !!user;
  }

  async sendOtp(email: string, phone?: string) { return this.otpService.sendOtp(email, phone); }
  async verifyOtp(email: string, otp: string) { return this.otpService.verifyOtp(email, otp); }
}
