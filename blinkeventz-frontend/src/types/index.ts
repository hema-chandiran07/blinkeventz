export type Role = 'CUSTOMER' | 'VENDOR' | 'VENUE_OWNER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  area: string;
  city: string;
  capacity: number;
  price: number;
  basePrice: number;
  priceUnit: 'per_day' | 'per_hour';
  images: string[];
  amenities: string[];
  rating: number;
  ownerId: string;
}

export interface Vendor {
  id: string;
  name: string;
  businessName?: string;
  description: string;
  serviceType: string;
  city: string;
  area?: string;
  priceRange: string;
  basePrice?: number;
  images: string[];
  rating: number;
  ownerId: string;
  verificationStatus?: string;
}

export interface Service {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
}

export interface Event {
  id: string;
  customerId: string;
  name: string;
  date: string;
  guestCount: number;
  city: string;
  status: 'planning' | 'booked' | 'completed' | 'cancelled';
  venueId?: string;
  vendorIds: string[];
  totalCost: number;
}

export interface Booking {
  id: string;
  eventId: string;
  serviceId?: string; // or venueId
  venueId?: string;
  date: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  price: number;
}

// Cart & Checkout Types
export interface CartItem {
  id: string;
  type: 'venue' | 'vendor' | 'service';
  name: string;
  description: string;
  price: number;
  image?: string;
  quantity?: number;
  metadata?: {
    date?: string;
    guestCount?: number;
    serviceType?: string;
    city?: string;
    [key: string]: unknown;
  };
}

export interface CartSummary {
  subtotal: number;
  taxes: number;
  serviceFee: number;
  total: number;
}

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';
export type UPIProvider = 'gpay' | 'phonepe' | 'paytm' | 'bhim';
export type WalletProvider = 'paytm' | 'phonepe' | 'amazonpay' | 'mobikwik';
export type BankCode = 'HDFC' | 'ICICI' | 'SBI' | 'AXIS' | 'KOTAK' | 'IDFC' | 'YES';

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  paymentMethod: PaymentMethod;
  upiProvider?: UPIProvider;
  upiId?: string;
  walletProvider?: WalletProvider;
  bankCode?: BankCode;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
}

export interface CheckoutErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  upiId?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
}
