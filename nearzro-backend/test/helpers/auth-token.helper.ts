/**
 * Authentication Token Helper
 * 
 * This file provides utilities for generating test JWT tokens and authentication tokens.
 * It simulates different user roles for testing protected endpoints.
 * 
 * Responsibilities:
 * - Generate JWT tokens for different user roles
 * - Create mock authentication headers
 * - Simulate vendor, admin, and customer tokens
 */

import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

/**
 * Token payload interface
 */
interface TokenPayload {
  sub: number;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

/**
 * Generate a mock JWT token for testing
 * 
 * @param jwtService - NestJS JwtService instance
 * @param userId - User ID to encode in token
 * @param email - User email to encode in token
 * @param role - User role to encode in token
 * @returns Signed JWT token string
 */
export async function generateMockToken(
  jwtService: JwtService,
  userId: number,
  email: string,
  role: Role,
): Promise<string> {
  const payload: TokenPayload = {
    sub: userId,
    email,
    role,
  };

  return jwtService.sign(payload);
}

/**
 * Generate admin JWT token
 */
export async function generateAdminToken(jwtService: JwtService): Promise<string> {
  return generateMockToken(jwtService, 1, 'admin@nearzro.com', 'ADMIN');
}

/**
 * Generate vendor JWT token
 */
export async function generateVendorToken(jwtService: JwtService): Promise<string> {
  return generateMockToken(jwtService, 2, 'vendor@nearzro.com', 'VENDOR');
}

/**
 * Generate customer JWT token
 */
export async function generateCustomerToken(jwtService: JwtService): Promise<string> {
  return generateMockToken(jwtService, 3, 'customer@nearzro.com', 'CUSTOMER');
}

/**
 * Create Authorization header value with Bearer token
 * 
 * @param token - JWT token string
 * @returns Authorization header value
 */
export function createAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Create Authorization header for admin user
 */
export function createAdminAuthHeader(token: string): { Authorization: string } {
  return { Authorization: createAuthHeader(token) };
}

/**
 * Create Authorization header for vendor user
 */
export function createVendorAuthHeader(token: string): { Authorization: string } {
  return { Authorization: createAuthHeader(token) };
}

/**
 * Create Authorization header for customer user
 */
export function createCustomerAuthHeader(token: string): { Authorization: string } {
  return { Authorization: createAuthHeader(token) };
}

/**
 * Get mock tokens for all roles
 * Returns an object with tokens for admin, vendor, and customer
 */
export async function getAllMockTokens(jwtService: JwtService): Promise<{
  adminToken: string;
  vendorToken: string;
  customerToken: string;
}> {
  const [adminToken, vendorToken, customerToken] = await Promise.all([
    generateAdminToken(jwtService),
    generateVendorToken(jwtService),
    generateCustomerToken(jwtService),
  ]);

  return { adminToken, vendorToken, customerToken };
}

/**
 * Create headers for unauthorized request
 */
export function createUnauthorizedHeaders(): { Authorization?: string } {
  return {};
}

/**
 * Create headers with invalid token
 */
export function createInvalidTokenHeaders(): { Authorization: string } {
  return { Authorization: 'Bearer invalid-token-12345' };
}

/**
 * Create headers with expired token simulation
 */
export function createExpiredTokenHeaders(): { Authorization: string } {
  // This is a token that would have expired
  return { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBuZWF6cm8uY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDB9.invalid' };
}
