"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, MapPin, Clock, CheckCircle2,
  Loader2, AlertCircle, Package, Globe, Phone, Mail,
  ChevronLeft, ChevronRight, ShoppingCart
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { getImageUrl } from "@/lib/utils";
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
  portfolioImages?: PortfolioImage[];
  businessImages?: string[];
}

interface PortfolioImage {
  id: number;
  vendorId: number;
  imageUrl: string;
  title?: string;
  isCover?: boolean;
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

const fallbackImages: Record<string, string> = {
  CATERING: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&q=80",
  PHOTOGRAPHY: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80",
  DECOR: "https://images.unsplash.com/photo-1519225421980-715cb0202128?w=1200&q=80",
  DJ: "https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=1200&q=80",
  MAKEUP: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80",
  VIDEOGRAPHY: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&q=80",
  ENTERTAINMENT: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1200&q=80",
};

export default function VendorDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
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
  const { addItem, removeItem, isInCart, getItemCount } = useCart();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [services, setServices] = useState<VendorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<VendorService | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const vendorImages = vendor?.businessImages?.length 
    ? vendor.businessImages 
    : vendor?.portfolioImages?.map(p => p.imageUrl) || [];

  const allImages = vendorImages.length > 0 
    ? vendorImages 
    : [fallbackImages[vendor?.businessName?.toUpperCase() || 'CATERING'] || fallbackImages.CATERING];

  const mainImage = getImageUrl(allImages[currentImageIndex]) || allImages[currentImageIndex];

  const cartItemCount = getItemCount();
  const cartItemId = selectedService ? `vendor-service-${selectedService.id}` : '';
  const isInCartCurrent = selectedService ? isInCart(cartItemId) : false;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const vendorResponse = await api.get(`/vendors/${params.id}`);
        
        if (!vendorResponse.data) {
          toast.error("Vendor not found");
          router.push("/vendors");
          return;
        }

        setVendor(vendorResponse.data);

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

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);

  const handleBookNow = () => {
    if (!isAuthenticated) {
      toast.error("Please login to book this vendor");
      router.push("/login");
      return;
    }

    if (!selectedService || !vendor) {
      toast.error("Please select a service");
      return;
    }

    // Store booking data in localStorage for checkout
    const bookingData = {
      entityType: 'VENDOR_SERVICE' as const,
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      serviceType: selectedService.serviceType,
      basePrice: selectedService.baseRate,
      city: vendor.city,
      area: vendor.area,
      image: mainImage,
    };

    localStorage.setItem("NearZro_booking", JSON.stringify(bookingData));
    router.push("/checkout");
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("Please login to add to cart");
      router.push("/login");
      return;
    }

    if (!selectedService || !vendor) {
      toast.error("Please select a service");
      return;
    }

    const cartItemId = `vendor-service-${selectedService.id}`;

    if (isInCart(cartItemId)) {
      toast.info("This service is already in your cart", {
        action: {
          label: "Go to Cart",
          onClick: () => router.push("/cart"),
        },
      });
      return;
    }

    const cartItem = {
      id: cartItemId,
      itemType: "VENDOR_SERVICE" as const,
      name: selectedService.name,
      description: selectedService.description || "",
      unitPrice: selectedService.baseRate,
      totalPrice: selectedService.baseRate,
      image: mainImage,
      vendorServiceId: selectedService.id,
      vendorId: vendor.id,
      venueId: null,
      addonId: null,
      date: null,
      timeSlot: null,
      quantity: 1,
      cartId: 0,
      meta: {
        vendorName: vendor.businessName,
        serviceType: selectedService.serviceType,
        city: vendor.city,
        area: vendor.area,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addItem(cartItem as any);

    toast.success("Service added to cart!", {
      description: `₹${selectedService?.baseRate.toLocaleString()}`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-zinc-100 mb-2">Vendor Not Found</h2>
          <p className="text-zinc-400 mb-6">The vendor you're looking for doesn't exist.</p>
          <Button 
            onClick={() => router.push("/vendors")}
            className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
          >
            Browse Vendors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery with Glassmorphism - inside left column */}
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl">
              {/* Blurred gradient background underlay */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-50 blur-xl"
                style={{ backgroundImage: `url(${mainImage})` }}
              />
              
              {/* Main Image - object-contain for proper scaling */}
              <img
                src={mainImage}
                alt={`${vendor.businessName}`}
                className="relative w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = fallbackImages.CATERING;
                }}
              />
              
              {/* Navigation Arrows */}
              {allImages.length > 1 && (
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
              
              {/* Badge */}
              <div className="absolute top-4 left-4">
                <Badge className={
                  vendor.status === "approved" 
                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                }>
                  {vendor.status === "approved" ? "Verified" : vendor.status}
                </Badge>
              </div>
              
              {/* Image Indicators */}
              {allImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {allImages.map((_, idx) => (
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

            {/* Header with Glassmorphism */}
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-medium tracking-tight text-white mb-2">{vendor.businessName}</h1>
                  <div className="flex items-center gap-4 text-zinc-400">
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
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-white">{vendor.rating || "New"}</span>
                </div>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-400">Verified Vendor</span>
              </div>
            </div>

            {/* About with Glassmorphism */}
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
              <h2 className="text-xl font-medium tracking-tight text-white mb-4">About {vendor.businessName}</h2>
              <p className="text-zinc-400 leading-relaxed">{vendor.description}</p>
            </div>

            {/* Services with Glassmorphism */}
            {services.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
                <h2 className="text-xl font-medium tracking-tight text-white mb-4">Services Offered</h2>
                <div className="space-y-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedService?.id === service.id
                          ? "bg-white/10 border-white/30 text-white"
                          : "bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:border-white/20"
                      }`}
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-white">{service.name}</h3>
                          <p className="text-sm text-zinc-500">{service.serviceType}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">₹{service.baseRate.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">per {service.pricingModel.toLowerCase()}</p>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">{service.description}</p>
                      {service.inclusions && (
                        <div className="flex items-start gap-2 text-xs text-green-400">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{service.inclusions}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info with Glassmorphism */}
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
              <h2 className="text-xl font-medium tracking-tight text-white mb-4">Contact Information</h2>
              <div className="space-y-3">
                {vendor.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-zinc-400" />
                    <span className="text-zinc-400">+91 {vendor.phone}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-zinc-400" />
                    <span className="text-zinc-400">{vendor.email}</span>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-zinc-400" />
                    <span className="text-zinc-400">{vendor.website}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6 sticky top-8">
              <h2 className="text-xl font-medium tracking-tight text-white mb-2">Book This Vendor</h2>
              <p className="text-zinc-400 text-sm mb-4">
                {selectedService ? selectedService.name : "Select a service"}
              </p>
              
              {selectedService && (
                <>
                  <div className="p-4 bg-white/[0.05] rounded-xl border border-white/[0.05] mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Package className="h-5 w-5 text-zinc-400" />
                      <div>
                        <p className="font-medium text-white">{selectedService.name}</p>
                        <p className="text-xs text-zinc-500">{selectedService.serviceType}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Price</span>
                      <span className="text-2xl font-bold text-white">₹{selectedService.baseRate.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">per {selectedService.pricingModel.toLowerCase()}</p>
                  </div>

                  <div className="border-t border-white/[0.05] pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Service Fee</span>
                      <span className="font-medium text-white">₹{selectedService.baseRate.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Platform Fee</span>
                      <span className="font-medium text-white">₹199</span>
                    </div>
                    <div className="border-t border-white/[0.05] pt-2 flex justify-between font-bold text-lg">
                      <span className="text-white">Total</span>
                      <span className="text-white">₹{(selectedService.baseRate + 199).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Button
                      onClick={handleBookNow}
                      className="w-full h-12 bg-zinc-100 text-zinc-950 font-semibold rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-95"
                    >
                      Book Now
                    </Button>
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
                            toast.info(`${selectedService?.name} removed from cart`);
                          }}
                          className="w-full h-10 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300"
                        >
                          Remove from Cart
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleAddToCart}
                        className="w-full h-12 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-95"
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Add to Cart
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span>Verified Vendor</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span>Secure Booking</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8">
          <ReviewsSection 
            vendorId={String(vendor.id)}
            vendorName={vendor.businessName} 
            initialRating={vendor.rating || 0} 
          />
        </div>
      </div>
    </div>
  );
}