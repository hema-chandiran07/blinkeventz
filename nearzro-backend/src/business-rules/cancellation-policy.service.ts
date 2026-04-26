import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Cancellation Policy Engine
 * 
 * Implements tiered cancellation penalties based on:
 * - Days until event
 * - Booking amount
 * - Vendor/Venue type
 * - Reason for cancellation
 */
export interface CancellationPolicy {
  freeCancellationHours: number;   // Hours before event for free cancellation
  partialRefundThresholds: {
    hours: number;
    refundPercent: number;
  }[];
  noRefundHours: number;           // Hours before event for no refund
  fixedCancellationFee: number;    // Fixed fee in INR
  emergencyWaiver: boolean;        // Allow emergency waivers
}

export interface RefundCalculation {
  originalAmount: Decimal;
  daysUntilEvent: number;
  hoursUntilEvent: number;
  applicablePolicy: string;
  cancellationFee: Decimal;
  penaltyAmount: Decimal;
  refundAmount: Decimal;
  refundPercent: number;
  breakdown: string[];
}

@Injectable()
export class CancellationPolicyService {
  private readonly logger = new Logger(CancellationPolicyService.name);

  // Default cancellation policy for venues
  private readonly venuePolicy: CancellationPolicy = {
    freeCancellationHours: 72, // 3 days
    partialRefundThresholds: [
      { hours: 72, refundPercent: 100 }, // >72 hours: 100% refund
      { hours: 48, refundPercent: 75 },  // 48-72 hours: 75% refund
      { hours: 24, refundPercent: 50 },  // 24-48 hours: 50% refund
      { hours: 12, refundPercent: 25 },  // 12-24 hours: 25% refund
    ],
    noRefundHours: 12, // <12 hours: 0% refund
    fixedCancellationFee: 500, // Rs. 500 processing fee
    emergencyWaiver: true,
  };

  // Default cancellation policy for vendors
  private readonly vendorPolicy: CancellationPolicy = {
    freeCancellationHours: 168, // 7 days
    partialRefundThresholds: [
      { hours: 168, refundPercent: 100 }, // >7 days: 100% refund
      { hours: 96, refundPercent: 90 },   // 4-7 days: 90% refund
      { hours: 48, refundPercent: 75 },   // 2-4 days: 75% refund
      { hours: 24, refundPercent: 50 },   // 1-2 days: 50% refund
    ],
    noRefundHours: 24, // <24 hours: 0% refund
    fixedCancellationFee: 300, // Rs. 300 processing fee
    emergencyWaiver: true,
  };

  /**
   * Calculate refund amount for venue booking cancellation
   */
  calculateVenueRefund(
    bookingAmount: Decimal,
    eventDate: Date,
    cancellationDate: Date = new Date(),
    isEmergency: boolean = false,
  ): RefundCalculation {
    return this.calculateRefund(
      bookingAmount,
      eventDate,
      cancellationDate,
      this.venuePolicy,
      'Venue',
      isEmergency,
    );
  }

  /**
   * Calculate refund amount for vendor service cancellation
   */
  calculateVendorRefund(
    bookingAmount: Decimal,
    eventDate: Date,
    cancellationDate: Date = new Date(),
    isEmergency: boolean = false,
  ): RefundCalculation {
    return this.calculateRefund(
      bookingAmount,
      eventDate,
      cancellationDate,
      this.vendorPolicy,
      'Vendor',
      isEmergency,
    );
  }

  /**
   * Core refund calculation logic
   */
  private calculateRefund(
    bookingAmount: Decimal,
    eventDate: Date,
    cancellationDate: Date,
    policy: CancellationPolicy,
    type: 'Venue' | 'Vendor',
    isEmergency: boolean,
  ): RefundCalculation {
    const breakdown: string[] = [];
    const msPerHour = 60 * 60 * 1000;
    const hoursUntilEvent = (eventDate.getTime() - cancellationDate.getTime()) / msPerHour;
    const daysUntilEvent = Math.floor(hoursUntilEvent / 24);

    // Emergency waiver
    if (isEmergency && policy.emergencyWaiver) {
      breakdown.push('Emergency waiver applied - full refund eligible');
      return {
        originalAmount: bookingAmount,
        daysUntilEvent,
        hoursUntilEvent,
        applicablePolicy: 'Emergency Waiver',
        cancellationFee: new Decimal(0),
        penaltyAmount: new Decimal(0),
        refundAmount: bookingAmount,
        refundPercent: 100,
        breakdown,
      };
    }

    // Determine refund percentage based on timing
    let refundPercent = 0;
    let applicablePolicy = 'No Refund';

    // Check if within free cancellation window
    if (hoursUntilEvent >= policy.freeCancellationHours) {
      refundPercent = 100;
      applicablePolicy = 'Free Cancellation';
      breakdown.push(`Cancellation ${Math.floor(hoursUntilEvent)} hours before event (free window: ${policy.freeCancellationHours}h)`);
    } else {
      // Check partial refund thresholds
      for (const threshold of policy.partialRefundThresholds) {
        if (hoursUntilEvent >= threshold.hours) {
          refundPercent = threshold.refundPercent;
          applicablePolicy = `Partial Refund (${threshold.refundPercent}%)`;
          breakdown.push(`Cancellation ${Math.floor(hoursUntilEvent)} hours before event (${threshold.refundPercent}% refund tier)`);
          break;
        }
      }

      // Check no refund window
      if (hoursUntilEvent < policy.noRefundHours && refundPercent === 0) {
        applicablePolicy = 'No Refund';
        breakdown.push(`Cancellation within ${policy.noRefundHours} hours of event - no refund`);
      }
    }

    // Calculate refund amount
    const grossRefund = bookingAmount.mul(new Decimal(refundPercent / 100));
    
    // Apply fixed cancellation fee (only if refund > 0)
    let cancellationFee = new Decimal(0);
    if (refundPercent > 0) {
      cancellationFee = new Decimal(Math.min(policy.fixedCancellationFee, grossRefund.toNumber()));
      breakdown.push(`Cancellation fee: -₹${cancellationFee}`);
    }

    const refundAmount = grossRefund.sub(cancellationFee);
    const penaltyAmount = bookingAmount.sub(refundAmount);
    const actualRefundPercent = refundPercent > 0 ? (refundAmount.toNumber() / bookingAmount.toNumber()) * 100 : 0;

    breakdown.push(`Original amount: ₹${bookingAmount}`);
    breakdown.push(`Refund percentage: ${refundPercent}%`);
    breakdown.push(`Final refund: ₹${refundAmount}`);

    this.logger.log(`${type} cancellation: ₹${refundAmount} refund (${actualRefundPercent.toFixed(1)}% of ₹${bookingAmount})`);

    return {
      originalAmount: bookingAmount,
      daysUntilEvent,
      hoursUntilEvent,
      applicablePolicy,
      cancellationFee: cancellationFee.toDecimalPlaces(2),
      penaltyAmount: penaltyAmount.toDecimalPlaces(2),
      refundAmount: refundAmount.toDecimalPlaces(2),
      refundPercent: actualRefundPercent,
      breakdown,
    };
  }

  /**
   * Get cancellation policy details
   */
  getPolicy(type: 'VENUE' | 'VENDOR'): CancellationPolicy {
    return type === 'VENUE' ? this.venuePolicy : this.vendorPolicy;
  }

  /**
   * Update cancellation policy (admin only)
   */
  updatePolicy(type: 'VENUE' | 'VENDOR', policy: Partial<CancellationPolicy>): void {
    if (type === 'VENUE') {
      Object.assign(this.venuePolicy, policy);
      this.logger.log('Venue cancellation policy updated');
    } else {
      Object.assign(this.vendorPolicy, policy);
      this.logger.log('Vendor cancellation policy updated');
    }
  }

  /**
   * Check if cancellation is allowed
   */
  canCancel(eventDate: Date, cancellationDate: Date = new Date()): boolean {
    const hoursUntilEvent = (eventDate.getTime() - cancellationDate.getTime()) / (60 * 60 * 1000);
    // Can always cancel, but refund amount varies
    return true;
  }

  /**
   * Get cancellation deadline for full refund
   */
  getFullRefundDeadline(eventDate: Date, type: 'VENUE' | 'VENDOR'): Date {
    const policy = this.getPolicy(type);
    const hoursInMs = policy.freeCancellationHours * 60 * 60 * 1000;
    return new Date(eventDate.getTime() - hoursInMs);
  }
}
