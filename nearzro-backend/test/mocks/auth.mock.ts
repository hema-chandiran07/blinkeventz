/**
 * Authentication Mock
 * NearZro Event Management Platform
 * 
 * Mocks for JWT Auth Guard, Roles Guard, and related authentication components.
 */

import { jest } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';

/**
 * Mock JwtAuthGuard
 * By default, allows all requests (canActivate returns true)
 */
export const mockJwtAuthGuard = {
  canActivate: jest.fn((context: ExecutionContext) => {
    // Default: allow all requests
    return true;
  }),
};

/**
 * Mock RolesGuard
 * By default, allows all requests
 */
export const mockRolesGuard = {
  canActivate: jest.fn((context: ExecutionContext) => {
    // Default: allow all requests
    return true;
  }),
};

/**
 * Creates a mock ExecutionContext for authenticated requests
 */
export const createMockExecutionContext = (user?: {
  id: number;
  email: string;
  role: string;
}): ExecutionContext => {
  const mockRequest = {
    user: user || {
      id: 1,
      email: 'test@example.com',
      role: 'USER',
    },
    headers: {
      authorization: 'Bearer mock-token',
    },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
};

/**
 * Creates a mock JWT payload
 */
export const createMockJwtPayload = (overrides?: Partial<{
  sub: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}>) => ({
  sub: 1,
  email: 'test@example.com',
  role: 'USER',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

/**
 * Mock JWT Strategy
 */
export const mockJwtStrategy = {
  validate: jest.fn((payload: ReturnType<typeof createMockJwtPayload>) => {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }),
};

/**
 * Mock for @CurrentUser() decorator
 */
export const mockCurrentUser = {
  id: 1,
  email: 'test@example.com',
  role: 'USER',
};

/**
 * Mock for @Roles() decorator
 */
export const mockRoles = (...roles: string[]) => roles;

/**
 * Creates a mock authenticated request
 */
export const createMockAuthenticatedRequest = (user?: {
  id: number;
  email: string;
  role: string;
}) => ({
  user: user || {
    id: 1,
    email: 'test@example.com',
    role: 'USER',
  },
  headers: {
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token',
  },
});

/**
 * Creates a mock admin request
 */
export const createMockAdminRequest = () => createMockAuthenticatedRequest({
  id: 1,
  email: 'admin@nearzro.com',
  role: 'ADMIN',
});

/**
 * Creates a mock vendor request
 */
export const createMockVendorRequest = (vendorId: number = 1) => ({
  user: {
    id: 1,
    email: 'vendor@nearzro.com',
    role: 'VENDOR',
    vendorId,
  },
  headers: {
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token',
  },
});

/**
 * Auth guard that can be configured to deny requests
 */
export const createMockAuthGuard = (shouldDeny: boolean = false) => ({
  canActivate: jest.fn((context: ExecutionContext) => {
    if (shouldDeny) {
      return false;
    }
    return true;
  }),
});

/**
 * Roles guard that can be configured for specific roles
 */
export const createMockRolesGuard = (allowedRoles: string[] = []) => ({
  canActivate: jest.fn((context: ExecutionContext) => {
    if (allowedRoles.length === 0) {
      return true; // No roles specified, allow all
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return user && allowedRoles.includes(user.role);
  }),
});
