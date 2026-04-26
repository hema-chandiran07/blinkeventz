/**
 * Mock Factory
 * NearZro Event Management Platform
 *
 * Reusable factory functions for creating test data.
 * Provides consistent, customizable mock objects for testing.
 */

import { ReviewStatus, SettingsCategory } from '@prisma/client';

// ============================================
// PROMOTION FACTORIES
// ============================================

export interface PromotionData {
  id: number;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minCartValue: number | null;
  maxDiscount: number | null;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createPromotion = (overrides: Partial<PromotionData> = {}): PromotionData => {
  const now = new Date();
  return {
    id: 1,
    code: 'WELCOME10',
    description: 'Welcome discount for new users',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minCartValue: 500,
    maxDiscount: 500,
    validFrom: now,
    validUntil: new Date('2027-12-31'),
    usageLimit: 1000,
    usedCount: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const createActivePromotion = (overrides: Partial<PromotionData> = {}): PromotionData => {
  return createPromotion({
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2027-12-31'),
    ...overrides,
  });
};

export const createExpiredPromotion = (overrides: Partial<PromotionData> = {}): PromotionData => {
  return createPromotion({
    isActive: false,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-12-31'),
    ...overrides,
  });
};

export const createInactivePromotion = (overrides: Partial<PromotionData> = {}): PromotionData => {
  return createPromotion({
    isActive: false,
    ...overrides,
  });
};

// ============================================
// REVIEW FACTORIES
// ============================================

export interface ReviewData {
  id: number;
  userId: number;
  venueId: number | null;
  vendorId: number | null;
  eventId: number | null;
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  helpful: number;
  createdAt: Date;
  updatedAt: Date;
}

export const createReview = (overrides: Partial<ReviewData> = {}): ReviewData => {
  const now = new Date();
  return {
    id: 1,
    userId: 1,
    venueId: 1,
    vendorId: null,
    eventId: null,
    rating: 5,
    title: 'Great experience!',
    comment: 'Amazing venue with excellent service',
    status: 'PENDING',
    helpful: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const createApprovedReview = (overrides: Partial<ReviewData> = {}): ReviewData => {
  return createReview({
    status: 'APPROVED',
    ...overrides,
  });
};

export const createRejectedReview = (overrides: Partial<ReviewData> = {}): ReviewData => {
  return createReview({
    status: 'REJECTED',
    ...overrides,
  });
};

// ============================================
// REVIEW VOTE FACTORIES
// ============================================

export interface ReviewVoteData {
  id: number;
  reviewId: number;
  userId: number;
  helpful: boolean;
  createdAt: Date;
}

export const createReviewVote = (overrides: Partial<ReviewVoteData> = {}): ReviewVoteData => {
  return {
    id: 1,
    reviewId: 1,
    userId: 1,
    helpful: true,
    createdAt: new Date(),
    ...overrides,
  };
};

// ============================================
// SETTINGS FACTORIES
// ============================================

export interface SettingsData {
  id: number;
  key: string;
  value: unknown;
  category: SettingsCategory;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createSetting = (overrides: Partial<SettingsData> = {}): SettingsData => {
  const now = new Date();
  return {
    id: 1,
    key: 'FEATURE_TEST',
    value: true,
    category: 'FEATURE',
    description: 'Test feature flag',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const createFeatureFlag = (key: string, value: boolean, overrides: Partial<SettingsData> = {}): SettingsData => {
  return createSetting({
    key: `FEATURE_${key}`,
    value,
    category: 'FEATURE',
    ...overrides,
  });
};

export const createIntegration = (key: string, value: unknown, overrides: Partial<SettingsData> = {}): SettingsData => {
  return createSetting({
    key: `INTEGRATION_${key}`,
    value,
    category: 'INTEGRATION',
    ...overrides,
  });
};

export const createSecuritySetting = (key: string, value: unknown, overrides: Partial<SettingsData> = {}): SettingsData => {
  return createSetting({
    key: `SECURITY_${key}`,
    value,
    category: 'SECURITY',
    ...overrides,
  });
};

// ============================================
// USER FACTORIES (for review relations)
// ============================================

export interface UserData {
  id: number;
  email: string;
  name: string | null;
  role: string;
}

export const createUser = (overrides: Partial<UserData> = {}): UserData => {
  return {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'CUSTOMER',
    ...overrides,
  };
};

// ============================================
// VENUE FACTORIES (for review relations)
// ============================================

export interface VenueData {
  id: number;
  name: string;
  address: string | null;
}

export const createVenue = (overrides: Partial<VenueData> = {}): VenueData => {
  return {
    id: 1,
    name: 'Test Venue',
    address: '123 Test Street',
    ...overrides,
  };
};

// ============================================
// PAGINATION HELPERS
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export const createPaginatedResponse = <T>(items: T[], page: number = 1, limit: number = 20): PaginatedResponse<T> => {
  return {
    data: items,
    total: items.length,
    page,
    totalPages: Math.ceil(items.length / limit),
  };
};

// ============================================
// FILE MOCK HELPERS
// ============================================

export type MockFile = Express.Multer.File;

export const createMockFile = (overrides: Partial<MockFile> = {}): MockFile => {
  return {
    buffer: Buffer.from('test file content'),
    originalname: 'test.pdf',
    mimetype: 'application/pdf',
    size: 1024 * 1024, // 1MB
    fieldname: 'file',
    encoding: '7bit',
    destination: '/tmp',
    filename: 'test.pdf',
    path: '/tmp/test.pdf',
    stream: null as unknown as MockFile['stream'],
    ...overrides,
  } as MockFile;
};

export const createImageFile = (mimetype: string = 'image/jpeg'): MockFile => {
  return createMockFile({
    mimetype,
    originalname: mimetype === 'image/png' ? 'test.png' : 'test.jpg',
    size: 1024 * 1024, // 1MB
  });
};

export const createPdfFile = (): MockFile => {
  return createMockFile({
    mimetype: 'application/pdf',
    originalname: 'document.pdf',
  });
};

export const createOversizedFile = (): MockFile => {
  return createMockFile({
    size: 10 * 1024 * 1024, // 10MB - exceeds 5MB limit
  });
};

export const createInvalidTypeFile = (): MockFile => {
  return createMockFile({
    mimetype: 'text/plain',
    originalname: 'test.txt',
  });
};
