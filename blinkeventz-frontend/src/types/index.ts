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
  city: string;
  capacity: number;
  price: number;
  priceUnit: 'per_day' | 'per_hour';
  images: string[];
  amenities: string[];
  rating: number;
  ownerId: string;
}

export interface Vendor {
  id: string;
  name: string;
  description: string;
  serviceType: string;
  city: string;
  priceRange: string;
  images: string[];
  rating: number;
  ownerId: string;
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
