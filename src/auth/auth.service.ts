import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 👤 CUSTOMER registration
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
        name: dto.name, // ✅ REQUIRED
        email: dto.email,
        passwordHash: hashedPassword,
        role: Role.CUSTOMER,
      },
    });

    return {
      message: 'User registered successfully',
      userId: user.id,
    };
  }

  // 🏢 VENUE OWNER registration
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
        name: dto.name, // ✅ REQUIRED
        email: dto.email,
        passwordHash: hashedPassword,
        role: Role.VENUE_OWNER,
      },
    });

    return {
      message: 'Venue owner registered successfully',
      userId: user.id,
    };
  }
  // Vendor Registration
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
    },
  });

  // 2️⃣ Create VENDOR PROFILE (THIS IS CRITICAL)
  await this.prisma.vendor.create({
    data: {
      userId: user.id,
      businessName: dto.name,
      city: 'NOT_SET',
      area: 'NOT_SET',
    },
  });

  return {
    message: 'Vendor registered successfully',
    userId: user.id,
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
      accessToken: this.jwtService.sign(payload),
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
    accessToken: this.jwtService.sign(payload),
  };
}
}