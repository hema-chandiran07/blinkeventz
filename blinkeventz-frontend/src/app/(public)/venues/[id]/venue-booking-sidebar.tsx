"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageCircle, Shield, Globe, Check, Calendar } from "lucide-react";
import { AddToCartButton } from "./add-to-cart-button";
import { BookNowButton } from "./book-now-button";
import type { Venue } from "@/types";

interface VenueBookingSidebarProps {
  venue: Venue;
}

const ALL_PACKAGES = [
  { name: "Morning", time: "6 AM - 12 PM", multiplier: 0.6 },
  { name: "Evening", time: "4 PM - 10 PM", multiplier: 0.8 },
  { name: "Full Day", time: "6 AM - 12 AM", multiplier: 1.0 },
  { name: "Night", time: "8 PM - 2 AM", multiplier: 0.7 },
];

// Generate random package combinations for each venue based on venue id
const getPackagesForVenue = (venueId: string) => {
  const hash = venueId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const packageCounts = [2, 3, 4]; // Some venues have 2, some 3, some 4 packages
  const countIndex = hash % packageCounts.length;
  const packageCount = packageCounts[countIndex];
  
  // Different combinations based on hash
  const combinations: number[][] = [
    [0, 1], // Morning + Evening
    [1, 2], // Evening + Full Day
    [0, 2], // Morning + Full Day
    [1, 3], // Evening + Night
    [0, 1, 2], // Morning + Evening + Full Day
    [0, 1, 3], // Morning + Evening + Night
    [1, 2, 3], // Evening + Full Day + Night
    [0, 1, 2, 3], // All packages
  ];
  
  const comboIndex = hash % combinations.length;
  const selectedIndices = combinations[comboIndex].slice(0, packageCount);
  return selectedIndices.map(i => ALL_PACKAGES[i]);
};

export function VenueBookingSidebar({ venue }: VenueBookingSidebarProps) {
  const venuePackages = getPackagesForVenue(venue.id);
  const [selectedPackage, setSelectedPackage] = useState(venuePackages.length > 1 ? 1 : 0);

  const selectedPrice = Math.round(venue.price * venuePackages[selectedPackage].multiplier);
  const priceUnit = venue.priceUnit === 'per_day' ? 'day' : 'hour';

  return (
    <div className="lg:col-span-1">
      <div className="sticky top-6 space-y-6">
        {/* Booking Card */}
        <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Book This Venue</h3>
            <p className="text-sm text-gray-500">Reserve your date today</p>
          </div>

          <div className="flex items-center justify-between mb-6 p-4 bg-purple-50 rounded-xl">
            <div>
              <div className="text-sm text-gray-500">Starting from</div>
              <div className="text-2xl font-bold text-purple-600">₹{selectedPrice.toLocaleString("en-IN")}</div>
              <div className="text-xs text-gray-500 mt-1">{venuePackages[selectedPackage].name} Package</div>
            </div>
            <div className="text-right">
              <Badge className="bg-green-100 text-green-700 border border-green-200">
                Available
              </Badge>
            </div>
          </div>

          {/* Timing Packages */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {venuePackages.map((pkg, index) => (
              <button
                key={pkg.name}
                onClick={() => setSelectedPackage(index)}
                className={`p-3 rounded-lg border text-center text-xs transition-all ${
                  selectedPackage === index
                    ? "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300 shadow-md scale-105"
                    : "bg-gray-50 border-gray-200 hover:border-purple-200 hover:bg-purple-50"
                }`}
              >
                <div className={`font-semibold ${selectedPackage === index ? "text-purple-700" : "text-gray-600"}`}>
                  {pkg.name}
                </div>
                <div className={`text-xs mt-1 ${selectedPackage === index ? "text-purple-500" : "text-gray-400"}`}>
                  {pkg.time}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-6">
            <BookNowButton
              venueId={venue.id}
              venueName={venue.name}
              price={selectedPrice}
              selectedPackage={venuePackages[selectedPackage].name}
              selectedTime={venuePackages[selectedPackage].time}
            />
            <AddToCartButton
              itemId={`venue-${venue.id}-${selectedPackage}`}
              itemType="venue"
              itemName={`${venue.name} - ${venuePackages[selectedPackage].name}`}
              itemDescription={venue.description || ""}
              itemPrice={selectedPrice}
              itemImage={venue.images[0]}
              metadata={{
                city: venue.city,
                area: venue.area,
                capacity: venue.capacity,
                address: venue.address,
                package: venuePackages[selectedPackage].name,
                time: venuePackages[selectedPackage].time,
                basePrice: venue.price,
                priceUnit,
              }}
            />
          </div>

          <div className="space-y-3 pt-4 border-t text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-purple-400" />
              <span>Schedule a visit</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-purple-400" />
              <span>Contact venue manager</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-purple-400" />
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

        {/* Trust Badges */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4">Why Book This Venue</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Best Price Guarantee</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Verified Venue</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">24/7 Support</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Free Cancellation</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Venue Contact</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-600">
              <Phone className="h-4 w-4 text-purple-500" />
              <span>+91 44 1234 5678</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="h-4 w-4 text-purple-500" />
              <span>bookings@venue.com</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span>9 AM - 9 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
