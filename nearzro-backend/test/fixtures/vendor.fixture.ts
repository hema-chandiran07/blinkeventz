/**
 * Vendor Fixtures
 * NearZro Event Management Platform
 * 
 * Pre-defined test data fixtures for vendor-related tests.
 * Provides consistent, realistic test data.
 */

import { VendorVerificationStatus, Role } from '@prisma/client';

/**
 * Base user fixture
 */
export const userFixture = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+919999999999',
  password: 'hashed_password_here',
  role: Role.CUSTOMER,
  emailVerified: true,
  phoneVerified: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Vendor user fixture
 */
export const vendorUserFixture = {
  ...userFixture,
  id: 2,
  email: 'vendor@example.com',
  role: Role.VENDOR,
};

/**
 * Admin user fixture
 */
export const adminUserFixture = {
  ...userFixture,
  id: 3,
  email: 'admin@nearzro.com',
  role: Role.ADMIN,
};

/**
 * Sample vendor fixture
 */
export const vendorFixture = {
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
  createdAt: new Date('2024-01-15T00:00:00Z'),
  updatedAt: new Date('2024-01-15T00:00:00Z'),
  user: userFixture,
  services: [],
};

/**
 * Verified vendor fixture
 */
export const verifiedVendorFixture = {
  ...vendorFixture,
  id: 2,
  userId: 2,
  businessName: 'Premium Catering Co',
  verificationStatus: VendorVerificationStatus.VERIFIED,
  username: 'premium_catering',
  user: vendorUserFixture,
};

/**
 * Rejected vendor fixture
 */
export const rejectedVendorFixture = {
  ...vendorFixture,
  id: 3,
  userId: 3,
  businessName: 'Rejected Catering',
  verificationStatus: VendorVerificationStatus.REJECTED,
  username: 'rejected_catering',
  rejectionReason: 'Invalid business documents submitted',
};

/**
 * Vendor list fixture (multiple vendors)
 */
export const vendorListFixture = [
  vendorFixture,
  verifiedVendorFixture,
  rejectedVendorFixture,
  {
    ...vendorFixture,
    id: 4,
    businessName: 'Elite Decorators',
    username: 'elite_decorators',
    city: 'Bangalore',
    area: 'MG Road',
  },
  {
    ...vendorFixture,
    id: 5,
    businessName: 'Star Photography',
    username: 'star_photography',
    city: 'Hyderabad',
    area: 'Jubilee Hills',
  },
];

/**
 * Create vendor DTO fixture
 */
export const createVendorDtoFixture = {
  businessName: 'Royal Catering Services',
  description: 'Premium wedding catering services',
  city: 'Chennai',
  area: 'Velachery',
  serviceRadiusKm: 25,
};

/**
 * Update vendor DTO fixture
 */
export const updateVendorDtoFixture = {
  businessName: 'Updated Catering Services',
  description: 'Updated description',
  city: 'Bangalore',
  area: 'MG Road',
  serviceRadiusKm: 30,
};

/**
 * Vendor with services fixture
 */
export const vendorWithServicesFixture = {
  ...vendorFixture,
  services: [
    {
      id: 1,
      vendorId: 1,
      name: 'Wedding Catering',
      serviceType: 'CATERING',
      pricingModel: 'PER_EVENT',
      baseRate: 50000,
      isActive: false,
    },
    {
      id: 2,
      vendorId: 1,
      name: 'Corporate Events',
      serviceType: 'CATERING',
      pricingModel: 'PER_PERSON',
      baseRate: 500,
      isActive: true,
    },
  ],
};

/**
 * Get vendor by ID query params fixture
 */
export const vendorQueryFixtures = {
  // Filter by verification status
  pendingVendors: {
    where: {
      verificationStatus: VendorVerificationStatus.PENDING,
    },
  },
  verifiedVendors: {
    where: {
      verificationStatus: VendorVerificationStatus.VERIFIED,
    },
  },
  // Filter by city
  chennaiVendors: {
    where: {
      city: 'Chennai',
    },
  },
  // Include services
  withServices: {
    include: {
      services: true,
    },
  },
  // Pagination
  paginated: {
    skip: 0,
    take: 10,
  },
};

/**
 * Creates a custom vendor fixture with overrides
 */
export const createVendorFixture = (overrides: Partial<typeof vendorFixture> = {}) => ({
  ...vendorFixture,
  ...overrides,
  id: overrides.id || Math.floor(Math.random() * 10000) + 1,
  user: overrides.user || userFixture,
});

/**
 * Creates a vendor fixture for a specific user
 */
export const createVendorForUserFixture = (userId: number, overrides: Partial<typeof vendorFixture> = {}) => ({
  ...vendorFixture,
  userId,
  id: Math.floor(Math.random() * 10000) + 1,
  ...overrides,
});
