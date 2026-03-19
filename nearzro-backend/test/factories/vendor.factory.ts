/**
 * Vendor Test Factory
 * 
 * This file provides factory functions for creating test vendor data.
 * Factories generate consistent, realistic test data for E2E and integration tests.
 * 
 * Key features:
 * - Generate valid vendor data with all required fields
 * - Support for creating vendors with different states
 * - Override specific fields as needed
 * - Generate unique data to avoid test collisions
 */

import { Prisma } from '@prisma/client';

/**
 * Vendor creation input type
 */
export type VendorCreateInput = Partial<Prisma.VendorCreateInput> & {
  businessName: string;
  city: string;
  area: string;
};

/**
 * Default vendor data
 */
const defaultVendorData = {
  businessName: 'Test Business',
  city: 'Chennai',
  area: 'Velachery',
  description: 'Test vendor description',
  serviceRadiusKm: 10,
  verificationStatus: 'PENDING' as any,
  isActive: true,
};

/**
 * Generate a vendor with default data
 * Use this for basic vendor creation tests
 */
export function generateVendor(overrides?: Partial<VendorCreateInput>): VendorCreateInput {
  return {
    ...defaultVendorData,
    ...overrides,
  };
}

/**
 * Generate a vendor with pending verification status
 */
export function generatePendingVendor(overrides?: Partial<VendorCreateInput>): VendorCreateInput {
  return generateVendor({
    ...overrides,
    verificationStatus: 'PENDING',
  });
}

/**
 * Generate a verified vendor
 */
export function generateVerifiedVendor(overrides?: Partial<VendorCreateInput>): VendorCreateInput {
  return generateVendor({
    ...overrides,
    verificationStatus: 'VERIFIED',
  });
}

/**
 * Generate a rejected vendor
 */
export function generateRejectedVendor(overrides?: Partial<VendorCreateInput>): VendorCreateInput {
  return generateVendor({
    ...overrides,
    verificationStatus: 'REJECTED',
  });
}

/**
 * Generate vendor with minimum required fields
 */
export function generateVendorMinimal(overrides?: Partial<VendorCreateInput>): VendorCreateInput {
  return {
    businessName: 'Minimal Business',
    city: 'Bangalore',
    area: 'MG Road',
    ...overrides,
  };
}

/**
 * Generate vendor with maximum allowed values (edge case testing)
 */
export function generateVendorMaxValues(): VendorCreateInput {
  return {
    businessName: 'A'.repeat(100), // Max length
    city: 'A'.repeat(50),
    area: 'A'.repeat(100),
    description: 'B'.repeat(2000), // Max description length
    serviceRadiusKm: 1000, // Max radius
  };
}

/**
 * Generate vendor with empty/whitespace fields (validation testing)
 */
export function generateVendorEmptyFields(): VendorCreateInput {
  return {
    businessName: '',
    city: '   ',
    area: '',
    serviceRadiusKm: 10,
  };
}

/**
 * Generate multiple vendors for list/filter tests
 */
export function generateVendorList(count: number): VendorCreateInput[] {
  return Array.from({ length: count }, (_, i) => generateVendor({
    businessName: `Vendor ${i + 1}`,
    city: ['Chennai', 'Bangalore', 'Hyderabad', 'Mumbai'][i % 4],
    area: `Area ${i + 1}`,
  }));
}

/**
 * Generate vendor with specific city for filtering tests
 */
export function generateVendorByCity(city: string): VendorCreateInput {
  return generateVendor({ city });
}

/**
 * Generate vendor with invalid data for negative testing
 */
export function generateInvalidVendor(): VendorCreateInput {
  return {
    businessName: '', // Required - empty
    city: '', // Required - empty
    area: 'Valid Area',
    serviceRadiusKm: -10, // Invalid - negative
  };
}

/**
 * Vendor API DTO for creating a vendor via HTTP
 */
export interface CreateVendorDto {
  businessName: string;
  city: string;
  area: string;
  description?: string;
  serviceRadiusKm?: number;
}

/**
 * Generate vendor DTO for API requests
 */
export function generateVendorDto(overrides?: Partial<CreateVendorDto>): CreateVendorDto {
  return {
    businessName: 'Test Business',
    city: 'Chennai',
    area: 'Velachery',
    description: 'Test description',
    serviceRadiusKm: 10,
    ...overrides,
  };
}
