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
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }async googleLogin(googleUser: {
  email: string;
  name: string;
  picture: string;
  sub: string; // This is the Google ID from the strategy
}) {
  // 1. Try to find the user by googleId FIRST
  let user = await this.prisma.user.findUnique({
    where: { googleId: googleUser.sub },
  });

  // 2. If not found by googleId, check by email
  if (!user) {
    user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    // 3. If found by email but no googleId linked, link it now
    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.sub },
      });
    }
  }

  // 4. If still no user, create a new one
  if (!user) {
    user = await this.prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.sub, // Save the ID here
        role: Role.CUSTOMER,
        passwordHash: null,
      },
    });
  }

  const payload = { sub: user.id, role: user.role };
  return { accessToken: this.jwtService.sign(payload) };
}
}
