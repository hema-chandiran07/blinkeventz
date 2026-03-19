/**
 * Test Utilities & Helper Functions
 * 
 * Reusable utilities for Venue module tests.
 * Import these in your spec files for consistent test data and mocks.
 */

import { VenueStatus } from '@prisma/client';
import { CreateVenueDto } from '../src/venues/dto/create-venue.dto';
import { VenueResponseDto, PaginatedVenueResponseDto } from '../src/venues/dto/venue-response.dto';

// ============================================
// CONSTANTS
// ============================================

export const TEST_USER_IDS = {
  VENUE_OWNER: 100,
  ADMIN: 1,
  CUSTOMER: 200,
  OTHER_OWNER: 300,
} as const;

export const TEST_VENUE_IDS = {
  VALID: 1,
  NOT_FOUND: 999,
  OTHER: 2,
} as const;

// Valid venue types
const VENUE_TYPES = ['BANQUET', 'HOTEL', 'RESTAURANT', 'CONFERENCE_HALL', 'OPEN_AIR', 'ROOFTOP', 'LAWN', 'COMMUNITY_HALL'] as const;

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a valid venue DTO for testing
 */
export const createValidVenueDto = (overrides?: Partial<CreateVenueDto>): CreateVenueDto => ({
  name: 'Royal Palace Banquet Hall',
  type: VENUE_TYPES[0] as any,
  description: 'Luxury wedding venue',
  address: '123 MG Road',
  city: 'Bangalore',
  area: 'Indiranagar',
  pincode: '560038',
  capacityMin: 100,
  capacityMax: 500,
  basePriceMorning: 50000,
  basePriceEvening: 80000,
  basePriceFullDay: 120000,
  amenities: 'Parking, AC, Power backup',
  policies: 'No smoking allowed',
  ...overrides,
});

/**
 * Create an invalid venue DTO for negative testing
 */
export const createInvalidVenueDto = (): Partial<CreateVenueDto> => ({
  name: '', // Empty - should fail
  type: 'INVALID_TYPE' as any, // Invalid type
  city: '', // Empty - should fail
  capacityMin: -10, // Negative
  capacityMax: 0, // Zero
});

/**
 * Create mock venue response
 */
export const createMockVenueResponse = (
  overrides?: Partial<VenueResponseDto>,
): VenueResponseDto => ({
  id: 1,
  name: 'Royal Palace Banquet Hall',
  type: VENUE_TYPES[0] as any,
  description: 'Luxury wedding venue',
  address: '123 MG Road',
  city: 'Bangalore',
  area: 'Indiranagar',
  pincode: '560038',
  capacityMin: 100,
  capacityMax: 500,
  basePriceMorning: 50000,
  basePriceEvening: 80000,
  basePriceFullDay: 120000,
  amenities: 'Parking, AC, Power backup',
  policies: 'No smoking allowed',
  status: VenueStatus.PENDING_APPROVAL,
  images: [],
  photos: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ownerId: TEST_USER_IDS.VENUE_OWNER,
  ownerEmail: 'owner@test.com',
  ownerPhone: '1234567890',
  ownerName: 'Test Owner',
  username: 'test_owner',
  ...overrides,
});

/**
 * Create paginated venue response
 */
export const createPaginatedVenueResponse = (
  venues: VenueResponseDto[] = [],
  page = 1,
  limit = 20,
): PaginatedVenueResponseDto => ({
  data: venues,
  page,
  limit,
  total: venues.length,
  totalPages: Math.ceil(venues.length / limit),
  hasNext: page * limit < venues.length,
  hasPrev: page > 1,
});

// ============================================
// MOCK HELPERS
// ============================================

/**
 * Create a mock Prisma service for Venues
 */
export const createMockPrismaService = () => ({
  venue: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
});

/**
 * Create a mock Cache service
 */
export const createMockCacheService = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
});

/**
 * Create mock JWT auth request
 */
export const createMockAuthRequest = (userId: number, role: string) => ({
  user: {
    userId,
    role,
    email: `user${userId}@test.com`,
  },
});

// ============================================
// AUTH HELPERS
// ============================================

/**
 * Generate mock JWT token for testing
 * Note: In production, use proper JWT signing
 */
export const generateMockJwtToken = (
  userId: number,
  role: string = 'VENUE_OWNER',
): string => {
  // This is a mock token - in real tests, use actual JWT signing
  return `mock-jwt-token-${userId}-${role}`;
};

/**
 * Auth header with valid token
 */
export const getAuthHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

// ============================================
// SQL INJECTION TEST PAYLOADS
// ============================================

export const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE venues; --",
  "'; SELECT * FROM users; --",
  "UNION SELECT * FROM users--",
  "1' OR '1'='1",
  "'; DELETE FROM venues; --",
];

// ============================================
// TEST PAYLOAD EXAMPLES
// ============================================

export const TEST_PAYLOADS = {
  validVenue: {
    name: 'Test Venue',
    type: 'BANQUET' as any,
    description: 'Test description',
    address: '123 Test St',
    city: 'Test City',
    area: 'Test Area',
    pincode: '123456',
    capacityMin: 50,
    capacityMax: 200,
    basePriceMorning: 10000,
    basePriceEvening: 15000,
    basePriceFullDay: 25000,
  },
  
  invalidCapacities: [
    { capacityMin: -1, capacityMax: 100, description: 'negative min capacity' },
    { capacityMin: 100, capacityMax: -1, description: 'negative max capacity' },
    { capacityMin: 0, capacityMax: 100, description: 'zero min capacity' },
    { capacityMin: 100, capacityMax: 0, description: 'zero max capacity' },
    { capacityMin: 100001, capacityMax: 200000, description: 'exceeds max capacity' },
  ],
  
  invalidPrices: [
    { basePriceMorning: -1000, description: 'negative morning price' },
    { basePriceEvening: -1000, description: 'negative evening price' },
    { basePriceFullDay: -1000, description: 'negative full day price' },
  ],
  
  invalidNames: [
    { name: '', description: 'empty name' },
    { name: '   ', description: 'whitespace only name' },
    { name: 'A'.repeat(256), description: 'name too long' },
  ],
  
  invalidCities: [
    { city: '', description: 'empty city' },
    { city: '   ', description: 'whitespace only city' },
  ],
};

// ============================================
// ASSERTION HELPERS
// ============================================

/**
 * Check if error contains expected message
 */
export const expectErrorMessage = (
  error: any,
  expectedMessage: string,
): boolean => {
  const message = error?.message || error?.response?.message || String(error);
  return message.includes(expectedMessage);
};

/**
 * Assert pagination metadata is correct
 */
export const assertPaginationMeta = (
  response: PaginatedVenueResponseDto,
  expectedPage: number,
  expectedLimit: number,
  expectedTotal: number,
) => {
  expect(response.page).toBe(expectedPage);
  expect(response.limit).toBe(expectedLimit);
  expect(response.total).toBe(expectedTotal);
  expect(response.totalPages).toBe(Math.ceil(expectedTotal / expectedLimit));
  expect(response.hasNext).toBe(expectedPage * expectedLimit < expectedTotal);
  expect(response.hasPrev).toBe(expectedPage > 1);
};

// ============================================
// CLEANUP HELPERS
// ============================================

/**
 * Clear all mocks
 */
export const clearAllMocks = () => {
  jest.clearAllMocks();
};

/**
 * Reset mock implementations
 */
export const resetAllMocks = () => {
  jest.resetAllMocks();
};

// ============================================
// EXPORT ALL
// ============================================

export default {
  TEST_USER_IDS,
  TEST_VENUE_IDS,
  createValidVenueDto,
  createInvalidVenueDto,
  createMockVenueResponse,
  createPaginatedVenueResponse,
  createMockPrismaService,
  createMockCacheService,
  createMockAuthRequest,
  generateMockJwtToken,
  getAuthHeader,
  SQL_INJECTION_PAYLOADS,
  TEST_PAYLOADS,
  expectErrorMessage,
  assertPaginationMeta,
  clearAllMocks,
  resetAllMocks,
};
