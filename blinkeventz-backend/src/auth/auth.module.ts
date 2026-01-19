import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // 1. Import these
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    // 2. Add ConfigModule here so GoogleStrategy can find ConfigService
    ConfigModule, 
    
    PrismaModule,
    PassportModule.register({defaultStrategy:'jwt',
      session:false,
    }),
    
    // 3. Update to registerAsync. This ensures ConfigService is ready before reading the secret.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy,JwtStrategy],
  exports: [AuthService, JwtModule,PassportModule], // Good practice to export these
})
export class AuthModule {}