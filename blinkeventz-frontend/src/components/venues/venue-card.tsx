"use client";

import Link from "next/link";
import { Venue } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Star, ShoppingCart, X, Eye } from "lucide-react";
import Image from "next/image";
import { useCart } from "@/context/cart-context";
import { useState } from "react";
import { toast } from "sonner";

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  const { addItem, removeItem, isInCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const added = isInCart(`venue-${venue.id}`);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (added) {
      removeItem(`venue-${venue.id}`);
      toast.info(`${venue.name} removed from cart`, {
        description: "Item has been removed from your cart",
      });
    } else {
      setIsAdding(true);
      addItem({
        id: `venue-${venue.id}`,
        type: "venue",
        name: venue.name,
        description: venue.description,
        price: venue.price,
        image: venue.images[0],
        metadata: {
          city: venue.city,
          area: venue.area,
          capacity: venue.capacity,
          address: venue.address,
        },
      });
      setTimeout(() => {
        setIsAdding(false);
        toast.success(`${venue.name} added to cart!`, {
          description: `₹${venue.price.toLocaleString("en-IN")} / ${venue.priceUnit === 'per_day' ? 'day' : 'hour'}`,
        });
      }, 500);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 group h-full flex flex-col border-gray-200 hover:border-purple-300 transform hover:-translate-y-1">
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={venue.images[0]}
          alt={venue.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold text-purple-700 flex items-center shadow-lg">
          <Star className="h-3.5 w-3.5 mr-1 fill-yellow-400 text-yellow-400" />
          {venue.rating}
        </div>
      </div>
      <CardContent className="p-5 flex-1">
        <Link href={`/venues/${venue.id}`} className="block group">
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">{venue.name}</h3>
        </Link>
        <div className="flex items-center text-gray-500 text-sm mb-2">
          <MapPin className="h-4 w-4 mr-1 text-pink-500" />
          {venue.area}, {venue.city}
        </div>
        <div className="flex items-center text-gray-500 text-sm mb-4">
            <Users className="h-4 w-4 mr-1 text-purple-500" />
            Up to {venue.capacity} guests
        </div>
        <p className="text-gray-600 text-sm line-clamp-2">{venue.description}</p>
      </CardContent>
      <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-gray-100 bg-gray-50/50 mt-auto gap-3">
        <div>
          <span className="text-lg font-bold text-purple-600">₹{venue.price.toLocaleString("en-IN")}</span>
          <span className="text-xs text-gray-500 font-normal"> / {venue.priceUnit === 'per_day' ? 'day' : 'hour'}</span>
        </div>
        <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
          <Button
            size="sm"
            variant="outline"
            className="bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300"
            asChild
          >
            <Link href={`/venues/${venue.id}`}>
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
  );
}
