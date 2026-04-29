import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Dynamic Pricing Engine
 * 
 * Calculates prices based on multiple factors:
 * - Base price
 * - Day of week (weekend premium)
 * - Seasonal demand
 * - Holiday surcharges
 * - Advance booking discounts
 * - Last-minute discounts
 * - Multi-day event discounts
 */
export interface PricingFactors {
  basePrice: Decimal;
  dayOfWeekMultiplier: number;      // Weekend: 1.2x
  seasonalMultiplier: number;        // Peak season: 1.5x
  holidayMultiplier: number;         // Holidays: 1.3x
  advanceBookingDiscount: number;    // Early bird: 0.9x
  lastMinuteDiscount: number;        // <7 days: 0.85x
  multiDayDiscount: number;          // 3+ days: 0.9x
  guestCountMultiplier: number;      // Large events: 1.1x
}

export interface PriceBreakdown {
  basePrice: Decimal;
  dayOfWeekAdjustment: Decimal;
  seasonalAdjustment: Decimal;
  holidayAdjustment: Decimal;
  advanceBookingDiscount: Decimal;
  lastMinuteDiscount: Decimal;
  multiDayDiscount: Decimal;
  guestCountAdjustment: Decimal;
  finalPrice: Decimal;
  factors: string[];
}

export interface SeasonConfig {
  name: string;
  startDate: Date;
  endDate: Date;
  multiplier: number;
}

export interface HolidayConfig {
  name: string;
  date: Date;
  multiplier: number;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  // Seasonal pricing configuration (India-specific)
  private readonly seasons: SeasonConfig[] = [
    {
      name: 'Peak Wedding Season',
      startDate: new Date(new Date().getFullYear(), 10, 1), // Nov 1
      endDate: new Date(new Date().getFullYear(), 1, 28),   // Feb 28
      multiplier: 1.3,
    },
    {
      name: 'Monsoon Low Season',
      startDate: new Date(new Date().getFullYear(), 5, 1),  // Jun 1
      endDate: new Date(new Date().getFullYear(), 7, 31),   // Aug 31
      multiplier: 0.8,
    },
  ];

  // Holiday pricing (sample - should be configurable)
  private readonly holidays: HolidayConfig[] = [
    { name: 'New Year', date: new Date(new Date().getFullYear(), 0, 1), multiplier: 1.5 },
    { name: 'Valentine\'s Day', date: new Date(new Date().getFullYear(), 1, 14), multiplier: 1.3 },
    { name: 'Diwali', date: new Date(new Date().getFullYear(), 10, 1), multiplier: 1.4 },
    { name: 'Christmas', date: new Date(new Date().getFullYear(), 11, 25), multiplier: 1.4 },
  ];

  // Weekend days (0 = Sunday, 6 = Saturday)
  private readonly weekendDays = [0, 5, 6]; // Sunday, Friday, Saturday

  /**
   * Calculate dynamic price for a venue booking
   */
  calculateVenuePrice(
    basePrice: Decimal,
    eventDate: Date,
    numberOfDays: number = 1,
    guestCount: number,
    bookingDate: Date = new Date(),
  ): PriceBreakdown {
    const factors: string[] = [];
    let adjustedPrice = basePrice;

    // 1. Day of week adjustment
    const dayOfWeekMultiplier = this.getDayOfWeekMultiplier(eventDate);
    const dayOfWeekAdjustment = basePrice.mul(new Decimal(dayOfWeekMultiplier - 1));
    adjustedPrice = adjustedPrice.mul(new Decimal(dayOfWeekMultiplier));
    if (dayOfWeekMultiplier !== 1) {
      factors.push(`Day of week: ${(dayOfWeekMultiplier * 100).toFixed(0)}%`);
    }

    // 2. Seasonal adjustment
    const seasonalMultiplier = this.getSeasonalMultiplier(eventDate);
    const seasonalAdjustment = basePrice.mul(new Decimal(seasonalMultiplier - 1));
    adjustedPrice = adjustedPrice.mul(new Decimal(seasonalMultiplier));
    if (seasonalMultiplier !== 1) {
      factors.push(`Season: ${(seasonalMultiplier * 100).toFixed(0)}%`);
    }

    // 3. Holiday adjustment
    const holidayMultiplier = this.getHolidayMultiplier(eventDate);
    const holidayAdjustment = basePrice.mul(new Decimal(holidayMultiplier - 1));
    adjustedPrice = adjustedPrice.mul(new Decimal(holidayMultiplier));
    if (holidayMultiplier !== 1) {
      factors.push(`Holiday: ${(holidayMultiplier * 100).toFixed(0)}%`);
    }

    // 4. Advance booking discount
    const daysInAdvance = this.daysBetween(bookingDate, eventDate);
    const advanceBookingDiscount = this.getAdvanceBookingDiscount(daysInAdvance);
    const advanceDiscountAmount = adjustedPrice.mul(new Decimal(advanceBookingDiscount));
    adjustedPrice = adjustedPrice.sub(advanceDiscountAmount);
    if (advanceBookingDiscount > 0) {
      factors.push(`Early bird: -${(advanceBookingDiscount * 100).toFixed(0)}%`);
    }

    // 5. Last-minute discount (if booking within 7 days)
    const lastMinuteDiscount = this.getLastMinuteDiscount(daysInAdvance);
    const lastMinuteDiscountAmount = adjustedPrice.mul(new Decimal(lastMinuteDiscount));
    adjustedPrice = adjustedPrice.sub(lastMinuteDiscountAmount);
    if (lastMinuteDiscount > 0) {
      factors.push(`Last minute: -${(lastMinuteDiscount * 100).toFixed(0)}%`);
    }

    // 6. Multi-day event discount
    const multiDayDiscount = this.getMultiDayDiscount(numberOfDays);
    const multiDayDiscountAmount = adjustedPrice.mul(new Decimal(multiDayDiscount));
    adjustedPrice = adjustedPrice.sub(multiDayDiscountAmount);
    if (multiDayDiscount > 0) {
      factors.push(`Multi-day: -${(multiDayDiscount * 100).toFixed(0)}%`);
    }

    // 7. Guest count adjustment (large events)
    const guestCountMultiplier = this.getGuestCountMultiplier(guestCount);
    const guestCountAdjustment = adjustedPrice.mul(new Decimal(guestCountMultiplier - 1));
    adjustedPrice = adjustedPrice.mul(new Decimal(guestCountMultiplier));
    if (guestCountMultiplier !== 1) {
      factors.push(`Guest count: ${(guestCountMultiplier * 100).toFixed(0)}%`);
    }

    // FIX 6: Apply max discount cap — price cannot drop below 20% of basePrice
    // This prevents compounding discounts from driving price to zero or negative.
    const minPrice = basePrice.mul(new Decimal(0.20));
    if (adjustedPrice.lt(minPrice)) {
      factors.push('Maximum discount cap applied (80% off)');
      adjustedPrice = minPrice;
    }

    // Round to 2 decimal places
    const finalPrice = adjustedPrice.toDecimalPlaces(2);

    const result: PriceBreakdown = {
      basePrice,
      dayOfWeekAdjustment: dayOfWeekAdjustment.toDecimalPlaces(2),
      seasonalAdjustment: seasonalAdjustment.toDecimalPlaces(2),
      holidayAdjustment: holidayAdjustment.toDecimalPlaces(2),
      advanceBookingDiscount: advanceDiscountAmount.toDecimalPlaces(2),
      lastMinuteDiscount: lastMinuteDiscountAmount.toDecimalPlaces(2),
      multiDayDiscount: multiDayDiscountAmount.toDecimalPlaces(2),
      guestCountAdjustment: guestCountAdjustment.toDecimalPlaces(2),
      finalPrice,
      factors,
    };

    this.logger.log(`Dynamic price calculated: ₹${finalPrice} (base: ₹${basePrice}, factors: ${factors.length})`);

    return result;
  }

  /**
   * Get day of week multiplier
   * Weekend (Fri, Sat, Sun): 1.2x
   * Weekday: 1.0x
   */
  private getDayOfWeekMultiplier(date: Date): number {
    const day = date.getDay();
    return this.weekendDays.includes(day) ? 1.2 : 1.0;
  }

  /**
   * Get seasonal multiplier
   */
  private getSeasonalMultiplier(date: Date): number {
    for (const season of this.seasons) {
      if (date >= season.startDate && date <= season.endDate) {
        return season.multiplier;
      }
    }
    return 1.0; // Default season
  }

  /**
   * Get holiday multiplier
   */
  private getHolidayMultiplier(date: Date): number {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    for (const holiday of this.holidays) {
      const holidayDate = new Date(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate());
      if (dateOnly.getTime() === holidayDate.getTime()) {
        return holiday.multiplier;
      }
    }
    return 1.0; // Not a holiday
  }

  /**
   * Get advance booking discount
   * >90 days: 15% off
   * >60 days: 10% off
   * >30 days: 5% off
   */
  private getAdvanceBookingDiscount(daysInAdvance: number): number {
    if (daysInAdvance > 90) return 0.15;
    if (daysInAdvance > 60) return 0.10;
    if (daysInAdvance > 30) return 0.05;
    return 0;
  }

  /**
   * Get last-minute discount
   * <3 days: 20% off (urgent booking)
   * <7 days: 10% off
   */
  private getLastMinuteDiscount(daysInAdvance: number): number {
    if (daysInAdvance < 3) return 0.20;
    if (daysInAdvance < 7) return 0.10;
    return 0;
  }

  /**
   * Get multi-day event discount
   * 5+ days: 20% off
   * 3-4 days: 10% off
   */
  private getMultiDayDiscount(days: number): number {
    if (days >= 5) return 0.20;
    if (days >= 3) return 0.10;
    return 0;
  }

  /**
   * Get guest count multiplier
   * >500 guests: 1.15x (premium handling)
   * >200 guests: 1.10x
   * >100 guests: 1.05x
   */
  private getGuestCountMultiplier(guestCount: number): number {
    if (guestCount > 500) return 1.15;
    if (guestCount > 200) return 1.10;
    if (guestCount > 100) return 1.05;
    return 1.0;
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(start: Date, end: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((end.getTime() - start.getTime()) / msPerDay);
  }

  /**
   * Get optimal pricing recommendations
   */
  getPricingRecommendations(
    basePrice: Decimal,
    eventDate: Date,
    currentBookings: number,
    totalCapacity: number,
  ): { suggestedPrice: Decimal; reason: string } {
    const occupancyRate = currentBookings / totalCapacity;
    
    // High demand: increase price
    if (occupancyRate > 0.8) {
      const surgeMultiplier = 1.0 + (occupancyRate - 0.8) * 2; // Up to 1.4x
      const suggestedPrice = basePrice.mul(new Decimal(surgeMultiplier));
      return {
        suggestedPrice: suggestedPrice.toDecimalPlaces(2),
        reason: `High demand (${(occupancyRate * 100).toFixed(0)}% occupancy)`,
      };
    }
    
    // Low demand: decrease price
    if (occupancyRate < 0.3) {
      const discountMultiplier = 0.85;
      const suggestedPrice = basePrice.mul(new Decimal(discountMultiplier));
      return {
        suggestedPrice: suggestedPrice.toDecimalPlaces(2),
        reason: `Low demand (${(occupancyRate * 100).toFixed(0)}% occupancy) - consider discount`,
      };
    }
    
    return {
      suggestedPrice: basePrice.toDecimalPlaces(2),
      reason: 'Normal demand - maintain current pricing',
    };
  }
}
