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
import type { Vendor, VendorService } from "@/types";
import { motion } from "framer-motion";

interface VendorCardProps {
  vendor: Vendor;
  services?: VendorService[];
}

export function VendorCard({ vendor, services }: VendorCardProps) {
  const { addItem, removeItem, isInCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const added = isInCart(`vendor-${vendor.id}`);

  const vendorServices = services || vendor.services || [];
  const displayName = vendor.businessName;
  const displayServiceType = vendorServices[0]?.serviceType || "Service";
  const displayCity = vendor.city;
  const displayArea = vendor.area;
  const displayPrice = vendorServices[0]?.baseRate || 10000;
  const displayDescription = vendor.description || "";
  const displayRating = 4.5;

  // Get image based on service type (Prisma ServiceType enum)
  const getImageUrl = () => {
    const type = displayServiceType.toUpperCase();
    const imageMap: Record<string, string> = {
      "CATERING": "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80",
      "PHOTOGRAPHY": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
      "DECOR": "https://images.unsplash.com/photo-1519225421980-715cb0202128?w=800&q=80",
      "DJ": "https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=800&q=80",
      "MAKEUP": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80",
      "BAKERY": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80",
    };
    return imageMap[type] || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80";
  };

  const displayImage = getImageUrl();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (added) {
      removeItem(`vendor-${vendor.id}`);
      toast.info(`${displayName} removed from cart`);
    } else {
      setIsAdding(true);
      addItem({
        id: `vendor-${vendor.id}`,
        itemType: 'VENDOR_SERVICE',
        name: displayName,
        unitPrice: displayPrice,
        totalPrice: displayPrice,
        vendorServiceId: vendor.id,
        cartId: 0,
        venueId: null,
        addonId: null,
        date: null,
        timeSlot: null,
        quantity: 1,
        meta: { serviceType: displayServiceType },
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

          {/* Service type badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="default" className="bg-black/80 backdrop-blur-sm border-silver-700 text-white">
              {displayServiceType}
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
            {displayDescription || `Professional ${displayServiceType.toLowerCase()} services for your special events`}
          </p>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-black">₹{displayPrice.toLocaleString()}</span>
              <span className="text-sm text-neutral-500"> / from</span>
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
            <Link href={`/vendors/${vendor.id}`}>
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
