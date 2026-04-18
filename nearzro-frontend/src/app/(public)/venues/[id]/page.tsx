"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Users, Star, Clock, CheckCircle2,
  Loader2, AlertCircle, ShoppingCart, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { getImageUrl } from "@/lib/utils";
import { ReviewsSection } from "./reviews-section";

interface Venue {
  id: number;
  name: string;
  type: string;
  description: string;
  address: string;
  city: string;
  area: string;
  pincode: string;
  capacityMin: number;
  capacityMax: number;
  basePriceMorning: number;
  basePriceEvening: number;
  basePriceFullDay: number;
  amenities: string;
  policies: string;
  rating: number;
  status: "pending" | "approved" | "rejected";
  images?: string[];
}

const fallbackVenueImage = "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1200";

export default function VenueDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
      </div>
    }>
      <VenueDetailContent />
    </Suspense>
  );
}

function VenueDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addItem, removeItem, isInCart, getItemCount } = useCart();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<"morning" | "evening" | "fullDay">("fullDay");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Use exact same image logic as venue-card
  const rawPath = venue?.images?.[0];
  let imageUrl = fallbackVenueImage;
  if (rawPath && typeof rawPath === 'string') {
    if (rawPath.startsWith('http')) {
      imageUrl = rawPath;
    } else {
      const backendUrl = typeof window !== 'undefined' ? 'http://localhost:3000' : 'http://localhost:3000';
      imageUrl = `${backendUrl}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
    }
  }

  const venueImages = venue?.images?.length ? venue.images : [fallbackVenueImage];
  const mainImage = getImageUrl(venueImages[currentImageIndex]) || venueImages[currentImageIndex];

  const cartItemId = `venue-${venue?.id}`;
  const isInCartCurrent = venue ? isInCart(cartItemId) : false;

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/venues/${params.id}`);
        
        if (!response.data) {
          toast.error("Venue not found");
          router.push("/venues");
          return;
        }

        setVenue(response.data);
      } catch (error: any) {
        console.error("Error fetching venue:", error);
        if (error?.response?.status === 404) {
          toast.error("Venue not found");
        } else {
          toast.error("Failed to load venue details");
        }
        router.push("/venues");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchVenue();
    }
  }, [params.id, router]);

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % venueImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + venueImages.length) % venueImages.length);

  const getPrice = () => {
    switch (selectedPackage) {
      case "morning": return venue?.basePriceMorning || 0;
      case "evening": return venue?.basePriceEvening || 0;
      case "fullDay": return venue?.basePriceFullDay || 0;
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      toast.error("Please login to book this venue");
      router.push("/login");
      return;
    }

    const bookingData = {
      type: "venue" as const,
      id: venue?.id.toString() || "",
      name: venue?.name || "",
      price: getPrice(),
      package: selectedPackage,
    };

    localStorage.setItem("NearZro_booking", JSON.stringify(bookingData));
    toast.success("Venue added to booking! Proceed to checkout.");
    router.push("/checkout");
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("Please login to add to cart");
      router.push("/login");
      return;
    }

    if (!venue) return;

    const venueId = `venue-${venue.id}`;

    if (isInCart(venueId)) {
      toast.info("This venue is already in your cart", {
        action: {
          label: "Go to Cart",
          onClick: () => router.push("/cart"),
        },
      });
      return;
    }

    const price = getPrice();
    
    addItem({
      id: venueId,
      itemType: 'VENUE',
      name: venue.name,
      description: `${selectedPackage} package at ${venue.area}, ${venue.city}`,
      unitPrice: price,
      totalPrice: price,
      image: imageUrl,
      meta: {
        package: selectedPackage,
        city: venue.city,
        area: venue.area,
      },
      cartId: 0,
      venueId: venue.id,
      vendorServiceId: null,
      addonId: null,
      date: null,
      timeSlot: selectedPackage.toUpperCase(),
      quantity: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    toast.success(`${venue.name} added to cart!`, {
      description: `₹${price.toLocaleString("en-IN")}`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
          <h2 className="text-2xl font-medium tracking-tight text-white">Loading Venue Details</h2>
          <p className="text-zinc-500">Fetching venue information...</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-16 w-16 text-red-400" />
          <h2 className="text-2xl font-medium tracking-tight text-white">Venue Not Found</h2>
          <p className="text-zinc-500 mb-6">The venue you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() => router.push("/venues")}
            className="h-12 px-8 bg-zinc-100 text-zinc-950 font-semibold rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)]"
          >
            Browse Venues
          </Button>
        </div>
      </div>
    );
  }

  const amenitiesList = Array.isArray(venue?.amenities) ? venue.amenities : [];
  const policiesList = Array.isArray(venue?.policies) ? venue.policies : [];
  const currentPrice = getPrice();

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="mb-4 gap-2 text-zinc-400 hover:text-white transition-all duration-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Venues
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery with Glassmorphism */}
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl">
              {/* Blurred gradient background underlay */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-50 blur-xl"
                style={{ backgroundImage: `url(${mainImage})` }}
              />
              
              {/* Main image */}
              <img
                src={mainImage}
                alt={venue.name || "Venue"}
                className="relative w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = fallbackVenueImage;
                }}
              />

              {/* Navigation arrows */}
              {venueImages.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all duration-300"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all duration-300"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* Image indicators */}
              {venueImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {venueImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx === currentImageIndex ? "bg-white w-6" : "bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Title & Basic Info with Glassmorphism */}
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-medium tracking-tight text-white mb-2">{venue.name}</h1>
                  <div className="flex items-center gap-4 text-zinc-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {venue.area}, {venue.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {venue.capacityMin}-{venue.capacityMax} guests
                    </span>
                  </div>
                </div>
                <Badge className={
                  venue.status === "approved" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                  venue.status === "pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                  "bg-red-500/20 text-red-400 border-red-500/30"
                }>
                  {venue.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-white">{venue.rating || "New"}</span>
                </div>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-400">{venue.type}</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
              <h2 className="text-xl font-medium tracking-tight text-white mb-4">About This Venue</h2>
              <p className="text-zinc-400 leading-relaxed">{venue.description || "No description available."}</p>
            </div>

            {/* Amenities */}
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
              <h2 className="text-xl font-medium tracking-tight text-white mb-4">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {(amenitiesList.length > 0 ? amenitiesList : ["Premium", "AC"]).map((amenity, index) => (
                  <span
                    key={index}
                    className="bg-white/5 text-zinc-300 text-sm px-4 py-2 rounded-xl border border-white/10"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>

            {/* Policies */}
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
              <h2 className="text-xl font-medium tracking-tight text-white mb-4">Policies</h2>
              <div className="flex flex-wrap gap-2">
                {(policiesList.length > 0 ? policiesList : ["Standard policies apply"]).map((policy, index) => (
                  <span
                    key={index}
                    className="bg-white/5 text-zinc-300 text-sm px-4 py-2 rounded-xl border border-white/10"
                  >
                    {policy}
                  </span>
                ))}
              </div>
            </div>

            {/* Reviews Section - Unrestricted */}
            <ReviewsSection 
              venueId={String(venue.id)} 
              venueName={venue.name}
              initialRating={venue.rating || 0}
            />
          </div>

          {/* Sidebar - Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6 sticky top-8">
              <h2 className="text-xl font-medium tracking-tight text-white mb-6">Book This Venue</h2>
              
              {/* Package Selection */}
              <div className="space-y-3 mb-6">
                {[
                  { key: "morning", label: "Morning Slot", time: "8 AM - 2 PM", price: venue.basePriceMorning },
                  { key: "evening", label: "Evening Slot", time: "2 PM - 10 PM", price: venue.basePriceEvening },
                  { key: "fullDay", label: "Full Day", time: "8 AM - 10 PM", price: venue.basePriceFullDay },
                ].map((pkg) => (
                  <button
                    key={pkg.key}
                    onClick={() => setSelectedPackage(pkg.key as any)}
                    className={`w-full p-4 rounded-xl border transition-all duration-300 text-left ${
                      selectedPackage === pkg.key
                        ? "bg-white/10 border-white/30 text-white"
                        : "bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pkg.label}</p>
                        <p className="text-sm text-zinc-500">{pkg.time}</p>
                      </div>
                      <p className={`font-semibold ${
                        selectedPackage === pkg.key ? "text-white" : "text-zinc-400"
                      }`}>
                        {pkg.price > 0 ? `₹${pkg.price.toLocaleString("en-IN")}` : "Price on Request"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Price Summary */}
              <div className="border-t border-white/[0.05] pt-4 mb-6">
                <div className="flex justify-between text-zinc-400 mb-2">
                  <span>Package Price</span>
                  <span className="text-white">₹{currentPrice.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-lg font-medium">
                  <span className="text-white">Total</span>
                  <span className="text-white">₹{currentPrice.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {isInCartCurrent ? (
                  <>
                    {/* Go to Cart button - navigates to cart page */}
                    <Button
                      onClick={() => router.push("/cart")}
                      className="w-full h-12 bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 font-semibold rounded-2xl transition-all duration-300 active:scale-95"
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Go to Cart
                    </Button>
                    
                    {/* Remove from Cart button */}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        removeItem(cartItemId);
                        toast.info(`${venue?.name} removed from cart`);
                      }}
                      className="w-full h-10 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300"
                    >
                      Remove from Cart
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleAddToCart}
                      className="w-full h-12 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-95"
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Add to Cart
                    </Button>
                  </>
                )}

                <Button
                  onClick={handleBookNow}
                  className="w-full h-12 bg-zinc-100 text-zinc-950 font-semibold rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-95"
                >
                  Book Now
                </Button>
              </div>

              {/* Verified Badge */}
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/[0.05]">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span className="text-sm text-zinc-400">Verified Venue</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}