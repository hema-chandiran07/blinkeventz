import type { TimeSlot, TimeSlotType } from "@/components/venues/availability-calendar";

export interface AvailabilitySlot {
  id: number;
  date: string;
  timeSlot: string;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED" | "HOLD";
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

// Mock availability data store (simulates database)
const mockAvailabilityStore: Map<string, AvailabilitySlot[]> = new Map();

// Initialize mock data for venues
const initializeMockAvailability = (venueId: string) => {
  if (mockAvailabilityStore.has(venueId)) return;

  const slots: AvailabilitySlot[] = [];
  const today = new Date();
  const seed = venueId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Generate 90 days of availability
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    // Generate slots for each day
    const timeSlots = ["morning", "evening", "full_day", "night"];
    timeSlots.forEach((slot, index) => {
      const daySeed = (seed + i + index) % 100;
      let status: AvailabilitySlot["status"] = "AVAILABLE";

      if (daySeed < 15) {
        status = "BOOKED";
      } else if (daySeed < 25) {
        status = "BLOCKED";
      } else if (daySeed < 30) {
        status = "HOLD";
      }

      slots.push({
        id: parseInt(`${seed}${i}${index}`),
        date: dateStr,
        timeSlot: slot,
        status,
      });
    });
  }

  mockAvailabilityStore.set(venueId, slots);
};

// Get availability for a specific month
export const getVenueAvailability = async (
  venueId: string,
  month: number,
  year: number
): Promise<VenueAvailabilityResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  initializeMockAvailability(venueId);
  const allSlots = mockAvailabilityStore.get(venueId) || [];

  // Filter slots for the requested month
  const monthSlots = allSlots.filter((slot) => {
    const slotDate = new Date(slot.date);
    return (
      slotDate.getMonth() === month && slotDate.getFullYear() === year
    );
  });

  return {
    venueId,
    month,
    year,
    slots: monthSlots,
  };
};

// Check if a specific slot is available
export const checkSlotAvailability = async (
  venueId: string,
  date: string,
  timeSlot: TimeSlotType
): Promise<BookingValidationResult> => {
  await new Promise((resolve) => setTimeout(resolve, 200));

  initializeMockAvailability(venueId);
  const allSlots = mockAvailabilityStore.get(venueId) || [];

  // Check if date is in the past
  const slotDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (slotDate < today) {
    return {
      isValid: false,
      message: "Selected date is in the past. Please choose a future date.",
      errorCode: "DATE_PAST",
    };
  }

  // Find the slot
  const slot = allSlots.find(
    (s) => s.date === date && s.timeSlot === timeSlot
  );

  if (!slot) {
    return {
      isValid: true,
      message: "Slot is available",
    };
  }

  switch (slot.status) {
    case "AVAILABLE":
      return {
        isValid: true,
        message: "Slot is available",
      };
    case "BOOKED":
      return {
        isValid: false,
        message: "This time slot is already booked. Please select another date or time.",
        errorCode: "SLOT_BOOKED",
      };
    case "BLOCKED":
      return {
        isValid: false,
        message: "This time slot is blocked by the venue owner. Please select another date or time.",
        errorCode: "SLOT_BLOCKED",
      };
    case "HOLD":
      return {
        isValid: false,
        message: "This time slot is on hold. Please select another date or time.",
        errorCode: "SLOT_ON_HOLD",
      };
    default:
      return {
        isValid: false,
        message: "Unable to verify slot availability.",
        errorCode: "VALIDATION_ERROR",
      };
  }
};

// Book a slot (simulated)
export const bookVenueSlot = async (
  payload: BookingPayload
): Promise<{ success: boolean; bookingId?: string; message: string }> => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Validate slot first
  const validation = await checkSlotAvailability(
    payload.venueId,
    payload.date,
    payload.timeSlot
  );

  if (!validation.isValid) {
    return {
      success: false,
      message: validation.message,
    };
  }

  // Simulate booking creation
  const bookingId = `BK${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Update mock store
  initializeMockAvailability(payload.venueId);
  const allSlots = mockAvailabilityStore.get(payload.venueId) || [];
  const slotIndex = allSlots.findIndex(
    (s) => s.date === payload.date && s.timeSlot === payload.timeSlot
  );

  if (slotIndex !== -1) {
    allSlots[slotIndex].status = "BOOKED";
  }

  return {
    success: true,
    bookingId,
    message: "Venue booked successfully! Your booking confirmation has been sent.",
  };
};

// Block a slot (for venue owners)
export const blockVenueSlot = async (
  venueId: string,
  date: string,
  timeSlot: TimeSlotType,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  initializeMockAvailability(venueId);
  const allSlots = mockAvailabilityStore.get(venueId) || [];
  const slotIndex = allSlots.findIndex(
    (s) => s.date === date && s.timeSlot === timeSlot
  );

  if (slotIndex !== -1) {
    if (allSlots[slotIndex].status === "BOOKED") {
      return {
        success: false,
        message: "Cannot block a slot that is already booked.",
      };
    }
    allSlots[slotIndex].status = "BLOCKED";
  }

  return {
    success: true,
    message: `Slot blocked successfully${reason ? `: ${reason}` : ""}`,
  };
};

// Get available slots for a specific date
export const getAvailableSlotsForDate = async (
  venueId: string,
  date: string
): Promise<TimeSlot[]> => {
  await new Promise((resolve) => setTimeout(resolve, 200));

  initializeMockAvailability(venueId);
  const allSlots = mockAvailabilityStore.get(venueId) || [];

  const TIME_SLOTS_CONFIG: Omit<TimeSlot, "available" | "id">[] = [
    { type: "morning", label: "Morning", time: "6:00 AM - 12:00 PM", multiplier: 0.6 },
    { type: "evening", label: "Evening", time: "4:00 PM - 10:00 PM", multiplier: 0.8 },
    { type: "full_day", label: "Full Day", time: "6:00 AM - 12:00 AM", multiplier: 1.0 },
    { type: "night", label: "Night", time: "8:00 PM - 2:00 AM", multiplier: 0.7 },
  ];

  return TIME_SLOTS_CONFIG.map((slot) => {
    const venueSlot = allSlots.find(
      (s) => s.date === date && s.timeSlot === slot.type
    );

    return {
      ...slot,
      id: `${date}-${slot.type}`,
      available: venueSlot ? venueSlot.status === "AVAILABLE" : true,
    };
  });
};
