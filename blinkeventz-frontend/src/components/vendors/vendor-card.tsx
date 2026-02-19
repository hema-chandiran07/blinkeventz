"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star, ShoppingCart, X, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useCart } from "@/context/cart-context";
import { useState } from "react";
import { getVendorImage, type Vendor } from "@/lib/vendors";
import { toast } from "sonner";

interface VendorCardProps {
  vendor: Vendor;
}

export function VendorCard({ vendor }: VendorCardProps) {
  const { addItem, removeItem, isInCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const added = isInCart(`vendor-${vendor.id}`);

  const displayName = vendor.name || vendor.businessName || "Vendor";
  const displayImage = getVendorImage(vendor);
  const displayRating = vendor.rating || 4.5;
  const displayServiceType = vendor.services?.[0]?.serviceType || vendor.serviceType || "Service";
  const displayCity = vendor.city || "City";
  const displayArea = vendor.area || "";
  const displayPrice = vendor.basePrice || vendor.services?.[0]?.baseRate || 10000;
  const displayDescription = vendor.description || "";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (added) {
      removeItem(`vendor-${vendor.id}`);
      toast.info(`${displayName} removed from cart`, {
        description: "Item has been removed from your cart",
      });
    } else {
      setIsAdding(true);
      addItem({
        id: `vendor-${vendor.id}`,
        type: "vendor",
        name: displayName,
        description: displayDescription,
        price: displayPrice,
        image: displayImage,
        metadata: {
          city: displayCity,
          area: displayArea,
          serviceType: displayServiceType,
          vendorId: vendor.id,
        },
      });
      setTimeout(() => {
        setIsAdding(false);
        toast.success(`${displayName} added to cart!`, {
          description: `₹${displayPrice.toLocaleString("en-IN")} starting from`,
        });
      }, 500);
    }
  };

  return (
    <Link href={`/vendors/${vendor.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 group h-full flex flex-col border-gray-200 hover:border-purple-300 transform hover:-translate-y-1 cursor-pointer">
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={displayImage}
          alt={displayName}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold text-purple-700 flex items-center shadow-lg">
          <Star className="h-3.5 w-3.5 mr-1 fill-yellow-400 text-yellow-400" />
          {displayRating}
        </div>
        <div className="absolute top-3 left-3">
          <Badge className="bg-white/95 text-purple-700 hover:bg-white shadow-md">{displayServiceType}</Badge>
        </div>
      </div>
      <CardContent className="p-5 flex-1">
        <Link href={`/vendors/${vendor.id}`} className="block group">
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">{displayName}</h3>
        </Link>
        <div className="flex items-center text-gray-500 text-sm mb-4">
          <MapPin className="h-4 w-4 mr-1 text-pink-500" />
          {displayArea ? `${displayArea}, ${displayCity}` : displayCity}
        </div>
        <p className="text-gray-600 text-sm line-clamp-2">{displayDescription}</p>
      </CardContent>
      <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-gray-100 bg-gray-50/50 mt-auto gap-3">
        <div>
          <span className="text-sm font-medium text-gray-500">Starting from</span>
          <div className="text-lg font-bold text-purple-600">₹{displayPrice.toLocaleString("en-IN")}</div>
        </div>
        <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
          <Button
            size="sm"
            variant="outline"
            className="bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300"
            asChild
          >
            <Link href={`/vendors/${vendor.id}`}>
              <Eye className="h-4 w-4 mr-1" /> Details
            </Link>
          </Button>
          <Button
            size="sm"
            variant={added ? "destructive" : "secondary"}
            className={added ? "bg-red-500 hover:bg-red-600" : "bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg"}
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            {added ? (
              <>
                <X className="h-4 w-4" />
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
    </Link>
  );
}
