"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star, ShoppingCart, X, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useCart } from "@/context/cart-context";
import { useState } from "react";
import { toast } from "sonner";
import type { Venue } from "@/types";
import { motion } from "framer-motion";

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  const { addItem, removeItem, isInCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const added = isInCart(`venue-${venue.id}`);

  const displayName = venue.name;
  const displayType = venue.type || "Venue";
  const displayCity = venue.city;
  const displayArea = venue.area;
  const displayPrice = venue.basePriceEvening || venue.basePriceFullDay || 50000;
  const displayDescription = venue.description || "";
  const displayCapacity = venue.capacityMax || 100;
  const displayRating = 4.5;

  // Get image from venue photos or use placeholder
  const displayImage = venue.photos?.[0]?.url || 
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (added) {
      removeItem(`venue-${venue.id}`);
      toast.info(`${displayName} removed from cart`);
    } else {
      setIsAdding(true);
      addItem({
        id: `venue-${venue.id}`,
        itemType: 'VENUE',
        name: displayName,
        unitPrice: displayPrice,
        totalPrice: displayPrice,
        venueId: venue.id,
        cartId: 0,
        vendorServiceId: null,
        addonId: null,
        date: null,
        timeSlot: null,
        quantity: 1,
        meta: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
      toast.success(`${displayName} added to cart`);
      setIsAdding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group overflow-hidden border-neutral-200 bg-white hover:shadow-2xl hover:shadow-black/10 hover:border-neutral-300 transition-all duration-300">
        <div className="relative h-48 overflow-hidden">
          <Image
            src={displayImage}
            alt={displayName}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

          {/* Rating badge */}
          <div className="absolute top-3 right-3 bg-gradient-to-r from-black to-silver-800 px-2.5 py-1.5 rounded-full text-xs font-semibold text-white flex items-center shadow-lg shadow-black/30 border border-silver-700">
            <Star className="h-3.5 w-3.5 mr-1 fill-yellow-400 text-yellow-400" />
            {displayRating}
          </div>

          {/* Venue type badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="default" className="bg-black/80 backdrop-blur-sm border-silver-700 text-white">
              {displayType}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-black mb-2 group-hover:text-neutral-700 transition-colors line-clamp-1">
            {displayName}
          </h3>

          <div className="flex items-center gap-1 text-neutral-600 text-sm mb-3">
            <MapPin className="h-4 w-4 text-neutral-500" />
            <span className="line-clamp-1">{displayArea}, {displayCity}</span>
          </div>

          <p className="text-neutral-600 text-sm line-clamp-2 mb-3 h-10">
            {displayDescription || `Stunning ${displayType.toLowerCase()} space perfect for your special events`}
          </p>

          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xl font-bold text-black">₹{displayPrice.toLocaleString()}</span>
              <span className="text-sm text-neutral-500"> / from</span>
            </div>
            <div className="text-sm text-neutral-600">
              Up to {displayCapacity} guests
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-neutral-300 text-black hover:bg-neutral-50 hover:text-black"
            asChild
          >
            <Link href={`/venues/${venue.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Link>
          </Button>

          <Button
            variant={added ? "destructive" : "silver"}
            size="sm"
            className="flex-1 transition-all duration-200"
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            {added ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Remove
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
