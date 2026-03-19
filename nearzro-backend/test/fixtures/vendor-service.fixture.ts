/**
 * Vendor Service Fixtures
 * NearZro Event Management Platform
 * 
 * Pre-defined test data fixtures for vendor service-related tests.
 * Provides consistent, realistic test data.
 */

import { ServiceType, VendorPricingModel } from '@prisma/client';
import { vendorFixture } from './vendor.fixture';

/**
 * Sample vendor service fixture
 */
export const vendorServiceFixture = {
  id: 1,
  vendorId: 1,
  name: 'Wedding Catering',
  serviceType: ServiceType.CATERING,
  pricingModel: VendorPricingModel.PER_EVENT,
  baseRate: 50000,
  minGuests: 100,
  maxGuests: 500,
  description: 'Full catering service for weddings including staff, equipment, and setup',
  inclusions: 'Staff, equipment, tables, chairs, cutlery',
  exclusions: 'Decorations, flowers, special lighting',
  isActive: false,
  createdAt: new Date('2024-01-20T00:00:00Z'),
  updatedAt: new Date('2024-01-20T00:00:00Z'),
};

/**
 * Active vendor service fixture
 */
export const activeVendorServiceFixture = {
  ...vendorServiceFixture,
  id: 2,
  name: 'Corporate Event Catering',
  serviceType: ServiceType.CATERING,
  pricingModel: VendorPricingModel.PER_PERSON,
  baseRate: 500,
  minGuests: 20,
  maxGuests: 200,
  isActive: true,
};

/**
 * Per day pricing model fixture
 */
export const perDayVendorServiceFixture = {
  ...vendorServiceFixture,
  id: 3,
  name: 'DJ Services',
  serviceType: ServiceType.MUSIC,
  pricingModel: VendorPricingModel.PER_DAY,
  baseRate: 25000,
  minGuests: 0,
  maxGuests: 0,
  description: 'Professional DJ services for events',
  inclusions: 'DJ, sound system, lighting',
  exclusions: 'Special effects, additional speakers',
};

/**
 * Package pricing model fixture
 */
export const packageVendorServiceFixture = {
  ...vendorServiceFixture,
  id: 4,
  name: 'Wedding Photography Package',
  serviceType: ServiceType.PHOTOGRAPHY,
  pricingModel: VendorPricingModel.PACKAGE,
  baseRate: 75000,
  minGuests: 0,
  maxGuests: 0,
  description: 'Complete wedding photography and videography package',
  inclusions: 'Lead photographer, second photographer, candid photos, traditional photos, highlight video',
  exclusions: 'Drone photography, extra prints',
};

/**
 * Vendor service list fixture
 */
export const vendorServiceListFixture = [
  vendorServiceFixture,
  activeVendorServiceFixture,
  perDayVendorServiceFixture,
  packageVendorServiceFixture,
  {
    ...vendorServiceFixture,
    id: 5,
    name: 'Wedding Decorations',
    serviceType: ServiceType.DECOR,
    pricingModel: VendorPricingModel.PER_EVENT,
    baseRate: 35000,
    isActive: true,
  },
];

/**
 * Vendor service with vendor fixture
 */
export const vendorServiceWithVendorFixture = {
  ...vendorServiceFixture,
  vendor: vendorFixture,
};

/**
 * Create vendor service DTO fixture
 */
export const createVendorServiceDtoFixture = {
  name: 'Wedding Catering',
  serviceType: ServiceType.CATERING,
  pricingModel: VendorPricingModel.PER_EVENT,
  baseRate: 50000,
  minGuests: 100,
  maxGuests: 500,
  description: 'Full catering service for weddings',
  inclusions: 'Staff, equipment, tables, chairs',
  exclusions: 'Decorations, flowers',
};

/**
 * Update vendor service DTO fixture
 */
export const updateVendorServiceDtoFixture = {
  name: 'Updated Wedding Catering',
  description: 'Updated catering description',
  baseRate: 55000,
  isActive: true,
};

/**
 * Query fixtures for vendor services
 */
export const vendorServiceQueryFixtures = {
  // Filter by vendor
  byVendor: (vendorId: number) => ({
    where: { vendorId },
  }),
  
  // Filter by service type
  byServiceType: (serviceType: ServiceType) => ({
    where: { serviceType },
  }),
  
  // Filter active services only
  activeOnly: {
    where: { isActive: true },
  },
  
  // Filter by pricing model
  byPricingModel: (pricingModel: VendorPricingModel) => ({
    where: { pricingModel },
  }),
  
  // Include vendor
  withVendor: {
    include: { vendor: true },
  },
  
  // Pagination
  paginated: {
    skip: 0,
    take: 10,
  },
  
  // Order by created date
  orderByCreated: {
    orderBy: { createdAt: 'desc' as const },
  },
};

/**
 * Creates a custom vendor service fixture with overrides
 */
export const createVendorServiceFixture = (overrides: Partial<typeof vendorServiceFixture> = {}) => ({
  ...vendorServiceFixture,
  ...overrides,
  id: overrides.id || Math.floor(Math.random() * 10000) + 1,
  vendorId: overrides.vendorId || 1,
});

/**
 * Creates a vendor service fixture for a specific vendor
 */
export const createVendorServiceForVendorFixture = (
  vendorId: number, 
  overrides: Partial<typeof vendorServiceFixture> = {}
) => ({
  ...vendorServiceFixture,
  vendorId,
  id: Math.floor(Math.random() * 10000) + 1,
  ...overrides,
});

/**
 * Error fixtures for vendor service tests
 */
export const vendorServiceErrorFixtures = {
  // Vendor not found
  vendorNotFound: null,
  
  // Duplicate service
  duplicateService: {
    code: 'P2002',
    message: 'Unique constraint failed on the fields: vendorId, name',
  },
  
  // Validation errors
  negativeBaseRate: {
    message: 'baseRate must be greater than or equal to 0',
  },
  minGuestsGreaterThanMax: {
    message: 'minGuests cannot be greater than maxGuests',
  },
  invalidServiceType: {
    message: 'Invalid service type',
  },
  
  // Not found errors
  serviceNotFound: null,
  
  // Permission errors
  notOwner: {
    message: 'You can only modify your own services',
  },
};
