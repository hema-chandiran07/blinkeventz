/**
 * Venue Availability Service - Real Backend Integration
 * NO MOCK DATA - All calls go to actual backend API
 * 
 * CORRECTED PATHS to match backend:
 * - Backend: /availability/:venueId (NOT /venues/:venueId/availability)
 * - Backend: /availability/vendors/:vendorId/availability (NOT /vendors/:vendorId/availability)
 * - Backend: /availability/venues/:venueId/availability/check
 * - Backend: /availability/venues/:venueId/availability/date
 */

import api from '@/lib/api';
import type { TimeSlot, TimeSlotType } from "@/components/venues/availability-calendar";

export interface AvailabilitySlot {
  id: number;
  entityType: 'VENUE' | 'VENDOR';
  entityId: number;
  date: string;
  timeSlot: string;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED" | "HOLD";
  createdAt: string;
  updatedAt: string;
}

export interface VenueAvailabilityResponse {
  venueId: string;
  month: number;
  year: number;
  slots: AvailabilitySlot[];
}

export interface BookingPayload {
  venueId: string;
  date: string;
  timeSlot: TimeSlotType;
  guestCount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface BookingValidationResult {
  isValid: boolean;
  message: string;
  errorCode?: "DATE_PAST" | "SLOT_BOOKED" | "SLOT_BLOCKED" | "SLOT_ON_HOLD" | "VALIDATION_ERROR";
}

/**
 * Get venue availability for a specific month from backend
 * FIXED: Changed from /venues/:venueId/availability to /availability/:venueId
 */
export const getVenueAvailability = async (
  venueId: string,
  month?: number,
  year?: number
): Promise<AvailabilitySlot[]> => {
  try {
    // CORRECTED PATH: Backend has /availability/:venueId
    let url = `/availability/${venueId}`;
    const params: string[] = [];

    if (month !== undefined && year !== undefined) {
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();
      params.push(`startDate=${startDate}`);
      params.push(`endDate=${endDate}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch venue availability:', error);
    return [];
  }
};

/**
 * Get vendor availability for a specific month from backend
 * FIXED: Changed from /vendors/:vendorId/availability to /availability/vendors/:vendorId/availability
 */
export const getVendorAvailability = async (
  vendorId: string,
  month?: number,
  year?: number
): Promise<AvailabilitySlot[]> => {
  try {
    // CORRECTED PATH: Backend has /availability/vendors/:vendorId/availability
    let url = `/availability/vendors/${vendorId}/availability`;
    const params: string[] = [];

    if (month !== undefined && year !== undefined) {
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();
      params.push(`startDate=${startDate}`);
      params.push(`endDate=${endDate}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch vendor availability:', error);
    return [];
  }
};

/**
 * Check if a slot is available
 * FIXED: Changed from /venues/:venueId/availability/check to /availability/venues/:venueId/availability/check
 */
export const checkSlotAvailability = async (
  venueId: string,
  date: string,
  timeSlot: string
): Promise<BookingValidationResult> => {
  try {
    // CORRECTED PATH: Backend has /availability/venues/:venueId/availability/check
    const response = await api.get(`/availability/venues/${venueId}/availability/check`, {
      params: { date, timeSlot }
    });

    return {
      isValid: response.data.available,
      message: response.data.available ? 'Slot is available' : 'Slot is not available'
    };
  } catch (error: any) {
    return {
      isValid: false,
      message: error.response?.data?.message || 'Failed to check availability',
      errorCode: 'VALIDATION_ERROR'
    };
  }
};

/**
 * Get availability for a specific date
 * FIXED: Changed from /venues/:venueId/availability/date to /availability/venues/:venueId/availability/date
 */
export const getAvailabilityForDate = async (
  venueId: string,
  date: string
): Promise<AvailabilitySlot[]> => {
  try {
    // CORRECTED PATH: Backend has /availability/venues/:venueId/availability/date
    const response = await api.get(`/availability/venues/${venueId}/availability/date`, {
      params: { date }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch availability for date:', error);
    return [];
  }
};

/**
 * Book a venue slot
 */
export const bookVenue = async (payload: BookingPayload): Promise<any> => {
  try {
    const response = await api.post('/booking/create', payload);
    return response.data;
  } catch (error: any) {
    const result: BookingValidationResult = {
      isValid: false,
      message: error.response?.data?.message || 'Booking failed',
      errorCode: error.response?.data?.errorCode || 'VALIDATION_ERROR'
    };
    throw result;
  }
};

/**
 * Block a slot (venue owner only)
 */
export const blockSlot = async (
  slotId: number,
  status: string = 'BLOCKED',
  reason?: string
): Promise<void> => {
  try {
    await api.patch(`/availability/slots/${slotId}`, {
      status,
      reason
    });
  } catch (error) {
    console.error('Failed to block slot:', error);
    throw error;
  }
};

/**
 * Unblock a slot (venue owner only)
 */
export const unblockSlot = async (slotId: number): Promise<void> => {
  try {
    await api.patch(`/availability/slots/${slotId}`, {
      status: 'AVAILABLE'
    });
  } catch (error) {
    console.error('Failed to unblock slot:', error);
    throw error;
  }
};

/**
 * Block multiple slots (venue owner)
 */
export const blockMultipleSlots = async (
  venueId: string,
  dates: string[],
  timeSlots: string[],
  reason?: string
): Promise<number> => {
  try {
    const response = await api.post('/availability/venue-owner/blocked-slots', {
      venueId,
      dates,
      timeSlots,
      reason
    });
    return response.data.blocked;
  } catch (error) {
    console.error('Failed to block multiple slots:', error);
    throw error;
  }
};

/**
 * Unblock multiple slots (venue owner)
 */
export const unblockMultipleSlots = async (
  venueId: string,
  dates: string[],
  timeSlots: string[]
): Promise<number> => {
  try {
    const response = await api.delete('/availability/venue-owner/blocked-slots', {
      data: { venueId, dates, timeSlots }
    });
    return response.data.unblocked;
  } catch (error) {
    console.error('Failed to unblock multiple slots:', error);
    throw error;
  }
};

/**
 * Get blocked slots for venue owner
 */
export const getBlockedSlots = async (): Promise<AvailabilitySlot[]> => {
  try {
    const response = await api.get('/availability/venue-owner/blocked-slots');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch blocked slots:', error);
    return [];
  }
};

/**
 * Get slot status label
 */
export const getSlotStatus = (slot: AvailabilitySlot): string => {
  switch (slot.status) {
    case 'AVAILABLE':
      return 'Available';
    case 'BOOKED':
      return 'Booked';
    case 'BLOCKED':
      return 'Blocked';
    case 'HOLD':
      return 'On Hold';
    default:
      return 'Unknown';
  }
};

/**
 * Get slot status color class
 */
export const getSlotStatusClass = (slot: AvailabilitySlot): string => {
  switch (slot.status) {
    case 'AVAILABLE':
      return 'bg-success/10 text-success border-success/20';
    case 'BOOKED':
      return 'bg-error/10 text-error border-error/20';
    case 'BLOCKED':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'HOLD':
      return 'bg-info/10 text-info border-info/20';
    default:
      return 'bg-silver-900/10 text-silver-400 border-silver-700/20';
  }
};

/**
 * Get available slots for a specific date
 * FIXED: Changed from /venues/:venueId/availability/date to /availability/venues/:venueId/availability/date
 */
export const getAvailableSlotsForDate = async (
  venueId: string,
  date: string
): Promise<TimeSlot[]> => {
  try {
    // CORRECTED PATH: Backend has /availability/venues/:venueId/availability/date
    const response = await api.get(`/availability/venues/${venueId}/availability/date`, {
      params: { date }
    });

    const TIME_SLOTS_CONFIG: Omit<TimeSlot, "available" | "id">[] = [
      { type: "morning", label: "Morning", time: "6:00 AM - 12:00 PM", multiplier: 0.6 },
      { type: "evening", label: "Evening", time: "4:00 PM - 10:00 PM", multiplier: 0.8 },
      { type: "full_day", label: "Full Day", time: "6:00 AM - 12:00 AM", multiplier: 1.0 },
      { type: "night", label: "Night", time: "8:00 PM - 2:00 AM", multiplier: 0.7 },
    ];

    return TIME_SLOTS_CONFIG.map((slot) => {
      const venueSlot = response.data.find(
        (s: any) => s.date.split('T')[0] === date && s.timeSlot === slot.type
      );

      return {
        ...slot,
        id: `${date}-${slot.type}`,
        available: venueSlot ? venueSlot.status === "AVAILABLE" : true,
      };
    });
  } catch (error) {
    console.error('Failed to fetch available slots:', error);
    return [];
  }
};
