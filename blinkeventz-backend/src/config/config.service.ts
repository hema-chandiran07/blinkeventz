import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get databaseUrl(): string {
    // Adding ! at the end fixes the "string | undefined" error
    return this.config.get<string>('DATABASE_URL')!;
  }

  get jwtSecret(): string {
    return this.config.get<string>('JWT_SECRET')!;
  }

  get encryptionKey(): string {
    return this.config.get<string>('ENCRYPTION_KEY')!;
  }

  get port(): number {
    // No ! needed here because we provided a default value (3000)
    return this.config.get<number>('PORT', 3000);
  }
}