/**
 * Backend API Types - Match Prisma Schema Exactly
 * These types ensure frontend-backend type safety
 */

// ==================== ENUMS (from Prisma) ====================

export type Role = 'CUSTOMER' | 'VENDOR' | 'VENUE_OWNER' | 'ADMIN' | 'EVENT_MANAGER' | 'SUPPORT';

export type VendorVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export type ServiceType = 
  | 'CATERING' 
  | 'DECOR' 
  | 'PHOTOGRAPHY' 
  | 'MAKEUP' 
  | 'DJ' 
  | 'MUSIC' 
  | 'CAR_RENTAL' 
  | 'PRIEST' 
  | 'OTHER';

export type VendorPricingModel = 'PER_EVENT' | 'PER_PERSON' | 'PER_DAY' | 'PACKAGE';

export type VenueType = 'HALL' | 'MANDAPAM' | 'LAWN' | 'RESORT' | 'BANQUET';

export type VenueStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELISTED';

export type EventStatus = 
  | 'INQUIRY' 
  | 'PENDING_PAYMENT' 
  | 'CONFIRMED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type CartStatus = 'ACTIVE' | 'LOCKED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

// ==================== USER ====================

export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  passwordHash: string | null;
  googleId: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== VENDOR ====================

export interface Vendor {
  id: number;
  userId: number;
  businessName: string;
  description: string | null;
  city: string;
  area: string;
  serviceRadiusKm: number | null;
  verificationStatus: VendorVerificationStatus;
  createdAt: string;
  updatedAt: string;
  user?: User;
  services?: VendorService[];
}

export interface VendorService {
  id: number;
  vendorId: number;
  name: string;
  serviceType: ServiceType;
  pricingModel: VendorPricingModel;
  baseRate: number;
  minGuests: number | null;
  maxGuests: number | null;
  description: string | null;
  inclusions: string | null;
  exclusions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  vendor?: Vendor;
}

// ==================== VENUE ====================

export interface Venue {
  id: number;
  ownerId: number;
  name: string;
  type: VenueType;
  description: string | null;
  address: string;
  city: string;
  area: string;
  pincode: string;
  capacityMin: number;
  capacityMax: number;
  basePriceMorning: number | null;
  basePriceEvening: number | null;
  basePriceFullDay: number | null;
  amenities: string | null;
  policies: string | null;
  status: VenueStatus;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  photos?: VenuePhoto[];
  events?: Event[];
}

export interface VenuePhoto {
  id: number;
  venueId: number;
  url: string;
  isCover: boolean;
  createdAt: string;
  venue?: Venue;
}

// ==================== EVENT ====================

export interface Event {
  id: number;
  customerId: number;
  assignedManagerId: number | null;
  eventType: string;
  title: string | null;
  date: string;
  timeSlot: string;
  city: string;
  area: string | null;
  venueId: number | null;
  guestCount: number;
  status: EventStatus;
  isExpress: boolean;
  subtotal: number;
  discount: number;
  platformFee: number;
  tax: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  customer?: User;
  venue?: Venue;
  services?: EventService[];
}

export interface EventService {
  id: number;
  eventId: number;
  itemType: 'VENUE' | 'VENDOR_SERVICE' | 'ADDON';
  venueId: number | null;
  vendorServiceId: number | null;
  addonId: number | null;
  serviceType: ServiceType | null;
  finalPrice: number;
  notes: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  event?: Event;
  vendorService?: VendorService;
  venue?: Venue;
}

// ==================== CART ====================

export interface Cart {
  id: number;
  userId: number;
  status: CartStatus;
  createdAt: string;
  updatedAt: string;
  user?: User;
  items?: CartItem[];
}

export interface CartItem {
  id: number;
  cartId: number;
  itemType: 'VENUE' | 'VENDOR_SERVICE' | 'ADDON';
  venueId: number | null;
  vendorServiceId: number | null;
  addonId: number | null;
  date: string | null;
  timeSlot: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  meta: any;
  createdAt: string;
  updatedAt: string;
  cart?: Cart;
  vendorService?: VendorService;
}

// ==================== PAYMENT ====================

export interface Payment {
  id: number;
  userId: number;
  cartId: number;
  provider: 'RAZORPAY';
  providerOrderId: string;
  providerPaymentId: string | null;
  signature: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  eventId: number | null;
  cart?: Cart;
  event?: Event;
  user?: User;
}

// ==================== AI PLAN ====================

export interface AIPlan {
  id: number;
  userId: number;
  EventId: number | null;
  budget: number;
  city: string;
  area: string;
  guestCount: number;
  planJson: any;
  status: 'GENERATED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  Event?: Event;
  user?: User;
}

// ==================== NOTIFICATIONS ====================

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'VENDOR_APPROVED'
  | 'VENDOR_REJECTED'
  | 'VENUE_APPROVED'
  | 'VENUE_REJECTED'
  | 'SERVICE_APPROVED'
  | 'SERVICE_REJECTED'
  | 'EVENT_REMINDER'
  | 'EVENT_CANCELLED'
  | 'SYSTEM_ALERT'
  | 'OTHER';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';

export interface Notification {
  id: number;
  userId: number;
  eventId: number | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata: any | null;
  read: boolean;
  readAt: string | null;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'PARTIAL' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  event?: Event;
  user?: User;
}

// ==================== API RESPONSE TYPES ====================

export interface AuthResponse {
  user: {
    id: number;
    name: string;
    email: string;
    role: Role;
  };
  token: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ==================== FORM DATA TYPES ====================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}

export interface CreateEventFormData {
  eventType: string;
  title: string;
  date: string;
  timeSlot: string;
  city: string;
  area: string;
  guestCount: number;
  venueId?: number;
}

export interface CreateVenueFormData {
  name: string;
  type: VenueType;
  description?: string;
  address: string;
  city: string;
  area: string;
  pincode: string;
  capacityMin: number;
  capacityMax: number;
  basePriceMorning?: number;
  basePriceEvening?: number;
  basePriceFullDay?: number;
  amenities?: string;
  policies?: string;
}

export interface CreateVendorServiceFormData {
  name: string;
  serviceType: ServiceType;
  pricingModel: VendorPricingModel;
  baseRate: number;
  minGuests?: number;
  maxGuests?: number;
  description?: string;
  inclusions?: string;
  exclusions?: string;
}
