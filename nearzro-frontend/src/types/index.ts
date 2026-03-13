/**
 * NearZro - Production Types (Prisma-Based)
 * 
 * These types are generated from the Prisma schema to ensure
 * end-to-end type safety from database to frontend.
 * 
 * @see prisma/schema.prisma
 */

// ==================== PRISMA ENUMS ====================

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

export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'HOLD';

export type CartStatus = 'ACTIVE' | 'LOCKED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export type ItemType = 'VENUE' | 'VENDOR_SERVICE' | 'ADDON';

export type PaymentProvider = 'RAZORPAY';

export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type ExpressPlanType = 'FIXED' | 'CUSTOMIZED';

export type ExpressStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export type KycDocType = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENSE';

export type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type EventStatus = 
  | 'INQUIRY' 
  | 'PENDING_PAYMENT' 
  | 'CONFIRMED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type ItemTypeForEvent = 'VENUE' | 'VENDOR_SERVICE' | 'ADDON';

export type EventServiceStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

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

export type NotificationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'PARTIAL' | 'FAILED';

export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

export type AuditSeverity = 'LOW' | 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

export type AuditSource = 'USER' | 'SYSTEM' | 'ADMIN' | 'SERVICE';

export type AuditOutboxStatus = 'PENDING' | 'PROCESSED' | 'FAILED' | 'DEAD_LETTER';

// ==================== CORE MODELS ====================

export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  passwordHash: string | null;
  googleId: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string; // ISO DateTime
  updatedAt: string; // ISO DateTime
  // Relations
  vendor?: Vendor;
  venues?: Venue[];
  customerProfile?: CustomerProfile;
}

export interface CustomerProfile {
  id: number;
  userId: number;
  preferredCity: string | null;
  notes: string | null;
  // Relations
  user: User;
}

// ==================== VENDOR & SERVICES ====================

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
  // Relations
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
  // Relations
  vendor?: Vendor;
}

// ==================== VENUES ====================

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
  // Relations
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
  // Relations
  venue?: Venue;
}

export interface AvailabilitySlot {
  id: number;
  entityType: 'VENUE' | 'VENDOR';
  entityId: number;
  date: string; // ISO DateTime
  timeSlot: string;
  status: SlotStatus;
  createdAt: string;
  updatedAt: string;
}

// ==================== BOOKINGS ====================

export interface Booking {
  id: number;
  userId: number;
  slotId: number;
  createdAt: string;
  // Relations
  slot?: AvailabilitySlot;
  user?: User;
}

// ==================== CART ====================

export interface Cart {
  id: number;
  userId: number;
  status: CartStatus;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: User;
  items?: CartItem[];
}

export interface CartItem {
  id: number | string;
  cartId: number;
  itemType: ItemType;
  venueId: number | null;
  vendorServiceId: number | null;
  addonId: number | null;
  date: string | null;
  timeSlot: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  meta: any | null; // JSON
  createdAt: string;
  updatedAt: string;
  // Extended properties for cart UI (not in Prisma schema)
  name?: string;
  description?: string;
  image?: string;
  // Relations
  cart?: Cart;
  vendorService?: VendorService;
  venue?: Venue;
}

// ==================== EVENTS ====================

export interface Event {
  id: number;
  customerId: number;
  assignedManagerId: number | null;
  eventType: string;
  title: string | null;
  date: string; // ISO DateTime
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
  // Relations
  customer?: User;
  assignedManager?: User;
  venue?: Venue;
  services?: EventService[];
}

export interface EventService {
  id: number;
  eventId: number;
  itemType: ItemTypeForEvent;
  venueId: number | null;
  vendorServiceId: number | null;
  addonId: number | null;
  serviceType: ServiceType | null;
  finalPrice: number;
  notes: string | null;
  status: EventServiceStatus;
  createdAt: string;
  updatedAt: string;
  // Relations
  event?: Event;
  vendorService?: VendorService;
  venue?: Venue;
}

// ==================== PAYMENTS ====================

export interface Payment {
  id: number;
  userId: number;
  cartId: number;
  provider: PaymentProvider;
  providerOrderId: string;
  providerPaymentId: string | null;
  signature: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  eventId: number | null;
  // Relations
  cart?: Cart;
  event?: Event;
  user?: User;
}

// ==================== AI PLANNER ====================

export interface AIPlan {
  id: number;
  userId: number;
  EventId: number | null;
  budget: number;
  city: string;
  area: string;
  guestCount: number;
  planJson: any | null; // JSON
  status: 'GENERATED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  // Relations
  Event?: Event;
  user?: User;
}

// ==================== EXPRESS REQUESTS ====================

export interface ExpressRequest {
  id: number;
  userId: number;
  EventId: number;
  planType: ExpressPlanType;
  status: ExpressStatus;
  startedAt: string;
  expiresAt: string;
  expressFee: number;
  createdAt: string;
  updatedAt: string;
  // Relations
  Event?: Event;
  user?: User;
}

// ==================== KYC & BANKING ====================

export interface KycDocument {
  id: number;
  userId: number;
  docType: KycDocType;
  docNumber: string;
  docFileUrl: string;
  status: KycStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: User;
}

export interface BankAccount {
  id: number;
  userId: number;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  branchName: string | null;
  createdAt: string;
  updatedAt: string;
  isVerified: boolean;
  referenceId: string;
  // Relations
  user?: User;
}

// ==================== NOTIFICATIONS ====================

export interface Notification {
  id: number;
  userId: number;
  eventId: number | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata: any | null; // JSON
  read: boolean;
  readAt: string | null;
  status: NotificationStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Relations
  event?: Event;
  user?: User;
}

export interface NotificationPreference {
  id: number;
  userId: number;
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
  // Relations
  user?: User;
}

export interface NotificationDelivery {
  id: number;
  notificationId: number;
  channel: NotificationChannel;
  provider: string | null;
  status: DeliveryStatus;
  attempts: number;
  maxAttempts: number;
  providerRef: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  notification?: Notification;
}

// ==================== AUDIT LOGS ====================

export interface AuditLog {
  id: number; // BigInt
  entityType: string;
  entityId: string | null;
  action: string;
  severity: AuditSeverity;
  source: AuditSource;
  actorId: number | null;
  actorEmail: string | null;
  actorRole: Role | null;
  description: string | null;
  oldValue: any | null; // JSON
  newValue: any | null; // JSON
  diff: any | null; // JSON
  metadata: any | null; // JSON
  requestId: string | null;
  sessionId: string | null;
  traceId: string | null;
  isSensitive: boolean;
  retentionUntil: string | null;
  occurredAt: string;
  createdAt: string;
}

// ==================== API REQUEST/RESPONSE TYPES ====================

export interface AuthResponse {
  user: {
    id: number;
    name: string;
    email: string | null;
    role: Role;
  };
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateVenueRequest {
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

export interface CreateVendorServiceRequest {
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

export interface CreateEventRequest {
  eventType: string;
  title?: string;
  date: string;
  timeSlot: string;
  city: string;
  area?: string;
  venueId?: number;
  guestCount: number;
  isExpress?: boolean;
}

export interface CreateAIPlanRequest {
  budget: number;
  eventType: string;
  city: string;
  area: string;
  guestCount: number;
  eventId?: number;
}

export interface CartItemRequest {
  itemType: ItemType;
  venueId?: number;
  vendorServiceId?: number;
  addonId?: number;
  quantity?: number;
  unitPrice: number;
  date?: string;
  timeSlot?: string;
  meta?: any;
}

export interface PaymentRequest {
  cartId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

// ==================== DASHBOARD TYPES ====================

export interface DashboardStats {
  totalEvents?: number;
  upcomingEvents?: number;
  totalRevenue?: number;
  activeBookings?: number;
  pendingApprovals?: number;
}

export interface CustomerDashboardData {
  events: Event[];
  bookings: Booking[];
  stats: DashboardStats;
}

export interface VendorDashboardData {
  services: VendorService[];
  bookings: Booking[];
  stats: DashboardStats;
}

export interface VenueOwnerDashboardData {
  venues: Venue[];
  bookings: Booking[];
  stats: DashboardStats;
}

export interface AdminDashboardData {
  totalUsers: number;
  totalVenues: number;
  totalVendors: number;
  pendingApprovals: number;
  totalEvents: number;
  totalRevenue: number;
}

// ==================== UTILITY TYPES ====================

export type WithRelations<T, Relations extends keyof T> = {
  [K in keyof T]: K extends Relations ? NonNullable<T[K]> : T[K];
};

export type VendorWithServices = WithRelations<Vendor, 'services'>;
export type VenueWithPhotos = WithRelations<Venue, 'photos'>;
export type EventWithServices = WithRelations<Event, 'services'>;
export type CartWithItems = WithRelations<Cart, 'items'>;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  error: string;
  statusCode: number;
  details?: any;
}

// ==================== CART SUMMARY ====================

export interface CartSummary {
  subtotal: number;
  taxes: number;
  serviceFee: number;
  total: number;
}

// ==================== CHECKOUT TYPES ====================

export type UPIProvider = 'googlepay' | 'phonepe' | 'paytm' | 'bhim' | 'gpay' | 'other';
export type WalletProvider = 'paytm' | 'phonepe' | 'amazon_pay' | 'freecharge';
export type BankCode = 'SBIN' | 'HDFC' | 'ICIC' | 'AXIS' | 'PUNB' | 'BOBM' | 'ALLA' | 'CORP' | 'INDB' | 'KKBK';

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  eventType?: string;
  eventDate?: string;
  eventTime?: string;
  venueName?: string;
  eventAddress?: string;
  // Payment method fields
  paymentMethod?: 'upi' | 'card' | 'netbanking' | 'wallet';
  upiProvider?: UPIProvider;
  upiId?: string;
  walletProvider?: WalletProvider;
  bankCode?: BankCode;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  cardName?: string;
  expiry?: string;
  cvc?: string;
}

export interface CheckoutErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  eventType?: string;
  eventDate?: string;
  eventTime?: string;
  // Payment errors
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  upiId?: string;
}
