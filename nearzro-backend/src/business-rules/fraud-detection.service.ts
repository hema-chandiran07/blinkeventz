import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Fraud Detection Engine
 * 
 * Analyzes bookings and transactions for potential fraud using:
 * - Velocity checks (multiple bookings in short time)
 * - Amount anomaly detection
 * - Location mismatch detection
 * - Device fingerprinting
 * - User behavior analysis
 * - Historical pattern matching
 */
export interface FraudIndicators {
  velocityScore: number;        // 0-100 (multiple bookings)
  amountAnomalyScore: number;   // 0-100 (unusual amount)
  locationMismatchScore: number; // 0-100 (IP vs location)
  deviceRiskScore: number;      // 0-100 (new device/browser)
  userHistoryScore: number;     // 0-100 (past disputes/chargebacks)
  timePatternScore: number;     // 0-100 (unusual booking time)
}

export interface FraudAssessment {
  overallScore: number;         // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  indicators: FraudIndicators;
  flags: string[];
  recommendedAction: 'APPROVE' | 'REVIEW' | 'BLOCK' | 'MANUAL_VERIFY';
  requiresAdditionalVerification: boolean;
}

export interface UserRiskProfile {
  userId: number;
  totalBookings: number;
  cancelledBookings: number;
  disputedBookings: number;
  chargebacks: number;
  averageBookingAmount: Decimal;
  accountAge: number;
  verifiedPhone: boolean;
  verifiedEmail: boolean;
  kycStatus: string;
  riskScore: number;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  // Risk thresholds
  private readonly thresholds = {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80,
    CRITICAL: 90,
  };

  // Velocity check windows
  private readonly velocityWindows = {
    ONE_HOUR: 1,
    ONE_DAY: 5,
    ONE_WEEK: 15,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assess fraud risk for a booking
   */
  async assessBookingFraudRisk(
    userId: number,
    bookingAmount: Decimal,
    eventDate: Date,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string,
  ): Promise<FraudAssessment> {
    const indicators: FraudIndicators = {
      velocityScore: await this.calculateVelocityScore(userId),
      amountAnomalyScore: await this.calculateAmountAnomalyScore(userId, bookingAmount),
      locationMismatchScore: await this.calculateLocationMismatchScore(userId, ipAddress),
      deviceRiskScore: await this.calculateDeviceRiskScore(userId, deviceFingerprint),
      userHistoryScore: await this.calculateUserHistoryScore(userId),
      timePatternScore: this.calculateTimePatternScore(new Date()),
    };

    // Calculate weighted overall score
    const overallScore = this.calculateWeightedScore(indicators);
    const riskLevel = this.getRiskLevel(overallScore);
    const flags = this.generateFlags(indicators);
    const recommendedAction = this.getRecommendedAction(riskLevel);

    const assessment: FraudAssessment = {
      overallScore,
      riskLevel,
      indicators,
      flags,
      recommendedAction,
      requiresAdditionalVerification: overallScore >= this.thresholds.MEDIUM,
    };

    if (overallScore >= this.thresholds.HIGH) {
      this.logger.warn(`High fraud risk detected for user ${userId}: Score ${overallScore}, Flags: ${flags.join(', ')}`);
    }

    return assessment;
  }

  /**
   * Calculate velocity score (multiple bookings in short time)
   */
  private async calculateVelocityScore(userId: number): Promise<number> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [bookingsLastHour, bookingsLastDay, bookingsLastWeek] = await Promise.all([
      this.prisma.booking.count({
        where: { userId, createdAt: { gte: oneHourAgo } },
      }),
      this.prisma.booking.count({
        where: { userId, createdAt: { gte: oneDayAgo } },
      }),
      this.prisma.booking.count({
        where: { userId, createdAt: { gte: oneWeekAgo } },
      }),
    ]);

    let score = 0;

    // More than 1 booking in an hour is suspicious
    if (bookingsLastHour > 1) {
      score += 40;
    }

    // More than 5 bookings in a day is suspicious
    if (bookingsLastDay > this.velocityWindows.ONE_DAY) {
      score += 30;
    }

    // More than 15 bookings in a week is suspicious
    if (bookingsLastWeek > this.velocityWindows.ONE_WEEK) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate amount anomaly score (unusual booking amount)
   */
  private async calculateAmountAnomalyScore(userId: number, amount: Decimal): Promise<number> {
    // Get user's historical booking amounts
    const userBookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        slot: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (userBookings.length === 0) {
      // First booking - moderate risk
      return amount.toNumber() > 50000 ? 40 : 20;
    }

    // Calculate average booking amount
    const totalAmount = userBookings.reduce((sum, booking) => {
      // Use basePriceFullDay as fallback if other prices are null
      const venue = booking.slot.venue;
      const price = venue?.basePriceFullDay ||
                    venue?.basePriceEvening ||
                    venue?.basePriceMorning || 0;
      return sum + price;
    }, 0);
    const avgAmount = totalAmount / userBookings.length;
    const currentAmount = amount.toNumber();

    // Calculate deviation from average
    const deviation = Math.abs(currentAmount - avgAmount) / avgAmount;

    if (deviation > 3) return 80; // 300% deviation - very suspicious
    if (deviation > 2) return 60; // 200% deviation - suspicious
    if (deviation > 1) return 40; // 100% deviation - moderate
    if (deviation > 0.5) return 20; // 50% deviation - low
    return 0;
  }

  /**
   * Calculate location mismatch score
   */
  private async calculateLocationMismatchScore(userId: number, ipAddress: string): Promise<number> {
    // Get user's historical IPs (from audit logs or payment records)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        venues: true,
        vendor: true,
      },
    });

    if (!user) return 50;

    // Check if user has venues/vendors in different cities
    const cities = new Set<string>();
    user.venues.forEach(venue => cities.add(venue.city));
    if (user.vendor) {
      cities.add(user.vendor.city);
    }

    // If booking city doesn't match any known city, increase risk
    // This is simplified - in production, use geolocation API for IP
    const ipLocation = await this.getIPLocation(ipAddress);
    
    if (ipLocation && cities.size > 0 && !cities.has(ipLocation.city)) {
      return 60;
    }

    return 0;
  }

  /**
   * Calculate device risk score
   */
  private async calculateDeviceRiskScore(userId: number, deviceFingerprint?: string): Promise<number> {
    if (!deviceFingerprint) {
      return 30; // No fingerprint provided - moderate risk
    }

    // Check if this device has been used for fraud before
    // This would require a DeviceFingerprint table in production
    return 0;
  }

  /**
   * Calculate user history score based on past behavior
   */
  private async calculateUserHistoryScore(userId: number): Promise<number> {
    const riskProfile = await this.getUserRiskProfile(userId);
    
    let score = 0;

    // High cancellation rate
    if (riskProfile.totalBookings > 0) {
      const cancellationRate = riskProfile.cancelledBookings / riskProfile.totalBookings;
      if (cancellationRate > 0.5) score += 30;
      else if (cancellationRate > 0.3) score += 20;
      else if (cancellationRate > 0.1) score += 10;
    }

    // Past disputes
    if (riskProfile.disputedBookings > 0) {
      score += 40;
    }

    // Chargebacks
    if (riskProfile.chargebacks > 0) {
      score += 50;
    }

    // Unverified account
    if (!riskProfile.verifiedPhone || !riskProfile.verifiedEmail) {
      score += 20;
    }

    // New account with high activity
    if (riskProfile.accountAge < 7 && riskProfile.totalBookings > 5) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate time pattern score (unusual booking times)
   */
  private calculateTimePatternScore(bookingTime: Date): number {
    const hour = bookingTime.getHours();
    const day = bookingTime.getDay();

    // Late night bookings (2 AM - 5 AM) are slightly more risky
    if (hour >= 2 && hour <= 5) {
      return 20;
    }

    return 0;
  }

  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(indicators: FraudIndicators): number {
    const weights = {
      velocityScore: 0.20,
      amountAnomalyScore: 0.25,
      locationMismatchScore: 0.15,
      deviceRiskScore: 0.10,
      userHistoryScore: 0.25,
      timePatternScore: 0.05,
    };

    const score =
      indicators.velocityScore * weights.velocityScore +
      indicators.amountAnomalyScore * weights.amountAnomalyScore +
      indicators.locationMismatchScore * weights.locationMismatchScore +
      indicators.deviceRiskScore * weights.deviceRiskScore +
      indicators.userHistoryScore * weights.userHistoryScore +
      indicators.timePatternScore * weights.timePatternScore;

    return Math.round(score);
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= this.thresholds.CRITICAL) return 'CRITICAL';
    if (score >= this.thresholds.HIGH) return 'HIGH';
    if (score >= this.thresholds.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate flags for high-risk indicators
   */
  private generateFlags(indicators: FraudIndicators): string[] {
    const flags: string[] = [];

    if (indicators.velocityScore >= 60) {
      flags.push('HIGH_VELOCITY');
    }
    if (indicators.amountAnomalyScore >= 60) {
      flags.push('AMOUNT_ANOMALY');
    }
    if (indicators.locationMismatchScore >= 60) {
      flags.push('LOCATION_MISMATCH');
    }
    if (indicators.userHistoryScore >= 60) {
      flags.push('RISKY_HISTORY');
    }

    return flags;
  }

  /**
   * Get recommended action based on risk level
   */
  private getRecommendedAction(riskLevel: string): 'APPROVE' | 'REVIEW' | 'BLOCK' | 'MANUAL_VERIFY' {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'BLOCK';
      case 'HIGH':
        return 'MANUAL_VERIFY';
      case 'MEDIUM':
        return 'REVIEW';
      default:
        return 'APPROVE';
    }
  }

  /**
   * Get user risk profile
   */
  async getUserRiskProfile(userId: number): Promise<UserRiskProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: true, // Get booking with all its fields including status
        vendor: true,
        venues: true,
        KycDocument: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const totalBookings = user.bookings.length;
    // Type assertion to access status field
    const cancelledBookings = (user.bookings as any[]).filter(b => b.status === 'CANCELLED').length;
    
    // Get venue prices for average calculation
    const venueBookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        slot: {
          include: {
            venue: true,
          },
        },
      },
    });

    // Calculate average booking amount
    let totalAmount = 0;
    venueBookings.forEach(booking => {
      const venue = booking.slot.venue;
      const price = venue?.basePriceFullDay ||
                    venue?.basePriceEvening ||
                    venue?.basePriceMorning || 0;
      totalAmount += price;
    });
    const averageBookingAmount = new Decimal(totalAmount / Math.max(venueBookings.length, 1));

    // Account age in days
    const accountAge = Math.floor(
      (new Date().getTime() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    // KYC status
    const kycStatus = user.KycDocument.length > 0 
      ? user.KycDocument[0].status 
      : 'NOT_SUBMITTED';

    // Calculate risk score
    let riskScore = 0;
    if (totalBookings === 0) riskScore += 20;
    if (accountAge < 7) riskScore += 20;
    if (!user.phone) riskScore += 15;
    if (!user.isEmailVerified) riskScore += 15;
    if (kycStatus === 'NOT_SUBMITTED') riskScore += 20;
    if (cancelledBookings > totalBookings * 0.3) riskScore += 10;

    return {
      userId,
      totalBookings,
      cancelledBookings,
      disputedBookings: 0, // Would need a Dispute table
      chargebacks: 0,      // Would need a Chargeback table
      averageBookingAmount,
      accountAge,
      verifiedPhone: !!user.phone,
      verifiedEmail: user.isEmailVerified,
      kycStatus,
      riskScore: Math.min(riskScore, 100),
    };
  }

  /**
   * Get IP location (simplified - use real geolocation API in production)
   */
  private async getIPLocation(ipAddress: string): Promise<{ city: string; country: string } | null> {
    // In production, use a service like ipapi.co, ipstack, or MaxMind
    // For now, return null
    return null;
  }

  /**
   * Flag a booking for manual review
   */
  async flagForReview(
    bookingId: number,
    reason: string,
    score: number,
  ): Promise<void> {
    this.logger.warn(`Booking ${bookingId} flagged for review: ${reason} (Score: ${score})`);
    // In production, create a FraudReview record
  }

  /**
   * Block a suspicious booking
   */
  async blockBooking(
    bookingId: number,
    reason: string,
    score: number,
  ): Promise<void> {
    this.logger.error(`Booking ${bookingId} blocked: ${reason} (Score: ${score})`);
    // In production, cancel the booking and notify user
  }
}
