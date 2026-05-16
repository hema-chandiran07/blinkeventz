import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class CartCalculationService implements OnModuleInit {
  private readonly logger = new Logger(CartCalculationService.name);
  private platformFeeRate: number = 0.02; // default 2%
  private taxRate: number = 0.18; // default 18%

  constructor(private readonly settingsService: SettingsService) {}

  async onModuleInit() {
    try {
      const settings = await this.settingsService.getPlatformSettings();
      this.platformFeeRate = Number(settings.platformFeePercent) / 100;
      this.taxRate = Number(settings.gstPercent) / 100;
      this.logger.log(`CartCalculationService initialized: platformFeeRate=${this.platformFeeRate}, taxRate=${this.taxRate}`);
    } catch (error) {
      this.logger.warn('Failed to load platform settings, using defaults', error);
    }
  }

  getPlatformFeeRate(): number {
    return this.platformFeeRate;
  }

  getTaxRate(): number {
    return this.taxRate;
  }
}
