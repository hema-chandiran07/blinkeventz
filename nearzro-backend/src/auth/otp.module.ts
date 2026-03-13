import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
