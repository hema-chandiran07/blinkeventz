import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { SettingsService } from '../settings/settings.service';

/**
 * Commission Calculation Engine
 * 
 * Handles tiered commission rates based on:
 * - Vendor/Venue type
 * - Volume thresholds
 * - Service category
 * - Performance metrics
 */
export interface CommissionConfig {
  baseRate: number;           // Base commission rate (e.g., 0.05 = 5%)
  tierThresholds: number[];   // Volume tiers in INR
  tierRates: number[];        // Commission rate per tier
  categoryRates: Record<string, number>; // Category-specific rates
}

export interface CommissionBreakdown {
  grossAmount: Decimal;
  commissionRate: number;
  commissionAmount: Decimal;
  netAmount: Decimal;
  tier: number;
  reason: string;
}

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  // Default commission configuration
  private readonly vendorCommissionConfig: CommissionConfig = {
    baseRate: 0.05, // 5% base commission
    tierThresholds: [0, 50000, 100000, 500000, 1000000], // Monthly volume tiers
    tierRates: [0.05, 0.045, 0.04, 0.035, 0.03], // Reduced rates for higher volumes
    categoryRates: {
      'PHOTOGRAPHY': 0.05,
      'CATERING': 0.06,
      'DECOR': 0.05,
      'MAKEUP': 0.05,
      'DJ': 0.04,
      'MUSIC': 0.04,
      'CAR_RENTAL': 0.06,
      'PRIEST': 0.03,
      'ENTERTAINMENT': 0.05,
      'OTHER': 0.05,
    },
  };

  private readonly venueCommissionConfig: CommissionConfig = {
    baseRate: 0.05, // 5% base commission
    tierThresholds: [0, 100000, 500000, 1000000, 5000000],
    tierRates: [0.05, 0.045, 0.04, 0.035, 0.03],
    categoryRates: {}, // Venues don't have category-based rates
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

   /**
    * Calculate commission for a vendor service booking
    */
   async calculateVendorCommission(
     vendorId: number,
     serviceType: string,
     amount: Decimal,
   ): Promise<CommissionBreakdown> {
     // Fetch dynamic base rate from platform settings
     const settings = await this.settingsService.getPlatformSettings();
     const dynamicBaseRate = settings.commissionPercent.toNumber() / 100;

     const config = { ...this.vendorCommissionConfig, baseRate: dynamicBaseRate };

     // Get vendor's monthly volume
     const monthlyVolume = await this.getVendorMonthlyVolume(vendorId);

     // Determine tier
     const tier = this.getTier(monthlyVolume, config.tierThresholds);
     let commissionRate = config.tierRates[tier] ?? config.baseRate;

     // Apply category-specific rate if higher (prevent rate arbitrage)
     const categoryRate = config.categoryRates[serviceType] ?? config.baseRate;
     commissionRate = Math.max(commissionRate, categoryRate);

     // Calculate commission with ROUND_HALF_EVEN after each operation
     const commissionAmount = amount
       .mul(new Decimal(commissionRate))
       .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
     const netAmount = amount
       .sub(commissionAmount)
       .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

     const result: CommissionBreakdown = {
       grossAmount: amount.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
       commissionRate,
       commissionAmount,
       netAmount,
       tier,
       reason: this.getTierReason(tier, monthlyVolume, serviceType, categoryRate),
     };

     this.logger.log(`Commission calculated for vendor ${vendorId}: ${commissionRate * 100}% (Tier ${tier})`);

     return result;
   }

   /**
    * Calculate commission for a venue booking
    */
   async calculateVenueCommission(
     venueId: number,
     amount: Decimal,
   ): Promise<CommissionBreakdown> {
     // Fetch dynamic base rate from platform settings
     const settings = await this.settingsService.getPlatformSettings();
     const dynamicBaseRate = settings.commissionPercent.toNumber() / 100;

     const config = { ...this.venueCommissionConfig, baseRate: dynamicBaseRate };

     // Get venue's monthly volume
     const monthlyVolume = await this.getVenueMonthlyVolume(venueId);

     // Determine tier
     const tier = this.getTier(monthlyVolume, config.tierThresholds);
     const commissionRate = config.tierRates[tier] ?? config.baseRate;

     // Calculate commission with ROUND_HALF_EVEN after each operation
     const commissionAmount = amount
       .mul(new Decimal(commissionRate))
       .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
     const netAmount = amount
       .sub(commissionAmount)
       .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

     const result: CommissionBreakdown = {
       grossAmount: amount.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
       commissionRate,
       commissionAmount,
       netAmount,
       tier,
       reason: `Volume tier ${tier} (Monthly volume: ₹${monthlyVolume})`,
     };

     this.logger.log(`Commission calculated for venue ${venueId}: ${commissionRate * 100}% (Tier ${tier})`);

     return result;
   }

  /**
   * Get vendor's total booking volume for current month
   */
  private async getVendorMonthlyVolume(vendorId: number): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const result = await this.prisma.vendorService.aggregate({
      _sum: {
        baseRate: true,
      },
      where: {
        vendorId,
        EventService: {
          some: {
            event: {
              createdAt: {
                gte: startOfMonth,
              },
            },
          },
        },
      },
    });
    
    return Number(result?._sum?.baseRate) || 0;
  }

  /**
   * Get venue's total booking volume for current month
   */
  private async getVenueMonthlyVolume(venueId: number): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const result = await this.prisma.venue.aggregate({
      _sum: {
        basePriceMorning: true,
        basePriceEvening: true,
        basePriceFullDay: true,
      },
      where: {
        id: venueId,
        events: {
          some: {
            createdAt: {
              gte: startOfMonth,
            },
          },
        },
      },
    });
    
    const morning = Number(result?._sum?.basePriceMorning) || 0;
    const evening = Number(result?._sum?.basePriceEvening) || 0;
    const fullDay = Number(result?._sum?.basePriceFullDay) || 0;
    
    return morning + evening + fullDay;
  }

  /**
   * Determine commission tier based on volume
   */
  private getTier(volume: number, thresholds: number[]): number {
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (volume >= thresholds[i]) return i;
    }
    return 0;
  }

  /**
   * Get human-readable reason for commission rate
   */
  private getTierReason(
    tier: number,
    monthlyVolume: number,
    serviceType: string,
    categoryRate: number,
  ): string {
    const baseReason = `Volume tier ${tier} (₹${monthlyVolume}/month)`;
    const categoryNote = categoryRate > 0.05 ? ` | ${serviceType} category: ${(categoryRate * 100).toFixed(1)}%` : '';
    return baseReason + categoryNote;
  }

  /**
   * Update commission configuration (admin only)
   */
  async updateCommissionConfig(
    type: 'VENDOR' | 'VENUE',
    config: Partial<CommissionConfig>,
  ): Promise<CommissionConfig> {
    // This would typically be stored in database
    // For now, we'll just log the change
    this.logger.log(`Commission config updated for ${type}: ${JSON.stringify(config)}`);
    
    if (type === 'VENDOR') {
      Object.assign(this.vendorCommissionConfig, config);
      return this.vendorCommissionConfig;
    } else {
      Object.assign(this.venueCommissionConfig, config);
      return this.venueCommissionConfig;
    }
  }

  /**
   * Get current commission configuration
   */
  getCommissionConfig(type: 'VENDOR' | 'VENUE'): CommissionConfig {
    return type === 'VENDOR' ? this.vendorCommissionConfig : this.venueCommissionConfig;
  }
}
