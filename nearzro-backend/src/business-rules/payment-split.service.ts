import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionService, CommissionBreakdown } from './commission.service';

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

  constructor(private readonly commissionService: CommissionService) {}

  /**
   * Calculate payment split for a booking with vendor service
   */
  async calculateVendorBookingSplit(
    totalAmount: Decimal,
    vendorId: number,
    serviceType: string,
  ): Promise<PaymentSplit> {
    const breakdown: string[] = [];
    const totalAmountNum = totalAmount.toNumber();

    // 1. Calculate platform commission
    const commission = await this.commissionService.calculateVendorCommission(
      vendorId,
      serviceType,
      totalAmount,
    );
    const platformCommission = commission.commissionAmount;
    breakdown.push(`Platform commission (${(commission.commissionRate * 100).toFixed(1)}%): -₹${platformCommission}`);

    // 2. Calculate vendor share (amount after commission)
    const vendorShare = commission.netAmount;
    breakdown.push(`Vendor share: ₹${vendorShare}`);

    // 3. Calculate GST on platform commission
    const gst = platformCommission.mul(new Decimal(this.config.gstRate));
    breakdown.push(`GST on commission (${(this.config.gstRate * 100).toFixed(0)}%): ₹${gst}`);

    // 4. Calculate TDS (deducted from vendor payout)
    const tds = vendorShare.mul(new Decimal(this.config.tdsRate));
    breakdown.push(`TDS (${(this.config.tdsRate * 100).toFixed(0)}%): -₹${tds}`);

    // 5. Calculate payment processing fee
    const processingFee = totalAmount.mul(new Decimal(this.config.processingFeeRate))
      .add(new Decimal(this.config.processingFeeFixed));
    breakdown.push(`Processing fee: -₹${processingFee}`);

    // 6. Calculate net payout to vendor
    const netPayout = vendorShare.sub(tds);
    breakdown.push(`Net vendor payout: ₹${netPayout}`);

    // 7. Calculate platform revenue
    const platformRevenue = platformCommission.add(gst).add(processingFee);
    breakdown.push(`Platform revenue: ₹${platformRevenue}`);

    const result: PaymentSplit = {
      totalAmount,
      platformCommission: platformCommission.toDecimalPlaces(2),
      platformCommissionRate: commission.commissionRate,
      vendorShare: vendorShare.toDecimalPlaces(2),
      venueShare: new Decimal(0), // No venue in this split
      tax: gst.toDecimalPlaces(2),
      taxRate: this.config.gstRate,
      tds: tds.toDecimalPlaces(2),
      tdsRate: this.config.tdsRate,
      processingFee: processingFee.toDecimalPlaces(2),
      netPayout: netPayout.toDecimalPlaces(2),
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
    const gst = platformCommission.mul(new Decimal(this.config.gstRate));
    breakdown.push(`GST on commission (${(this.config.gstRate * 100).toFixed(0)}%): ₹${gst}`);

    // 4. Calculate TDS (deducted from venue payout)
    const tds = venueShare.mul(new Decimal(this.config.tdsRate));
    breakdown.push(`TDS (${(this.config.tdsRate * 100).toFixed(0)}%): -₹${tds}`);

    // 5. Calculate payment processing fee
    const processingFee = totalAmount.mul(new Decimal(this.config.processingFeeRate))
      .add(new Decimal(this.config.processingFeeFixed));
    breakdown.push(`Processing fee: -₹${processingFee}`);

    // 6. Calculate net payout to venue
    const netPayout = venueShare.sub(tds);
    breakdown.push(`Net venue payout: ₹${netPayout}`);

    // 7. Calculate platform revenue
    const platformRevenue = platformCommission.add(gst).add(processingFee);
    breakdown.push(`Platform revenue: ₹${platformRevenue}`);

    const result: PaymentSplit = {
      totalAmount,
      platformCommission: platformCommission.toDecimalPlaces(2),
      platformCommissionRate: commission.commissionRate,
      vendorShare: new Decimal(0), // No vendor in this split
      venueShare: venueShare.toDecimalPlaces(2),
      tax: gst.toDecimalPlaces(2),
      taxRate: this.config.gstRate,
      tds: tds.toDecimalPlaces(2),
      tdsRate: this.config.tdsRate,
      processingFee: processingFee.toDecimalPlaces(2),
      netPayout: netPayout.toDecimalPlaces(2),
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

    // Combine for total
    const totalBreakdown: string[] = [
      '=== COMBINED BOOKING SPLIT ===',
      `Total amount: ₹${totalAmount}`,
      '',
      '--- Venue Component ---',
      ...venueSplit.breakdown,
      '',
      '--- Vendor Component ---',
      ...vendorSplit.breakdown,
    ];

    const totalSplit: PaymentSplit = {
      totalAmount,
      platformCommission: venueSplit.platformCommission.add(vendorSplit.platformCommission).toDecimalPlaces(2),
      platformCommissionRate: (venueSplit.platformCommissionRate + vendorSplit.platformCommissionRate) / 2,
      vendorShare: vendorSplit.vendorShare,
      venueShare: venueSplit.venueShare,
      tax: venueSplit.tax.add(vendorSplit.tax).toDecimalPlaces(2),
      taxRate: this.config.gstRate,
      tds: venueSplit.tds.add(vendorSplit.tds).toDecimalPlaces(2),
      tdsRate: this.config.tdsRate,
      processingFee: venueSplit.processingFee.add(vendorSplit.processingFee).toDecimalPlaces(2),
      netPayout: venueSplit.netPayout.add(vendorSplit.netPayout).toDecimalPlaces(2),
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
