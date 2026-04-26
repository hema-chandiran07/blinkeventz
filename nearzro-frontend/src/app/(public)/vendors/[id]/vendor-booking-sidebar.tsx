"use client";

import { useState } from "react";
import { Mail, Phone, MessageCircle, Shield, Globe, CheckCircle2, Calendar as CalendarIcon, Clock, DollarSign, Star, MapPin, Zap, AlertCircle } from "lucide-react";
import { AddToCartButton } from "./add-to-cart-button";
import { BookNowButton } from "./book-now-button";
import { AvailabilityCalendar, type TimeSlot, type TimeSlotType } from "@/components/venues/availability-calendar";
import type { Vendor } from "@/lib/vendors";

interface VendorBookingSidebarProps {
  vendor: Vendor;
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

export function VendorBookingSidebar({ vendor }: VendorBookingSidebarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotType | null>(null);

  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [isExpress, setIsExpress] = useState<boolean>(false);
  const [expressError, setExpressError] = useState<string | null>(null);
  const [vendorArea, setVendorArea] = useState<string>('');

  const classifyTimeSlot = (start: string, end: string): string => {
    const s = parseInt(start.split(':')[0]);
    const e = parseInt(end.split(':')[0]);
    if (s >= 6 && e <= 13) return 'MORNING';
    if (s >= 14 && e <= 21) return 'EVENING';
    return 'FULL_DAY';
  };

  const validateExpress = (date: Date | null, start: string): boolean => {
    if (!isExpress) return true;
    if (!date) return true;
    const eventDateTime = new Date(date);
    const [h, m] = start.split(':').map(Number);
    eventDateTime.setHours(h, m, 0, 0);
    const hoursUntil = (eventDateTime.getTime() - Date.now()) / 3600000;
    const minHours = 2; // dynamic per area later
    if (hoursUntil < minHours) {
      const earliest = new Date(Date.now() + minHours * 3600000);
      setExpressError(
        `Express requires ${minHours}h lead time. Earliest: ${earliest.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
      );
      return false;
    }
    setExpressError(null);
    return true;
  };

  const basePrice = vendor.basePrice || 35000;
  const selectedPrice = selectedSlot 
    ? Math.round(basePrice * TIME_SLOT_MULTIPLIERS[selectedSlot])
    : basePrice;

  const handleDateSelect = (date: Date, slot: TimeSlot) => {
    setSelectedDate(date);
    setSelectedSlot(slot.type);
  };

  const isReadyToBook = selectedDate && startTime && endTime;

  // Use the new classification instead of the calendar slot
  const actualSlot = classifyTimeSlot(startTime, endTime) as TimeSlotType;
  const timeSlotLower = actualSlot.toLowerCase() as TimeSlotType;
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-6 space-y-6">
        {/* Booking Card */}
        <div className="bg-white rounded-2xl border border-silver-200 p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-black mb-2">Book This Vendor</h3>
            <p className="text-sm text-neutral-600">Select date and time to see pricing</p>
          </div>

          {/* Vendor Info */}
          <div className="mb-6 p-4 bg-gradient-to-r from-silver-50 to-silver-100 rounded-xl border border-silver-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-silver-200 flex items-center justify-center">
                <Star className="h-6 w-6 text-neutral-800" />
              </div>
              <div>
                <p className="font-semibold text-black">{vendor.businessName || vendor.name}</p>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{vendor.rating || 4.5}</span>
                  <span className="text-neutral-600">({vendor.verificationStatus === "VERIFIED" ? "Verified" : "Pending"})</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-neutral-700 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Response time: ~2 hours</span>
            </div>
          </div>

          {/* Dynamic Pricing Display */}
          <div className="mb-6 p-4 bg-silver-50 rounded-xl border border-silver-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-neutral-600">Base Price</div>
                <div className="text-lg font-semibold text-neutral-800">₹{basePrice.toLocaleString("en-IN")}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-neutral-600">Your Price</div>
                <div className="text-2xl font-bold text-neutral-800">₹{selectedPrice.toLocaleString("en-IN")}</div>
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

          {/* Custom Time Selection (Overrides Calendar Slot) */}
          <div className="mb-6 space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-black">Event Time</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      validateExpress(selectedDate, e.target.value);
                    }}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-black text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-black text-sm focus:border-black focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                Slot: {classifyTimeSlot(startTime, endTime).replace('_', ' ')} •
                Duration: {Math.max(0, parseInt(endTime) - parseInt(startTime))}h
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-700">Express Booking</p>
                  <p className="text-xs text-amber-600">Priority processing + express fee</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsExpress(!isExpress);
                  if (!isExpress) validateExpress(selectedDate, startTime);
                  else setExpressError(null);
                }}
                className={`w-12 h-6 rounded-full transition-colors ${isExpress ? 'bg-amber-500' : 'bg-neutral-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${isExpress ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {expressError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {expressError}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <BookNowButton
              vendorId={vendor.id}
              vendorName={vendor.businessName || vendor.name}
              price={selectedPrice}
              basePrice={basePrice}
              selectedTime={`${startTime} - ${endTime}`}
              selectedDate={selectedDate}
              selectedSlot={timeSlotLower}
              serviceType={vendor.serviceType}
            />
            <AddToCartButton
              itemId={`vendor-${vendor.id}-${selectedDate?.toISOString()}-${actualSlot}`}
              itemType="vendor"
              itemName={`${vendor.businessName || vendor.name} - ${actualSlot.replace('_', ' ')}`}
              itemDescription={vendor.description || ""}
              itemPrice={selectedPrice}
              basePrice={basePrice}
              metadata={{
                city: vendor.city,
                area: vendor.area,
                serviceType: vendor.serviceType,
                timeSlot: actualSlot,
                timeSlotLabel: `${startTime} - ${endTime}`,
                basePrice: basePrice,
                selectedDate: selectedDate?.toISOString(),
                selectedSlot: timeSlotLower,
                startTime,
                endTime,
                isExpress,
                verificationStatus: vendor.verificationStatus,
              }}
              disabled={!isReadyToBook || !!expressError}
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
                      <span>{selectedDate?.toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{startTime} - {endTime}</span>
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
              <span>Contact vendor</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-neutral-600" />
              <span>Call for consultation</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-neutral-600" />
              <span>Free quote</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <Shield className="h-4 w-4" />
              <span>Secure Booking</span>
            </div>
            <p className="text-xs text-green-600 mt-1">Your payment is protected until service is completed</p>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
              <Globe className="h-4 w-4" />
              <span>Verified Vendor</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">Background checked and verified by our team</p>
          </div>
        </div>

        {/* Availability Calendar */}
        <AvailabilityCalendar
          venueId={`vendor-${vendor.id}`}
          basePrice={basePrice}
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
        />

        {/* Trust Badges */}
        <div className="bg-white rounded-2xl border border-silver-100 p-6 shadow-sm">
          <h4 className="font-semibold text-black mb-4">Why Book This Vendor</h4>
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
              <span className="text-sm text-neutral-700">Verified Professional</span>
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
              <span className="text-sm text-neutral-700">Satisfaction Guaranteed</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-br from-silver-50 to-silver-100 rounded-2xl border border-silver-200 p-6">
          <h4 className="font-semibold text-black mb-4">Vendor Contact</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-neutral-700">
              <Phone className="h-4 w-4 text-neutral-700" />
              <span>+91 98765 43210</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-700">
              <Mail className="h-4 w-4 text-neutral-700" />
              <span>contact@vendor.com</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-700">
              <Clock className="h-4 w-4 text-neutral-700" />
              <span>10 AM - 8 PM</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-700">
              <MapPin className="h-4 w-4 text-neutral-700" />
              <span>{vendor.area}, {vendor.city}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
