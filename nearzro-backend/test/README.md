# Venue Module Testing Guide

## Overview

This document provides comprehensive testing guidelines for the NestJS Venue Module. The test suite includes unit tests, integration tests (E2E), and various security and validation tests.

## Test Structure

```
blinkeventz/nearzro-backend/
├── src/venues/
│   ├── venues.service.spec.ts      # Service layer unit tests
│   └── venues.controller.spec.ts   # Controller layer unit tests
└── test/
    ├── venues.e2e-spec.ts          # E2E integration tests
    ├── jest-e2e.json                # E2E Jest configuration
    ├── setup.ts                    # Test setup hooks
    └── test.utils.ts               # Test utilities & helpers
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Integration Tests (E2E)
```bash
# Run E2E tests
npm run test:e2e

# Run specific E2E test file
npm run test:e2e -- --testPathPattern=venues
```

## Test Coverage Goals

| Layer | Coverage Target |
|-------|----------------|
| Service | > 90% |
| Controller | > 85% |
| Overall | > 80% |

## Test Categories

### 1. Unit Tests - Service Layer

**File:** [`venues.service.spec.ts`](src/venues/venues.service.spec.ts)

Tests the business logic in [`venues.service.ts`](src/venues/venues.service.ts):

#### Positive Cases
- ✅ Create venue with valid data
- ✅ Retrieve venue by ID
- ✅ Update venue by owner
- ✅ Admin approval changes status
- ✅ Pagination returns correct records
- ✅ Search returns matching venues

#### Negative Cases
- ❌ Creating venue with invalid capacity
- ❌ Creating venue with negative price
- ❌ Update venue by non-owner
- ❌ Approve venue with non-admin user
- ❌ Venue not found
- ❌ Invalid pagination params

### 2. Unit Tests - Controller Layer

**File:** [`venues.controller.spec.ts`](src/venues/venues.controller.spec.ts)

Tests the HTTP endpoints in [`venues.controller.ts`](src/venues/venues.controller.ts):

#### Endpoints Tested
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/venues` | List approved venues (public) |
| GET | `/venues/:id` | Get venue by ID (public) |
| GET | `/venues/search` | Search venues (public) |
| POST | `/venues` | Create venue (VENUE_OWNER) |
| PATCH | `/venues/:id` | Update venue (owner) |
| DELETE | `/venues/:id` | Delete venue (owner) |
| PATCH | `/venues/:id/approve` | Approve venue (ADMIN) |
| PATCH | `/venues/:id/reject` | Reject venue (ADMIN) |

### 3. Integration Tests (E2E)

**File:** [`venues.e2e-spec.ts`](test/venues.e2e-spec.ts)

Full integration tests with:
- Real HTTP requests using Supertest
- Mocked Prisma and Cache services
- DTO validation
- Guard enforcement

### 4. Security Tests

Tests for common security vulnerabilities:

- ✅ Unauthenticated access blocked
- ✅ Invalid JWT rejected
- ✅ SQL injection attempts rejected
- ✅ Ownership enforcement
- ✅ Role-based access control (RBAC)

### 5. Validation Tests

Tests for DTO validation rules:

| Field | Valid | Invalid |
|-------|-------|---------|
| capacityMin | 1 - 100000 | < 1, > 100000 |
| capacityMax | 1 - 100000 | < 1, > 100000 |
| basePrice* | ≥ 0 | < 0 |
| name | 1-255 chars | Empty, > 255 |
| city | Non-empty | Empty |

### 6. Pagination Tests

Tests for pagination functionality:

```typescript
// First page
GET /venues?page=1&limit=10

// Middle page  
GET /venues?page=5&limit=20

// Last page
GET /venues?page=10&limit=10
```

## Test Utilities

**File:** [`test/utils.ts`](test/test.utils.ts)

Provides reusable testing utilities:

```typescript
import {
  createValidVenueDto,
  createMockVenueResponse,
  createMockPrismaService,
  createMockCacheService,
  TEST_USER_IDS,
  SQL_INJECTION_PAYLOADS,
} from '../test/test.utils';
```

### Available Utilities

| Function | Description |
|----------|-------------|
| `createValidVenueDto()` | Create valid venue DTO |
| `createMockVenueResponse()` | Create mock venue response |
| `createPaginatedVenueResponse()` | Create paginated response |
| `createMockPrismaService()` | Create mock Prisma |
| `createMockCacheService()` | Create mock Cache |
| `createMockAuthRequest()` | Create auth request |
| `generateMockJwtToken()` | Generate JWT token |
| `SQL_INJECTION_PAYLOADS` | SQL injection test data |

## Example Test Payloads

### Valid Venue Creation
```json
{
  "name": "Royal Palace Banquet Hall",
  "type": "BANQUET",
  "description": "Luxury wedding venue",
  "address": "123 MG Road",
  "city": "Bangalore",
  "area": "Indiranagar",
  "pincode": "560038",
  "capacityMin": 100,
  "capacityMax": 500,
  "basePriceMorning": 50000,
  "basePriceEvening": 80000,
  "basePriceFullDay": 120000,
  "amenities": "Parking, AC, Power backup",
  "policies": "No smoking allowed"
}
```

### Invalid Payloads (for negative tests)

#### Negative Capacity
```json
{
  "capacityMin": -10,
  "capacityMax": 100
}
```

#### Invalid Name
```json
{
  "name": ""
}
```

#### SQL Injection Attempt
```json
{
  "city": "'; DROP TABLE venues; --"
}
```

## Jest Configuration Tips

### Coverage Configuration ([`jest.config.js`](jest.config.js))

```javascript
module.exports = {
  // Set coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Module name mapping for clean imports
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
```

### E2E Configuration ([`test/jest-e2e.json`](test/jest-e2e.json))

```json
{
  "rootDir": ".",
  "testRegex": ".e2e-spec.ts$",
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  }
}
```

## Common Testing Patterns

### Testing Protected Routes

```typescript
it('should create venue with auth', async () => {
  const response = await request(httpServer)
    .post('/venues')
    .set('Authorization', `Bearer ${validToken}`)
    .send(validVenueData);
  
  expect(response.status).toBe(201);
});
```

### Testing Error Cases

```typescript
it('should return 404 for non-existent venue', async () => {
  mockPrismaService.venue.findUnique.mockResolvedValue(null);
  
  const response = await request(httpServer).get('/venues/999');
  
  expect(response.status).toBe(404);
});
```

### Testing Pagination

```typescript
it('should paginate correctly', async () => {
  mockPrismaService.venue.findMany.mockResolvedValue(venues);
  mockPrismaService.venue.count.mockResolvedValue(100);
  
  const response = await request(httpServer)
    .get('/venues')
    .query({ page: 2, limit: 10 });
  
  expect(response.body.page).toBe(2);
  expect(response.body.totalPages).toBe(10);
});
```

## Best Practices

1. **Use descriptive test names**: Start with `should` and describe the expected behavior
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Mock external dependencies**: Prisma, Cache, etc.
4. **Test edge cases**: Empty arrays, null values, boundary conditions
5. **Test security**: Auth failures, SQL injection, unauthorized access
6. **Keep tests isolated**: Each test should be independent
7. **Use test utilities**: Reuse common mocks and factories

## Troubleshooting

### Tests not running
- Check Jest configuration in `jest.config.js`
- Ensure files match the `testRegex` pattern

### Type errors in tests
- Use type casting (`as any`) when mocking complex objects
- Import types from `@prisma/client`

### E2E tests failing
- Ensure database is accessible
- Check mock services are properly overridden
- Verify test setup runs before tests

## Dependencies Added

The following dependencies were added to support testing:

```json
{
  "@types/express": "^5.0.0",
  "supertest": "^7.0.0"
}
```

Install with:
```bash
npm install
```

## Coverage Report

Run coverage to see detailed results:
```bash
npm run test:cov
```

Coverage reports are generated in:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/coverage-final.json` - JSON report
