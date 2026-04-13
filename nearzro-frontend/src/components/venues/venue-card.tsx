"use client";

import Link from "next/link";
import { MapPin, Users, IndianRupee, CheckCircle2, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/context/cart-context";
import { toast } from "sonner";

const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    return 'http://localhost:3000';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

export interface Venue {
  id: string;
  name: string;
  city: string;
  area: string;
  basePrice?: number;
  basePriceMorning?: number;
  basePriceEvening?: number;
  basePriceFullDay?: number;
  price?: number;
  capacity?: number;
  capacityMax?: number;
  capacityMin?: number;
  rating: number;
  venueImages?: string[];
  images?: string[];
  tags?: string[];
  amenities?: string[];
}

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  const { addItem } = useCart();

  const safeName = venue?.name ?? "Unknown Venue";
  const safeCity = venue?.city ?? "";
  const safeArea = venue?.area ?? "";
  const safePrice = venue?.basePriceFullDay ?? venue?.basePriceEvening ?? venue?.basePriceMorning ?? venue?.price ?? 0;
  const safeCapacity = venue?.capacityMax ?? venue?.capacity ?? 0;
  const safeAmenities = venue?.amenities ?? [];
  const rawPath = venue?.images?.[0] ?? venue?.venueImages?.[0];

  let imageUrl = "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800";
  if (rawPath && typeof rawPath === 'string') {
    if (rawPath.startsWith('http')) {
      imageUrl = rawPath;
    } else {
      const backendUrl = getBackendUrl();
      imageUrl = `${backendUrl}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
    }
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      id: `venue-${venue.id}`,
      itemType: 'VENUE',
      name: safeName,
      description: `Venue in ${safeArea}, ${safeCity}`,
      unitPrice: safePrice,
      totalPrice: safePrice,
      image: imageUrl,
      meta: {},
      cartId: 0,
      venueId: parseInt(venue.id),
      vendorServiceId: null,
      addonId: null,
      date: null,
      timeSlot: null,
      quantity: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    toast.success(`${safeName} added to cart!`, {
      description: `₹${safePrice.toLocaleString("en-IN")}`,
    });
  };

  return (
    <Link href={`/venues/${venue.id}`} className="block h-full outline-none">
      <motion.div
        className="group flex flex-col h-full rounded-2xl border border-silver-800 bg-card overflow-hidden cursor-pointer hover:border-silver-500 transition-all duration-300 hover:-translate-y-1"
        whileHover={{ y: -4 }}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-silver-900">
          <img
            src={imageUrl}
            alt={safeName}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800";
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        <div className="p-5 flex flex-col flex-grow">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-lg font-bold text-card-foreground truncate group-hover:text-silver-200 transition-colors">
              {safeName}
            </h3>
            <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 backdrop-blur-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-green-500">
                Verified
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-silver-400 text-sm mb-4">
            <MapPin className="h-4 w-4 shrink-0 text-silver-500" />
            <span className="truncate">{safeArea ? `${safeArea}, ` : ''}{safeCity}</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {(safeAmenities.length > 0 ? safeAmenities.slice(0, 3) : ["Premium", "AC"]).map((amenity, index) => (
              <span
                key={index}
                className="bg-silver-800/50 text-silver-300 text-xs px-2.5 py-1 rounded-md border border-silver-700"
              >
                {amenity}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-silver-800 flex items-center justify-between">
            <div>
              {safePrice > 0 ? (
                <>
                  <p className="text-xs text-silver-500 font-medium mb-0.5 uppercase tracking-wide">Starting at</p>
                  <div className="flex items-baseline gap-0.5">
                    <IndianRupee className="h-4 w-4 text-silver-400" />
                    <span className="text-xl font-bold text-card-foreground">
                      {safePrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-silver-500 font-medium mb-0.5 uppercase tracking-wide">Pricing</p>
                  <span className="text-base font-bold text-card-foreground block mt-0.5">Price on Request</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-silver-400">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{safeCapacity > 0 ? safeCapacity : 'TBD'}</span>
              </div>

              <button
                onClick={handleAddToCart}
                className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-110"
                aria-label="Add to plan"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}