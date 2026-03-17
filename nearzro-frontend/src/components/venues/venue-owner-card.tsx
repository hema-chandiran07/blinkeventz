"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Users, Edit, Trash2, Eye, Star } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

interface VenueCardData {
  id: number;
  name: string;
  type: string;
  city: string;
  area: string;
  capacity: number;
  basePriceEvening: number;
  basePriceMorning?: number;
  basePriceFullDay?: number;
  status: "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELISTED";
  photos?: { url: string; isCover?: boolean }[];
  description?: string;
  rating?: number;
}

interface VenueOwnerCardProps {
  venue: VenueCardData;
  onEdit?: (venue: VenueCardData) => void;
  onDelete?: (venue: VenueCardData) => void;
  onView?: (venue: VenueCardData) => void;
  compact?: boolean;
}

export function VenueOwnerCard({
  venue,
  onEdit,
  onDelete,
  onView,
  compact = false,
}: VenueOwnerCardProps) {
  const displayImage = venue.photos?.find(p => p.isCover)?.url || venue.photos?.[0]?.url ||
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-700 border-green-300">Active</Badge>;
      case "PENDING_APPROVAL":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Pending</Badge>;
      case "INACTIVE":
        return <Badge className="bg-silver-200 text-silver-700 border-silver-300">Inactive</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-red-100 text-red-700 border-red-300">Suspended</Badge>;
      case "DELISTED":
        return <Badge className="bg-neutral-200 text-neutral-700 border-neutral-300">Delisted</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="group overflow-hidden border-silver-200 bg-white hover:shadow-xl transition-all duration-300">
          <div className="flex">
            <div className="relative w-32 h-24 flex-shrink-0">
              <Image
                src={displayImage}
                alt={venue.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <CardContent className="flex-1 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-black line-clamp-1">{venue.name}</h3>
                  {getStatusBadge(venue.status)}
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-600">
                  <MapPin className="h-3 w-3" />
                  <span className="line-clamp-1">{venue.area}, {venue.city}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-neutral-600">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {venue.capacity}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-black">
                    <DollarSign className="h-3 w-3" />
                    {venue.basePriceEvening.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {onView && (
                    <Button variant="ghost" size="sm" onClick={() => onView(venue)} className="h-8 px-2">
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(venue)} className="h-8 px-2">
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group overflow-hidden border-silver-200 bg-white hover:shadow-2xl hover:shadow-black/10 transition-all duration-300">
        <div className="relative h-48 overflow-hidden">
          <Image
            src={displayImage}
            alt={venue.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <div className="absolute top-3 right-3 flex gap-2">
            {getStatusBadge(venue.status)}
          </div>

          {venue.rating && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-full text-xs font-semibold text-black flex items-center shadow-lg">
              <Star className="h-3.5 w-3.5 mr-1 fill-yellow-500 text-yellow-500" />
              {venue.rating}
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-black mb-2 group-hover:text-neutral-700 transition-colors line-clamp-1">
            {venue.name}
          </h3>

          <div className="flex items-center gap-1 text-neutral-600 text-sm mb-3">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{venue.area}, {venue.city}</span>
          </div>

          {venue.description && (
            <p className="text-neutral-600 text-sm line-clamp-2 mb-3 h-10">
              {venue.description}
            </p>
          )}

          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xl font-bold text-black">₹{venue.basePriceEvening.toLocaleString()}</span>
              <span className="text-xs text-neutral-500"> / evening</span>
            </div>
            <div className="text-sm text-neutral-600">
              Up to {venue.capacity} guests
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
            <span className="px-2 py-1 bg-silver-100 rounded">{venue.type}</span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex gap-2">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-silver-300 text-black hover:bg-silver-50"
              onClick={() => onView(venue)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          )}
          {onEdit && (
            <Button
              variant="silver"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(venue)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => onDelete(venue)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
