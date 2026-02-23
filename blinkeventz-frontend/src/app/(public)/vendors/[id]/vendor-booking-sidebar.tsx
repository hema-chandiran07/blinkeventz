"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageCircle, Shield, Globe, CheckCircle2, Calendar as CalendarIcon, Clock, DollarSign, Star, MapPin } from "lucide-react";
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

  const basePrice = vendor.basePrice || 35000;
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
        <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Book This Vendor</h3>
            <p className="text-sm text-gray-500">Select date and time to see pricing</p>
          </div>

          {/* Vendor Info */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{vendor.businessName || vendor.name}</p>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{vendor.rating || 4.5}</span>
                  <span className="text-gray-500">({vendor.verificationStatus === "VERIFIED" ? "Verified" : "Pending"})</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Response time: ~2 hours</span>
            </div>
          </div>

          {/* Dynamic Pricing Display */}
          <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-gray-500">Base Price</div>
                <div className="text-lg font-semibold text-gray-700">₹{basePrice.toLocaleString("en-IN")}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Your Price</div>
                <div className="text-2xl font-bold text-purple-600">₹{selectedPrice.toLocaleString("en-IN")}</div>
              </div>
            </div>
            
            {selectedSlot && (
              <div className="flex items-center gap-2 text-xs text-purple-700 bg-white/50 rounded-lg p-2">
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
              vendorId={vendor.id}
              vendorName={vendor.businessName || vendor.name}
              price={selectedPrice}
              basePrice={basePrice}
              selectedTime={selectedSlot ? TIME_SLOT_LABELS[selectedSlot] : undefined}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              serviceType={vendor.serviceType}
            />
            <AddToCartButton
              itemId={`vendor-${vendor.id}-${selectedDate?.toISOString()}-${selectedSlot}`}
              itemType="vendor"
              itemName={`${vendor.businessName || vendor.name} - ${selectedSlot ? TIME_SLOT_LABELS[selectedSlot] : 'Booking'}`}
              itemDescription={vendor.description || ""}
              itemPrice={selectedPrice}
              basePrice={basePrice}
              metadata={{
                city: vendor.city,
                area: vendor.area,
                serviceType: vendor.serviceType,
                timeSlot: selectedSlot,
                timeSlotLabel: selectedSlot ? TIME_SLOT_LABELS[selectedSlot] : undefined,
                basePrice: basePrice,
                selectedDate: selectedDate?.toISOString(),
                selectedSlot,
                verificationStatus: vendor.verificationStatus,
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

          <div className="space-y-3 pt-4 border-t text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-purple-400" />
              <span>Contact vendor</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-purple-400" />
              <span>Call for consultation</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-purple-400" />
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
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4">Why Book This Vendor</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Best Price Guarantee</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Verified Professional</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">24/7 Support</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Satisfaction Guaranteed</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Vendor Contact</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-600">
              <Phone className="h-4 w-4 text-purple-500" />
              <span>+91 98765 43210</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="h-4 w-4 text-purple-500" />
              <span>contact@vendor.com</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Clock className="h-4 w-4 text-purple-500" />
              <span>10 AM - 8 PM</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="h-4 w-4 text-purple-500" />
              <span>{vendor.area}, {vendor.city}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
