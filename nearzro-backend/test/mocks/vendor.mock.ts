/**
 * Vendor Mock
 * NearZro Event Management Platform
 * 
 * Reusable mocks for vendor-related data and operations.
 */

import { jest } from '@jest/globals';
import { VendorVerificationStatus, ServiceType, VendorPricingModel } from '@prisma/client';

/**
 * Sample user data
 */
export const mockUser = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+919999999999',
  password: 'hashed_password',
  role: 'USER',
  emailVerified: true,
  phoneVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Sample vendor data
 */
export const sampleVendor = {
  id: 1,
  userId: 1,
  businessName: 'Royal Catering Services',
  description: 'Premium wedding catering services in Chennai',
  city: 'Chennai',
  area: 'Velachery',
  serviceRadiusKm: 25,
  verificationStatus: VendorVerificationStatus.PENDING,
  username: 'royal_catering',
  rejectionReason: null,
  images: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  user: mockUser,
  services: [],
};

/**
 * Sample verified vendor
 */
export const sampleVerifiedVendor = {
  ...sampleVendor,
  id: 2,
  businessName: 'Premium Catering Co',
  verificationStatus: VendorVerificationStatus.VERIFIED,
  username: 'premium_catering',
};

/**
 * Sample rejected vendor
 */
export const sampleRejectedVendor = {
  ...sampleVendor,
  id: 3,
  businessName: 'Rejected Catering',
  verificationStatus: VendorVerificationStatus.REJECTED,
  username: 'rejected_catering',
  rejectionReason: 'Invalid business documents',
};

/**
 * Sample vendor service
 */
export const sampleVendorService = {
  id: 1,
  vendorId: 1,
  name: 'Wedding Catering',
  serviceType: ServiceType.CATERING,
  pricingModel: VendorPricingModel.PER_EVENT,
  baseRate: 50000,
  minGuests: 100,
  maxGuests: 500,
  description: 'Full catering service for weddings',
  inclusions: 'Staff, equipment, tables, chairs',
  exclusions: 'Decorations, flowers',
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Sample active vendor service
 */
export const sampleActiveVendorService = {
  ...sampleVendorService,
  id: 2,
  name: 'Corporate Events',
  isActive: true,
  baseRate: 25000,
};

/**
 * Sample vendor with services
 */
export const vendorWithServices = {
  ...sampleVendor,
  services: [sampleVendorService, sampleActiveVendorService],
};

/**
 * Creates a mock vendor service repository
 */
export const createMockVendorRepository = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  findFirst: jest.fn(),
});

/**
 * Creates a mock vendor service service
 */
export const createMockVendorServiceRepository = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  findFirst: jest.fn(),
});

/**
 * Creates vendor data with custom overrides
 */
export const createVendorData = (overrides?: Partial<typeof sampleVendor>) => ({
  ...sampleVendor,
  ...overrides,
});

/**
 * Creates vendor service data with custom overrides
 */
export const createVendorServiceData = (overrides?: Partial<typeof sampleVendorService>) => ({
  ...sampleVendorService,
  ...overrides,
});

/**
 * Creates multiple vendors for list testing
 */
export const createVendorList = (count: number = 5) => 
  Array.from({ length: count }, (_, i) => ({
    ...sampleVendor,
    id: i + 1,
    businessName: `Vendor ${i + 1}`,
    username: `vendor_${i + 1}`,
  }));

/**
 * Creates multiple vendor services for list testing
 */
export const createVendorServiceList = (vendorId: number = 1, count: number = 3) =>
  Array.from({ length: count }, (_, i) => ({
    ...sampleVendorService,
    id: i + 1,
    vendorId,
    name: `Service ${i + 1}`,
  }));

/**
 * Pre-configured mocks for common scenarios
 */
export const vendorMocks = {
  // Success scenarios
  findAllResolved: {
    vendors: createVendorList(),
  },
  findOneResolved: {
    vendor: sampleVendor,
  },
  createResolved: {
    vendor: sampleVendor,
  },
  updateResolved: {
    vendor: { ...sampleVendor, businessName: 'Updated Business' },
  },
  deleteResolved: {
    vendor: sampleVendor,
  },

  // Error scenarios
  findOneNotFound: null,
  findUniqueNotFound: null,
  createDuplicateError: {
    code: 'P2002',
    message: 'Unique constraint failed',
  },
  createValidationError: {
    code: 'P2003',
    message: 'Foreign key constraint failed',
  },

  // Service mocks
  serviceFindAllResolved: {
    services: createVendorServiceList(),
  },
  serviceFindOneResolved: {
    service: sampleVendorService,
  },
  serviceCreateResolved: {
    service: sampleVendorService,
  },
  serviceUpdateResolved: {
    service: { ...sampleVendorService, name: 'Updated Service' },
  },
};
