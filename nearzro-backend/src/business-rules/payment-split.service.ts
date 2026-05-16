import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionService, CommissionBreakdown } from './commission.service';
import { SettingsService } from '../settings/settings.service';

/**
 * Payment Split Engine
 * 
 * Calculates how payment amounts are split between:
 * - Platform commission
 * - Vendor/Venue share
 * - Taxes (GST, TDS)
 * - Processing fees
 */
export interface PaymentSplit {
  totalAmount: Decimal;
  platformCommission: Decimal;
  platformCommissionRate: number;
  vendorShare: Decimal;
  venueShare: Decimal;
  tax: Decimal;
  taxRate: number;
  tds: Decimal;
  tdsRate: number;
  processingFee: Decimal;
  netPayout: Decimal;
  breakdown: string[];
}

export interface SplitConfig {
  platformFeeRate: number;      // Platform commission (e.g., 0.02 = 2%)
  gstRate: number;              // GST rate (e.g., 0.18 = 18%)
  tdsRate: number;              // TDS rate (e.g., 0.01 = 1%)
  processingFeeRate: number;    // Payment processing fee (e.g., 0.02 = 2%)
  processingFeeFixed: number;   // Fixed processing fee component
}

@Injectable()
export class PaymentSplitService {
  private readonly logger = new Logger(PaymentSplitService.name);

  // Default split configuration
  private readonly config: SplitConfig = {
    platformFeeRate: 0.02,      // 2% platform fee
    gstRate: 0.18,              // 18% GST on platform fee
    tdsRate: 0.01,              // 1% TDS (Tax Deducted at Source)
    processingFeeRate: 0.02,    // 2% payment processing
    processingFeeFixed: 3,      // Rs. 3 fixed fee per transaction
  };

  constructor(
    private readonly commissionService: CommissionService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Calculate payment split for a vendor booking
   */
  async calculateVendorBookingSplit(
    totalAmount: Decimal,
    vendorId: number,
    serviceType: string,
  ): Promise<PaymentSplit> {
    const breakdown: string[] = [];
    const totalAmountNum = totalAmount.toNumber();

    // Fetch platform settings for GST and TDS rates
    const settings = await this.settingsService.getPlatformSettings();
    const gstRate = settings.gstPercent.toNumber() / 100;
    const tdsRate = settings.tdsPercent.toNumber() / 100;

    // FIX 7: Apply ROUND_HALF_EVEN after each arithmetic operation

    // 1. Calculate platform commission (already rounded in commission service)
    const commission = await this.commissionService.calculateVendorCommission(
      vendorId,
      serviceType,
      totalAmount,
    );
    const platformCommission = commission.commissionAmount;
    breakdown.push(`Platform commission (${(commission.commissionRate * 100).toFixed(1)}%): -₹${platformCommission}`);

    // 2. Calculate vendor share (already rounded)
    const vendorShare = commission.netAmount;
    breakdown.push(`Vendor share: ₹${vendorShare}`);

    // 3. Calculate GST on platform commission
    const gst = platformCommission
      .mul(new Decimal(gstRate))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    breakdown.push(`GST on commission (${(gstRate * 100).toFixed(0)}%): ₹${gst}`);

    // 4. Calculate TDS (deducted from vendor payout)
    const tds = vendorShare
      .mul(new Decimal(tdsRate))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    breakdown.push(`TDS (${(tdsRate * 100).toFixed(0)}%): -₹${tds}`);

    // 5. Calculate payment processing fee
    const processingFeeBase = totalAmount
      .mul(new Decimal(this.config.processingFeeRate))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const processingFee = processingFeeBase
      .add(new Decimal(this.config.processingFeeFixed))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    breakdown.push(`Processing fee: -₹${processingFee}`);

    // 6. Calculate net payout to vendor
    const netPayout = vendorShare
      .sub(tds)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    breakdown.push(`Net vendor payout: ₹${netPayout}`);

    // 7. Calculate platform revenue
    const platformRevenue = platformCommission
      .add(gst)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)
      .add(processingFee)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    breakdown.push(`Platform revenue: ₹${platformRevenue}`);

    const result: PaymentSplit = {
      totalAmount: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      platformCommission: platformCommission.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      platformCommissionRate: commission.commissionRate,
      vendorShare: vendorShare.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      venueShare: new Decimal(0), // No venue in this split
      tax: gst.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      taxRate: gstRate,
      tds: tds.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      tdsRate,
      processingFee: processingFee.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      netPayout: netPayout.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      breakdown,
    };

    this.logger.log(`Payment split calculated for vendor booking: Total ₹${totalAmount} → Vendor ₹${netPayout}, Platform ₹${platformRevenue}`);

    return result;
  }

  /**
   * Calculate payment split for a venue booking
   */
  async calculateVenueBookingSplit(
    totalAmount: Decimal,
    venueId: number,
  ): Promise<PaymentSplit> {
    const breakdown: string[] = [];

    // Fetch platform settings for GST and TDS rates
    const settings = await this.settingsService.getPlatformSettings();
    const gstRate = settings.gstPercent.toNumber() / 100;
    const tdsRate = settings.tdsPercent.toNumber() / 100;

    // 1. Calculate platform commission for venue
    const commission = await this.commissionService.calculateVenueCommission(
      venueId,
      totalAmount,
    );
    const platformCommission = commission.commissionAmount;
    breakdown.push(`Platform commission (${(commission.commissionRate * 100).toFixed(1)}%): -₹${platformCommission}`);

    // 2. Calculate venue share
    const venueShare = commission.netAmount;
    breakdown.push(`Venue share: ₹${venueShare}`);

    // 3. Calculate GST on platform commission
    const gst = platformCommission
      .mul(new Decimal(gstRate))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    breakdown.push(`GST on commission (${(gstRate * 100).toFixed(0)}%): ₹${gst}`);

    // 4. Calculate TDS (deducted from venue payout)
    const tds = venueShare
      .mul(new Decimal(tdsRate))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    breakdown.push(`TDS (${(tdsRate * 100).toFixed(0)}%): -₹${tds}`);

    // 5. Calculate payment processing fee
    const processingFeeBase = totalAmount
      .mul(new Decimal(this.config.processingFeeRate))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const processingFee = processingFeeBase
      .add(new Decimal(this.config.processingFeeFixed))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    breakdown.push(`Processing fee: -₹${processingFee}`);

    // 6. Calculate net payout to venue
    const netPayout = venueShare
      .sub(tds)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    breakdown.push(`Net venue payout: ₹${netPayout}`);

    // 7. Calculate platform revenue
    const platformRevenue = platformCommission
      .add(gst)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)
      .add(processingFee)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    breakdown.push(`Platform revenue: ₹${platformRevenue}`);

    const result: PaymentSplit = {
      totalAmount: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      platformCommission: platformCommission.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      platformCommissionRate: commission.commissionRate,
      vendorShare: new Decimal(0), // No vendor in this split
      venueShare: venueShare.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      tax: gst.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      taxRate: gstRate,
      tds: tds.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      tdsRate,
      processingFee: processingFee.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      netPayout: netPayout.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      breakdown,
    };

    this.logger.log(`Payment split calculated for venue booking: Total ₹${totalAmount} → Venue ₹${netPayout}, Platform ₹${platformRevenue}`);

    return result;
  }

  /**
   * Calculate split for combined booking (venue + vendor services)
   */
  async calculateCombinedSplit(
    totalAmount: Decimal,
    venueAmount: Decimal,
    vendorAmount: Decimal,
    venueId: number,
    vendorId: number,
    serviceType: string,
  ): Promise<{
    venue: PaymentSplit;
    vendor: PaymentSplit;
    total: PaymentSplit;
  }> {
    // Calculate splits separately
    const venueSplit = await this.calculateVenueBookingSplit(venueAmount, venueId);
    const vendorSplit = await this.calculateVendorBookingSplit(vendorAmount, vendorId, serviceType);

    // Combine for total with strict rounding after each addition
    const totalPlatformCommission = venueSplit.platformCommission
      .add(vendorSplit.platformCommission)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const totalTax = venueSplit.tax
      .add(vendorSplit.tax)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const totalTds = venueSplit.tds
      .add(vendorSplit.tds)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const totalProcessingFee = venueSplit.processingFee
      .add(vendorSplit.processingFee)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    const totalNetPayout = venueSplit.netPayout
      .add(vendorSplit.netPayout)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

    const totalBreakdown: string[] = [
      '=== COMBINED BOOKING SPLIT ===',
      `Total amount: ₹${totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)}`,
      '',
      '--- Venue Component ---',
      ...venueSplit.breakdown,
      '',
      '--- Vendor Component ---',
      ...vendorSplit.breakdown,
    ];

    const totalSplit: PaymentSplit = {
      totalAmount: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
      platformCommission: totalPlatformCommission,
      platformCommissionRate: (venueSplit.platformCommissionRate + vendorSplit.platformCommissionRate) / 2,
      vendorShare: vendorSplit.vendorShare,
      venueShare: venueSplit.venueShare,
      tax: totalTax,
      taxRate: this.config.gstRate,
      tds: totalTds,
      tdsRate: this.config.tdsRate,
      processingFee: totalProcessingFee,
      netPayout: totalNetPayout,
      breakdown: totalBreakdown,
    };

    return {
      venue: venueSplit,
      vendor: vendorSplit,
      total: totalSplit,
    };
  }

  /**
   * Generate invoice data from split
   */
  generateInvoiceData(split: PaymentSplit, bookingId: number, customerId: number) {
    return {
      invoiceNumber: `INV-${bookingId}-${Date.now()}`,
      bookingId,
      customerId,
      date: new Date(),
      lineItems: [
        {
          description: 'Service/Venue Amount',
          amount: split.totalAmount,
        },
        {
          description: 'Platform Commission',
          amount: split.platformCommission,
          type: 'deduction',
        },
        {
          description: 'GST',
          amount: split.tax,
          type: 'tax',
        },
        {
          description: 'TDS',
          amount: split.tds,
          type: 'deduction',
        },
        {
          description: 'Processing Fee',
          amount: split.processingFee,
          type: 'fee',
        },
      ],
      totalAmount: split.totalAmount,
      netPayout: split.netPayout,
      breakdown: split.breakdown,
    };
  }

  /**
   * Update split configuration (admin only)
   */
  updateConfig(config: Partial<SplitConfig>): void {
    Object.assign(this.config, config);
    this.logger.log(`Payment split config updated: ${JSON.stringify(config)}`);
  }

  /**
   * Get current configuration
   */
  getConfig(): SplitConfig {
    return this.config;
  }
}
