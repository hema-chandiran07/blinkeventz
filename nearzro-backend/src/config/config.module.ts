import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';

// Debug: Log environment variables on startup
console.log('=== Environment Debug ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 'NOT SET');
console.log('ENCRYPTION_KEY length:', process.env.ENCRYPTION_KEY?.length || 'NOT SET');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('=========================');

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      envFilePath: '.env',
    }),
  ],
})
export class ConfigModule {}
