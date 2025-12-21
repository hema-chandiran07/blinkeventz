import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // 1. Ensure this is imported
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    // 2. Add JwtModule here so AuthService can use JwtService
    JwtModule.register({
      global: true, // This makes JwtService available everywhere
      secret: process.env.JWT_SECRET || 'fallbackSecret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}