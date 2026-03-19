"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, MapPin, Clock, CheckCircle2,
  Loader2, AlertCircle, Package, Globe, Phone, Mail
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";
import { useAuth } from "@/context/auth-context";
import { ReviewsSection } from "./reviews-section";

interface Vendor {
  id: number;
  userId: number;
  businessName: string;
  description: string;
  city: string;
  area: string;
  serviceRadiusKm: number;
  status: "pending" | "approved" | "rejected";
  rating?: number;
  phone?: string;
  email?: string;
  website?: string;
}

interface VendorService {
  id: number;
  vendorId: number;
  name: string;
  serviceType: string;
  pricingModel: string;
  baseRate: number;
  description: string;
  inclusions?: string;
  exclusions?: string;
  isActive: boolean;
}

export default function VendorDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    }>
      <VendorDetailContent />
    </Suspense>
  );
}

function VendorDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [services, setServices] = useState<VendorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<VendorService | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch vendor by ID from backend
        const vendorResponse = await api.get(`/vendors/${params.id}`);
        
        if (!vendorResponse.data) {
          toast.error("Vendor not found");
          router.push("/vendors");
          return;
        }

        setVendor(vendorResponse.data);

        // Fetch vendor's services
        try {
          const servicesResponse = await api.get(`/vendor-services/vendor/${vendorResponse.data.id}`);
          const allServices = extractArray<VendorService>(servicesResponse);
          const activeServices = allServices.filter((s: VendorService) => s.isActive);
          setServices(activeServices);
          if (activeServices.length > 0) {
            setSelectedService(activeServices[0]);
          }
        } catch (error) {
          console.warn("Could not fetch services");
        }
      } catch (error: any) {
        console.error("Error fetching vendor:", error);
        if (error?.response?.status === 404) {
          toast.error("Vendor not found");
        } else {
          toast.error("Failed to load vendor details");
        }
        router.push("/vendors");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id, router]);

  const handleBookNow = () => {
    if (!isAuthenticated) {
      toast.error("Please login to book this vendor");
      router.push("/login");
      return;
    }

    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }

    const bookingData = {
      type: "vendor" as const,
      id: vendor?.id.toString() || "",
      name: vendor?.businessName || "",
      price: selectedService.baseRate,
      service: selectedService.name,
      serviceType: selectedService.serviceType,
    };

    localStorage.setItem("NearZro_booking", JSON.stringify(bookingData));
    toast.success("Vendor service added to booking! Proceed to checkout.");
    router.push("/checkout");
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("Please login to add to cart");
      router.push("/login");
      return;
    }

    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }

    const cartItem = {
      id: `vendor-service-${selectedService.id}`,
      type: "vendor" as const,
      name: selectedService.name,
      description: selectedService.description,
      price: selectedService.baseRate,
      image: "https://images.unsplash.com/photo-1555244162-803834f70033",
      metadata: {
        vendorId: vendor?.id,
        vendorName: vendor?.businessName,
        serviceId: selectedService.id,
        serviceType: selectedService.serviceType,
        city: vendor?.city,
        area: vendor?.area,
      },
      quantity: 1,
    };

    const existingCart = JSON.parse(localStorage.getItem("NearZro-cart") || "[]");
    const existingIndex = existingCart.findIndex((item: any) => item.id === cartItem.id);
    
    if (existingIndex >= 0) {
      toast.info("This service is already in your cart");
    } else {
      existingCart.push(cartItem);
      localStorage.setItem("NearZro-cart", JSON.stringify(existingCart));
      toast.success("Service added to cart!");
      window.dispatchEvent(new Event("storage"));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-800" />
        <h2 className="text-2xl font-semibold text-black mb-2">Loading Vendor Details</h2>
        <p className="text-neutral-600">Fetching vendor information...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-black mb-2">Vendor Not Found</h2>
        <p className="text-neutral-600 mb-6">The vendor you're looking for doesn't exist.</p>
        <Button variant="premium" onClick={() => router.push("/vendors")}>
          Browse Vendors
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 gap-2">
        ← Back to Vendors
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-black mb-2">{vendor.businessName}</h1>
                <div className="flex items-center gap-4 text-neutral-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {vendor.area}, {vendor.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {vendor.serviceRadiusKm} km radius
                  </span>
                </div>
              </div>
              <Badge className={
                vendor.status === "approved" ? "bg-green-100 text-green-800" :
                vendor.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }>
                {vendor.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{vendor.rating || "New"}</span>
              </div>
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-600">Verified Vendor</span>
            </div>
          </div>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About {vendor.businessName}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700">{vendor.description}</p>
            </CardContent>
          </Card>

          {/* Services */}
          {services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Services Offered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedService?.id === service.id
                          ? "border-black bg-silver-50"
                          : "border-silver-200 hover:border-silver-300"
                      }`}
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-black">{service.name}</h3>
                          <p className="text-sm text-neutral-600">{service.serviceType}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-black">₹{service.baseRate.toLocaleString()}</p>
                          <p className="text-xs text-neutral-500">per {service.pricingModel.toLowerCase()}</p>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-700 mb-2">{service.description}</p>
                      {service.inclusions && (
                        <div className="flex items-start gap-2 text-xs text-green-700">
                          <CheckCircle2 className="h-4 w-4 mt-0.5" />
                          <span>{service.inclusions}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vendor.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-neutral-400" />
                    <span className="text-neutral-700">+91 {vendor.phone}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-neutral-400" />
                    <span className="text-neutral-700">{vendor.email}</span>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-neutral-400" />
                    <span className="text-neutral-700">{vendor.website}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Book This Vendor</CardTitle>
              <CardDescription>
                {selectedService ? selectedService.name : "Select a service"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedService && (
                <>
                  {/* Service Details */}
                  <div className="p-4 bg-silver-50 rounded-lg border">
                    <div className="flex items-center gap-3 mb-3">
                      <Package className="h-5 w-5 text-neutral-800" />
                      <div>
                        <p className="font-medium">{selectedService.name}</p>
                        <p className="text-xs text-neutral-500">{selectedService.serviceType}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Price</span>
                      <span className="text-2xl font-bold text-black">₹{selectedService.baseRate.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">per {selectedService.pricingModel.toLowerCase()}</p>
                  </div>

                  {/* Price Summary */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Service Fee</span>
                      <span className="font-medium">₹{selectedService.baseRate.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Platform Fee</span>
                      <span className="font-medium">₹199</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-black">₹{(selectedService.baseRate + 199).toLocaleString()}</span>
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
                      <span>Verified Vendor</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Secure Booking</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-8">
        <ReviewsSection 
          venueId={String(vendor.id)} 
          venueName={vendor.businessName} 
          initialRating={vendor.rating || 0} 
        />
      </div>
    </div>
  );
}
