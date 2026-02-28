"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Users, Star, Clock, CheckCircle2,
  Loader2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/auth-context";
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

export default function VenueDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin" />
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
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<"morning" | "evening" | "fullDay">("evening");

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        setLoading(true);
        // Fetch venue by ID from backend
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
      price: selectedPackage === "morning" ? venue?.basePriceMorning || 0 
             : selectedPackage === "evening" ? venue?.basePriceEvening || 0 
             : venue?.basePriceFullDay || 0,
      package: selectedPackage,
    };

    localStorage.setItem("blinkeventz_booking", JSON.stringify(bookingData));
    toast.success("Venue added to booking! Proceed to checkout.");
    router.push("/checkout");
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("Please login to add to cart");
      router.push("/login");
      return;
    }

    // Dispatch custom event for cart context to pick up
    const cartItem = {
      id: `venue-${venue?.id}`,
      type: "venue" as const,
      name: venue?.name || "",
      description: venue?.description || "",
      price: selectedPackage === "morning" ? venue?.basePriceMorning || 0 
             : selectedPackage === "evening" ? venue?.basePriceEvening || 0 
             : venue?.basePriceFullDay || 0,
      image: venue?.images?.[0] || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3",
      metadata: {
        venueId: venue?.id,
        package: selectedPackage,
        city: venue?.city,
        area: venue?.area,
      },
      quantity: 1,
    };

    // Add to localStorage cart
    const existingCart = JSON.parse(localStorage.getItem("blinkeventz-cart") || "[]");
    const existingIndex = existingCart.findIndex((item: any) => item.id === cartItem.id);
    
    if (existingIndex >= 0) {
      toast.info("This venue is already in your cart");
    } else {
      existingCart.push(cartItem);
      localStorage.setItem("blinkeventz-cart", JSON.stringify(existingCart));
      toast.success("Venue added to cart!");
      
      // Trigger cart update
      window.dispatchEvent(new Event("storage"));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-800" />
        <h2 className="text-2xl font-semibold text-black mb-2">Loading Venue Details</h2>
        <p className="text-neutral-600">Fetching venue information...</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-black mb-2">Venue Not Found</h2>
        <p className="text-neutral-600 mb-6">The venue you're looking for doesn't exist or has been removed.</p>
        <Button variant="premium" onClick={() => router.push("/venues")}>
          Browse Venues
        </Button>
      </div>
    );
  }

  const getPrice = () => {
    switch (selectedPackage) {
      case "morning": return venue.basePriceMorning;
      case "evening": return venue.basePriceEvening;
      case "fullDay": return venue.basePriceFullDay;
    }
  };

  const amenitiesList = venue.amenities.split(",").map(a => a.trim()).filter(Boolean);
  const policiesList = venue.policies.split(",").map(p => p.trim()).filter(Boolean);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 gap-2">
        ← Back to Venues
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="aspect-video rounded-2xl overflow-hidden bg-silver-200">
            {venue.images && venue.images.length > 0 ? (
              <img
                src={venue.images[0]}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <MapPin className="h-20 w-20 text-neutral-400" />
              </div>
            )}
          </div>

          {/* Title & Basic Info */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-black mb-2">{venue.name}</h1>
                <div className="flex items-center gap-4 text-neutral-600">
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
                venue.status === "approved" ? "bg-green-100 text-green-800" :
                venue.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }>
                {venue.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{venue.rating || "New"}</span>
              </div>
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-600">{venue.type}</span>
            </div>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About This Venue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700">{venue.description}</p>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {amenitiesList.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-neutral-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Policies */}
          <Card>
            <CardHeader>
              <CardTitle>Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {policiesList.map((policy, index) => (
                  <li key={index} className="flex items-start gap-2 text-neutral-700">
                    <span className="text-neutral-400 mt-1">•</span>
                    <span>{policy}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Booking Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Book This Venue</CardTitle>
              <CardDescription>Select your preferred time slot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Package Selection */}
              <div className="space-y-2">
                <Button
                  variant={selectedPackage === "morning" ? "premium" : "silver"}
                  className="w-full justify-between h-16"
                  onClick={() => setSelectedPackage("morning")}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">Morning Slot</p>
                      <p className="text-xs text-neutral-500">6:00 AM - 12:00 PM</p>
                    </div>
                  </div>
                  <span className="font-bold">₹{venue.basePriceMorning.toLocaleString()}</span>
                </Button>

                <Button
                  variant={selectedPackage === "evening" ? "premium" : "silver"}
                  className="w-full justify-between h-16"
                  onClick={() => setSelectedPackage("evening")}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">Evening Slot</p>
                      <p className="text-xs text-neutral-500">4:00 PM - 10:00 PM</p>
                    </div>
                  </div>
                  <span className="font-bold">₹{venue.basePriceEvening.toLocaleString()}</span>
                </Button>

                <Button
                  variant={selectedPackage === "fullDay" ? "premium" : "silver"}
                  className="w-full justify-between h-16"
                  onClick={() => setSelectedPackage("fullDay")}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">Full Day</p>
                      <p className="text-xs text-neutral-500">6:00 AM - 12:00 AM</p>
                    </div>
                  </div>
                  <span className="font-bold">₹{venue.basePriceFullDay.toLocaleString()}</span>
                </Button>
              </div>

              {/* Price Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-neutral-600">Selected Package</span>
                  <span className="font-medium capitalize">{selectedPackage}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-neutral-600">Price</span>
                  <span className="text-2xl font-bold text-black">₹{getPrice().toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="premium"
                  className="w-full h-12 text-lg"
                  onClick={handleBookNow}
                >
                  Book Now
                </Button>
                <Button
                  variant="silver"
                  className="w-full h-12"
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-4 text-xs text-neutral-500 pt-4 border-t">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Verified Venue</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Secure Booking</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-8">
        <ReviewsSection 
          venueId={String(venue.id)} 
          venueName={venue.name} 
          initialRating={venue.rating || 0} 
        />
      </div>
    </div>
  );
}
