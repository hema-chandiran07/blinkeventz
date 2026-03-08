"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageCircle, Shield, Globe, CheckCircle2, Calendar as CalendarIcon, Clock, DollarSign } from "lucide-react";
import { AddToCartButton } from "./add-to-cart-button";
import { BookNowButton } from "./book-now-button";
import { AvailabilityCalendar, type TimeSlot, type TimeSlotType } from "@/components/venues/availability-calendar";
import type { Venue } from "@/types";

interface VenueBookingSidebarProps {
  venue: Venue;
}

const TIME_SLOT_MULTIPLIERS: Record<TimeSlotType, number> = {
  morning: 0.6,
  evening: 0.8,
  full_day: 1.0,
  night: 0.7,
};

const TIME_SLOT_LABELS: Record<TimeSlotType, string> = {
  morning: "Morning (6 AM - 12 PM)",
  evening: "Evening (4 PM - 10 PM)",
  full_day: "Full Day (6 AM - 12 AM)",
  night: "Night (8 PM - 2 AM)",
};

export function VenueBookingSidebar({ venue }: VenueBookingSidebarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotType | null>(null);

  // Calculate dynamic price based on selected time slot
  const basePrice = venue.basePriceEvening || venue.basePriceFullDay || venue.basePriceMorning || 150000;
  const selectedPrice = selectedSlot 
    ? Math.round(basePrice * TIME_SLOT_MULTIPLIERS[selectedSlot])
    : basePrice;

  const handleDateSelect = (date: Date, slot: TimeSlot) => {
    setSelectedDate(date);
    setSelectedSlot(slot.type);
  };

  const isReadyToBook = selectedDate && selectedSlot;

  return (
    <div className="lg:col-span-1">
      <div className="sticky top-6 space-y-6">
        {/* Booking Card */}
        <div className="bg-white rounded-2xl border border-silver-200 p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-black mb-2">Book This Venue</h3>
            <p className="text-sm text-neutral-600">Select date and time to see pricing</p>
          </div>

          {/* Dynamic Pricing Display */}
          <div className="mb-6 p-4 bg-gradient-to-r from-silver-50 to-silver-100 rounded-xl border border-silver-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-neutral-600">Base Price</div>
                <div className="text-lg font-semibold text-neutral-800">₹{basePrice.toLocaleString("en-IN")}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-neutral-600">Your Price</div>
                <div className="text-2xl font-bold text-black">₹{selectedPrice.toLocaleString("en-IN")}</div>
              </div>
            </div>

            {selectedSlot && (
              <div className="flex items-center gap-2 text-xs text-neutral-800 bg-white/50 rounded-lg p-2">
                <Clock className="h-3 w-3" />
                <span className="font-medium">{TIME_SLOT_LABELS[selectedSlot]}</span>
                <span className="ml-auto font-bold">
                  {Math.round(TIME_SLOT_MULTIPLIERS[selectedSlot] * 100)}% of base
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <BookNowButton
              venueId={String(venue.id)}
              venueName={venue.name}
              price={selectedPrice}
              basePrice={basePrice}
              selectedTime={selectedSlot ? TIME_SLOT_LABELS[selectedSlot] : undefined}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
            />
            <AddToCartButton
              itemId={`venue-${venue.id}-${selectedDate?.toISOString()}-${selectedSlot}`}
              itemType="venue"
              itemName={`${venue.name} - ${selectedSlot ? TIME_SLOT_LABELS[selectedSlot] : 'Booking'}`}
              itemDescription={venue.description || ""}
              itemPrice={selectedPrice}
              basePrice={basePrice}
              itemImage={venue.photos?.[0]?.url}
              metadata={{
                city: venue.city,
                area: venue.area,
                capacity: venue.capacityMax,
                address: venue.address,
                timeSlot: selectedSlot,
                timeSlotLabel: selectedSlot ? TIME_SLOT_LABELS[selectedSlot] : undefined,
                basePrice: basePrice,
                selectedDate: selectedDate?.toISOString(),
                selectedSlot,
              }}
              disabled={!isReadyToBook}
            />
          </div>

          {/* Selection Summary */}
          {isReadyToBook ? (
            <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Selection Ready</p>
                  <div className="text-xs text-green-700 mt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{selectedDate.toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{TIME_SLOT_LABELS[selectedSlot]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      <span>₹{selectedPrice.toLocaleString("en-IN")} (Save ₹{(basePrice - selectedPrice).toLocaleString("en-IN")})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Select Date & Time</p>
                  <p className="text-xs text-blue-700 mt-1">Choose your event date from the calendar below to get dynamic pricing</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-4 border-t text-sm text-neutral-700">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-neutral-600" />
              <span>Schedule a visit</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-neutral-600" />
              <span>Contact venue manager</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-neutral-600" />
              <span>Free consultation</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <Shield className="h-4 w-4" />
              <span>Secure Booking</span>
            </div>
            <p className="text-xs text-green-600 mt-1">Your payment is protected until event is completed</p>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
              <Globe className="h-4 w-4" />
              <span>Virtual Tour</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">360° venue tour available</p>
          </div>
        </div>

        {/* Availability Calendar */}
        <AvailabilityCalendar
          venueId={String(venue.id)}
          basePrice={basePrice}
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
        />

        {/* Trust Badges */}
        <div className="bg-white rounded-2xl border border-silver-100 p-6 shadow-sm">
          <h4 className="font-semibold text-black mb-4">Why Book This Venue</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-neutral-700">Best Price Guarantee</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-neutral-700">Verified Venue</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-neutral-700">24/7 Support</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-neutral-700">Free Cancellation</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-br from-silver-50 to-silver-100 rounded-2xl border border-silver-200 p-6">
          <h4 className="font-semibold text-black mb-4">Venue Contact</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-neutral-700">
              <Phone className="h-4 w-4 text-neutral-700" />
              <span>+91 44 1234 5678</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-700">
              <Mail className="h-4 w-4 text-neutral-700" />
              <span>bookings@venue.com</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-700">
              <CalendarIcon className="h-4 w-4 text-neutral-700" />
              <span>9 AM - 9 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
