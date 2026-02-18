"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageCircle, Shield, Globe, Check, Briefcase, TrendingUp, Heart, Zap } from "lucide-react";
import { AddToCartButton } from "./add-to-cart-button";
import { BookNowButton } from "./book-now-button";
import type { Vendor } from "@/lib/vendors";

interface VendorBookingSidebarProps {
  vendor: Vendor;
  services: { id: string; name?: string; title?: string; price?: number; baseRate?: number; description?: string; serviceType?: string }[];
}

const ALL_PACKAGES = [
  { name: "Morning", time: "6 AM - 12 PM", multiplier: 0.6 },
  { name: "Evening", time: "4 PM - 10 PM", multiplier: 0.8 },
  { name: "Full Day", time: "6 AM - 12 AM", multiplier: 1.0 },
  { name: "Night", time: "8 PM - 2 AM", multiplier: 0.7 },
];

// Generate random package combinations for each vendor based on vendor id
const getPackagesForVendor = (vendorId: string) => {
  const hash = vendorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const packageCounts = [2, 3, 4]; // Some vendors have 2, some 3, some 4 packages
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

export function VendorBookingSidebar({ vendor, services }: VendorBookingSidebarProps) {
  const vendorPackages = getPackagesForVendor(vendor.id);
  const [selectedPackage, setSelectedPackage] = useState(vendorPackages.length > 1 ? 1 : 0);

  const displayName = vendor.businessName || vendor.name || "Vendor";
  const displayImage = vendor.services?.[0]?.id ? `https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80` : "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80";
  const displayServiceType = services[0]?.serviceType || vendor.serviceType || "Service";
  const selectedService = services[0];
  const basePrice = selectedService?.price || selectedService?.baseRate || vendor.basePrice || 10000;
  const selectedPrice = Math.round(basePrice * vendorPackages[selectedPackage].multiplier);

  const getVendorStats = () => {
    const completedEvents = 500 + (vendor.rating ? Math.floor(vendor.rating * 10) : 0);
    const happyClients = 450 + (vendor.verificationStatus === "VERIFIED" ? 50 : 0);
    return [
      { label: "Years Experience", value: "10+", icon: Briefcase },
      { label: "Events Completed", value: `${completedEvents}+`, icon: TrendingUp },
      { label: "Happy Clients", value: `${happyClients}+`, icon: Heart },
      { label: "Response Time", value: "~2hrs", icon: Zap },
    ];
  };

  const stats = getVendorStats();

  return (
    <div className="lg:col-span-1">
      <div className="sticky top-6 space-y-6">
        {/* Booking Card */}
        <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Book This Vendor</h3>
            <p className="text-sm text-gray-500">Secure your date with a booking</p>
          </div>

          <div className="flex items-center justify-between mb-6 p-4 bg-purple-50 rounded-xl">
            <div>
              <div className="text-sm text-gray-500">Starting from</div>
              <div className="text-2xl font-bold text-purple-600">₹{selectedPrice.toLocaleString("en-IN")}</div>
              <div className="text-xs text-gray-500 mt-1">{vendorPackages[selectedPackage].name} Package</div>
            </div>
            <div className="text-right">
              <Badge className="bg-green-100 text-green-700 border border-green-200">
                {vendor.verificationStatus === "VERIFIED" ? "Verified" : "Available"}
              </Badge>
            </div>
          </div>

          {/* Timing Packages */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {vendorPackages.map((pkg, index) => (
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
              vendorId={vendor.id}
              vendorName={displayName}
              price={selectedPrice}
              serviceName={`${selectedService?.name || selectedService?.title || displayServiceType} - ${vendorPackages[selectedPackage].name}`}
            />
            <AddToCartButton
              itemId={`vendor-${vendor.id}-${selectedPackage}`}
              itemType="vendor"
              itemName={`${displayName} - ${displayServiceType} (${vendorPackages[selectedPackage].name})`}
              itemDescription={selectedService?.description || vendor.description || ""}
              itemPrice={selectedPrice}
              itemImage={displayImage}
              metadata={{
                city: vendor.city || "",
                area: vendor.area || "",
                serviceType: displayServiceType,
                vendorId: vendor.id,
                serviceName: selectedService?.name || selectedService?.title || displayServiceType,
                package: vendorPackages[selectedPackage].name,
                time: vendorPackages[selectedPackage].time,
              }}
            />
          </div>

          <div className="space-y-3 pt-4 border-t text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-purple-400" />
              <span>Response within 2 hours</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-purple-400" />
              <span>Contact via platform</span>
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
            <p className="text-xs text-green-600 mt-1">Your payment is protected until service is delivered</p>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
              <Globe className="h-4 w-4" />
              <span>Virtual Consultation</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">Free video call before booking</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl border border-purple-100 p-6 shadow-lg">
          <h4 className="font-semibold text-gray-900 mb-4">Vendor Stats</h4>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                <stat.icon className="h-5 w-5 text-purple-500 mb-1" />
                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4">Why Book With Us</h4>
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
              <span className="text-sm text-gray-600">Verified Professionals</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">24/7 Customer Support</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Easy Cancellation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
