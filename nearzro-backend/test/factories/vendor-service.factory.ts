/**
 * Vendor Service Test Factory
 * 
 * This file provides factory functions for creating test vendor service data.
 * Generates realistic vendor service data for E2E and integration tests.
 * 
 * Key features:
 * - Generate valid vendor service data with all required fields
 * - Support for different service types and pricing models
 * - Generate services with different states (active/inactive)
 * - Edge case data generation for boundary testing
 */

/**
 * Default vendor service data
 */
const defaultVendorServiceData = {
  serviceName: 'Test Service',
  serviceType: 'CATERING',
  description: 'Test vendor service description',
  baseRate: 1000,
  pricingModel: 'PER_EVENT',
  minGuests: 10,
  maxGuests: 100,
  isActive: true,
};

/**
 * Generate vendor service with default data
 */
export function generateVendorService(overrides?: Record<string, any>) {
  return {
    ...defaultVendorServiceData,
    ...overrides,
  };
}

/**
 * Generate an active vendor service
 */
export function generateActiveVendorService(overrides?: Record<string, any>) {
  return generateVendorService({
    ...overrides,
    isActive: true,
  });
}

/**
 * Generate an inactive vendor service
 */
export function generateInactiveVendorService(overrides?: Record<string, any>) {
  return generateVendorService({
    ...overrides,
    isActive: false,
  });
}

/**
 * Generate vendor service with per-person pricing
 */
export function generatePerPersonPricingVendorService(overrides?: Record<string, any>) {
  return generateVendorService({
    ...overrides,
    pricingModel: 'PER_PERSON',
    baseRate: 500,
  });
}

/**
 * Generate vendor service with per-event pricing
 */
export function generatePerEventPricingVendorService(overrides?: Record<string, any>) {
  return generateVendorService({
    ...overrides,
    pricingModel: 'PER_EVENT',
    baseRate: 10000,
  });
}

/**
 * Generate vendor service with hourly pricing
 */
export function generateHourlyPricingVendorService(overrides?: Record<string, any>) {
  return generateVendorService({
    ...overrides,
    pricingModel: 'HOURLY',
    baseRate: 5000,
  });
}

/**
 * Generate vendor service with minimum guests (edge case)
 */
export function generateMinGuestsVendorService(overrides?: Record<string, any>) {
  return generateVendorService({
    ...overrides,
    minGuests: 1,
    maxGuests: 10,
  });
}

/**
 * Generate vendor service with large capacity
 */
export function generateLargeCapacityVendorService(overrides?: Record<string, any>) {
  return generateVendorService({
    ...overrides,
    minGuests: 100,
    maxGuests: 1000,
  });
}

/**
 * Generate vendor service with minimum required fields
 */
export function generateVendorServiceMinimal(overrides?: Record<string, any>) {
  return {
    serviceName: 'Minimal Service',
    serviceType: 'CATERING',
    baseRate: 500,
    pricingModel: 'PER_EVENT',
    minGuests: 5,
    maxGuests: 50,
    ...overrides,
  };
}

/**
 * Generate vendor service with maximum values (edge case)
 */
export function generateVendorServiceMaxValues(): Record<string, any> {
  return {
    serviceName: 'A'.repeat(100),
    description: 'B'.repeat(2000),
    baseRate: 1000000,
    minGuests: 0,
    maxGuests: 99999,
  };
}

/**
 * Generate vendor service with zero values (edge case)
 */
export function generateVendorServiceZeroValues(): Record<string, any> {
  return {
    serviceName: 'Zero Value Service',
    baseRate: 0,
    minGuests: 0,
    maxGuests: 0,
  };
}

/**
 * Generate vendor service with invalid data (negative testing)
 */
export function generateInvalidVendorService(): Record<string, any> {
  return {
    serviceName: '', // Required - empty
    serviceType: 'INVALID_TYPE', // Invalid enum value
    baseRate: -100, // Invalid - negative
    minGuests: 100, // Greater than max
    maxGuests: 50, // Less than min
  };
}

/**
 * Generate multiple vendor services for a vendor
 */
export function generateVendorServiceList(count: number): Record<string, any>[] {
  const serviceTypes = ['CATERING', 'DECORATION', 'PHOTOGRAPHY', 'MUSIC', 'TRANSPORT'];
  const pricingModels = ['PER_EVENT', 'PER_PERSON', 'HOURLY'];

  return Array.from({ length: count }, (_, i) => generateVendorService({
    serviceName: `Service ${i + 1}`,
    serviceType: serviceTypes[i % serviceTypes.length],
    pricingModel: pricingModels[i % pricingModels.length],
    baseRate: (i + 1) * 500,
  }));
}

/**
 * Vendor Service API DTO
 */
export interface CreateVendorServiceDto {
  serviceName: string;
  serviceType: string;
  description?: string;
  baseRate: number;
  pricingModel: string;
  minGuests: number;
  maxGuests: number;
}

/**
 * Generate vendor service DTO for API requests
 */
export function generateVendorServiceDto(overrides?: Partial<CreateVendorServiceDto>): CreateVendorServiceDto {
  return {
    serviceName: 'Test Service',
    serviceType: 'CATERING',
    description: 'Test description',
    baseRate: 1000,
    pricingModel: 'PER_EVENT',
    minGuests: 10,
    maxGuests: 100,
    ...overrides,
  };
}
