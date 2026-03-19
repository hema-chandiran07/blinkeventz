/**
 * Faker Utility
 * NearZro Event Management Platform
 * 
 * Simple faker functions for generating test data.
 * Provides consistent, realistic test data generation.
 */

// Simple ID generator
let idCounter = 1000;
export const generateId = (): number => ++idCounter;

// Simple random string generator
export const randomString = (length: number = 10): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Simple random email generator
export const randomEmail = (): string => {
  const name = randomString(8).toLowerCase();
  const domains = ['example.com', 'test.com', 'nearzro.com', 'demo.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${name}@${domain}`;
};

// Simple random phone number generator
export const randomPhone = (): string => {
  const prefixes = ['+91', '+1', '+44', '+91'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 9000000000 + 1000000000);
  return `${prefix}${number}`;
};

// Generate random date within range
export const randomDate = (start: Date = new Date(2020, 0, 1), end: Date = new Date()): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate random boolean
export const randomBoolean = (): boolean => Math.random() > 0.5;

// Pick random element from array
export const randomElement = <T>(array: T[]): T => 
  array[Math.floor(Math.random() * array.length)];

// Generate random number within range
export const randomNumber = (min: number = 0, max: number = 100): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Generate random price
export const randomPrice = (min: number = 100, max: number = 100000): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * User faker functions
 */
export const faker = {
  user: () => ({
    id: generateId(),
    name: `User ${randomString(6)}`,
    email: randomEmail(),
    phone: randomPhone(),
    password: randomString(12),
    role: randomElement(['USER', 'VENDOR', 'ADMIN']),
    emailVerified: randomBoolean(),
    phoneVerified: randomBoolean(),
    createdAt: randomDate(),
    updatedAt: randomDate(),
  }),

  /**
   * Vendor faker functions
   */
  vendor: (overrides?: Record<string, unknown>) => ({
    id: generateId(),
    userId: generateId(),
    businessName: `${randomElement(['Royal', 'Premium', 'Elite', 'Grand', 'Star'])} ${randomElement(['Catering', 'Decor', 'Photography', 'Music', 'Venue'])}`,
    description: `Description for ${randomString(8)}`,
    city: randomElement(['Chennai', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi']),
    area: randomElement(['Velachery', 'MG Road', 'Bandra', 'Jubilee Hills', 'Connaught Place']),
    serviceRadiusKm: randomNumber(5, 50),
    verificationStatus: randomElement(['PENDING', 'VERIFIED', 'REJECTED']),
    username: `vendor_${randomString(6).toLowerCase()}`,
    rejectionReason: null,
    images: [],
    createdAt: randomDate(),
    updatedAt: randomDate(),
    ...overrides,
  }),

  /**
   * Vendor service faker functions
   */
  vendorService: (overrides?: Record<string, unknown>) => ({
    id: generateId(),
    vendorId: generateId(),
    name: `${randomElement(['Wedding', 'Corporate', 'Birthday', 'Anniversary'])} ${randomElement(['Catering', 'Package', 'Service'])}`,
    serviceType: randomElement(['CATERING', 'DECOR', 'PHOTOGRAPHY', 'MUSIC', 'VENUE']),
    pricingModel: randomElement(['PER_EVENT', 'PER_PERSON', 'PER_HOUR', 'FIXED']),
    baseRate: randomPrice(5000, 200000),
    minGuests: randomNumber(10, 100),
    maxGuests: randomNumber(200, 1000),
    description: `Service description for ${randomString(8)}`,
    inclusions: 'Staff, Equipment, Setup',
    exclusions: 'Decorations, Flowers',
    isActive: randomBoolean(),
    createdAt: randomDate(),
    updatedAt: randomDate(),
    ...overrides,
  }),

  /**
   * Event faker functions
   */
  event: (overrides?: Record<string, unknown>) => ({
    id: generateId(),
    userId: generateId(),
    name: `${randomElement(['Wedding', 'Corporate', 'Birthday', 'Conference'])} of ${randomString(6)}`,
    description: `Event description ${randomString(10)}`,
    date: randomDate(new Date(), new Date(2025, 11, 31)),
    city: randomElement(['Chennai', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi']),
    area: randomElement(['Velachery', 'MG Road', 'Bandra', 'Jubilee Hills', 'Connaught Place']),
    expectedGuests: randomNumber(50, 500),
    budget: randomPrice(50000, 500000),
    status: randomElement(['PLANNING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
    createdAt: randomDate(),
    updatedAt: randomDate(),
    ...overrides,
  }),

  /**
   * Booking faker functions
   */
  booking: (overrides?: Record<string, unknown>) => ({
    id: generateId(),
    eventId: generateId(),
    vendorId: generateId(),
    vendorServiceId: generateId(),
    status: randomElement(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
    totalAmount: randomPrice(10000, 200000),
    notes: `Booking notes ${randomString(10)}`,
    createdAt: randomDate(),
    updatedAt: randomDate(),
    ...overrides,
  }),

  /**
   * Payment faker functions
   */
  payment: (overrides?: Record<string, unknown>) => ({
    id: generateId(),
    bookingId: generateId(),
    amount: randomPrice(10000, 200000),
    method: randomElement(['CARD', 'UPI', 'BANK_TRANSFER', 'CASH']),
    status: randomElement(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
    transactionId: `TXN_${randomString(12).toUpperCase()}`,
    createdAt: randomDate(),
    updatedAt: randomDate(),
    ...overrides,
  }),
};

/**
 * Reset faker ID counter (useful between tests)
 */
export const resetFakerIdCounter = (): void => {
  idCounter = 1000;
};

/**
 * Generate an array of faker objects
 */
export const generateArray = <T>(
  generator: () => T,
  count: number = 5,
): T[] => Array.from({ length: count }, generator);
