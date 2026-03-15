import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CACHE_CONFIG,
  VENDOR_MATCH_CONFIG,
  ERROR_MESSAGES,
} from '../constants/ai-planner.constants';
import type { Cache } from 'cache-manager';

/**
 * Vendor Matching Service
 * 
 * Responsible for:
 * - Finding vendors based on AI plan criteria
 * - Scoring and ranking vendors
 * - Caching vendor match results
 * - Filtering by category, rating, verification, location
 */
@Injectable()
export class VendorMatchingService {
  private readonly logger = new Logger(VendorMatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Find and rank vendors matching an AI plan
   * 
   * Features:
   * - Authorization check (userId required)
   * - Scoring algorithm with weighted factors
   * - Result caching
   * - Category matching
   */
  async findMatchingVendors(
    planId: number,
    userId: number,
    cache: Cache,
  ): Promise<any[]> {
    this.logger.log(`Finding vendors for plan ${planId} (user ${userId})`);

    // Step 1: Verify plan exists and belongs to user (AUTHORIZATION FIX)
    const plan = await this.prisma.aIPlan.findFirst({
      where: {
        id: planId,
        userId,
      },
    });

    if (!plan) {
      this.logger.warn(`Unauthorized access attempt: user ${userId} tried to access plan ${planId}`);
      throw new Error(ERROR_MESSAGES.PLAN_NOT_FOUND);
    }

    // Step 2: Generate cache key
    const cacheKey = this.generateCacheKey(plan);

    // Step 3: Check cache
    const cached = await cache.get(cacheKey) as any[] | null;
    if (cached && Array.isArray(cached)) {
      this.logger.debug(`Vendor match cache hit: ${cacheKey}`);
      return cached;
    }

    // Step 4: Find matching vendors using improved algorithm
    const vendors = await this.findAndScoreVendors(plan);

    // Step 5: Cache results
    await cache.set(cacheKey, vendors, CACHE_CONFIG.VENDOR_MATCH_TTL);

    this.logger.log(`Found ${vendors.length} matching vendors for plan ${planId}`);
    return vendors;
  }

  /**
   * Find vendors using scoring algorithm
   */
  private async findAndScoreVendors(plan: any): Promise<any[]> {
    // Get all active vendors in the area
    const vendors = await this.prisma.vendorService.findMany({
      where: {
        isActive: true,
        vendor: {
          city: {
            equals: plan.city,
            mode: 'insensitive',
          },
          area: {
            contains: plan.area,
            mode: 'insensitive',
          },
        },
      },
      include: {
        vendor: true,
      },
      take: 50, // Get more for scoring
    });

    if (!vendors.length) {
      this.logger.debug(`No vendors found for city: ${plan.city}, area: ${plan.area}`);
      return [];
    }

    // Score each vendor
    const scoredVendors = vendors.map((vendorService) => ({
      vendorService,
      score: this.calculateVendorScore(vendorService, plan),
    }));

    // Sort by score (highest first) and take top results
    return scoredVendors
      .sort((a, b) => b.score - a.score)
      .slice(0, VENDOR_MATCH_CONFIG.DEFAULT_LIMIT)
      .map((item) => item.vendorService);
  }

  /**
   * Calculate vendor score based on multiple weighted factors
   * 
   * Scoring factors:
   * - Rating (35%): Higher ratings get more points
   * - Budget match (25%): Vendor price within category budget range
   * - Verification (25%): Verified vendors get priority
   * - Proximity (15%): Exact area match gets more points
   */
  private calculateVendorScore(vendorService: any, plan: any): number {
    const weights = VENDOR_MATCH_CONFIG.WEIGHTS;
    let score = 0;

    // 1. Rating Score (0-35 points)
    const rating = vendorService.vendor?.averageRating || 0;
    if (rating >= VENDOR_MATCH_CONFIG.MIN_RATING) {
      // Normalize rating to 0-1 scale, then multiply by weight
      const ratingScore = Math.min(rating / 5, 1) * 100 * weights.RATING;
      score += ratingScore;
    }

    // 2. Budget Match Score (0-25 points)
    const budgetPerCategory = plan.budget / (plan.planJson?.allocations?.length || 1);
    const vendorRate = vendorService.baseRate || 0;
    
    if (vendorRate <= budgetPerCategory * VENDOR_MATCH_CONFIG.BUDGET_THRESHOLD_PERCENT) {
      // Perfect budget match
      score += 100 * weights.BUDGET_MATCH;
    } else if (vendorRate <= budgetPerCategory) {
      // Acceptable budget match
      score += 50 * weights.BUDGET_MATCH;
    }

    // 3. Verification Score (0-25 points)
    const isVerified = vendorService.vendor?.verificationStatus === 'VERIFIED';
    score += isVerified ? 100 * weights.VERIFICATION : 0;

    // 4. Proximity Score (0-15 points)
    const isExactArea = vendorService.vendor?.area?.toLowerCase() === plan.area?.toLowerCase();
    const isSameArea = vendorService.vendor?.area?.toLowerCase()?.includes(plan.area?.toLowerCase());
    
    if (isExactArea) {
      score += 100 * weights.PROXIMITY;
    } else if (isSameArea) {
      score += 50 * weights.PROXIMITY;
    }

    return Math.round(score);
  }

  /**
   * Generate cache key for vendor matching
   */
  private generateCacheKey(plan: any): string {
    const keyData = {
      city: plan.city,
      area: plan.area,
      budget: plan.budget,
    };
    return `${CACHE_CONFIG.VENDOR_MATCH_PREFIX}${plan.city}:${plan.area}:${plan.budget}`;
  }
}
