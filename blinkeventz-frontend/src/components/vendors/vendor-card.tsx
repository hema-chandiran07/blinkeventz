import Link from "next/link";
import { Vendor } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Camera, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VendorCardProps {
  vendor: Vendor;
}

export function VendorCard({ vendor }: VendorCardProps) {
  const Icon = vendor.serviceType === 'Catering' ? Utensils : Camera;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all group h-full flex flex-col">
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={vendor.images[0]}
          alt={vendor.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-purple-700 flex items-center shadow-sm">
          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
          {vendor.rating}
        </div>
        <div className="absolute top-4 left-4">
             <Badge className="bg-white/90 text-purple-700 hover:bg-white">{vendor.serviceType}</Badge>
        </div>
      </div>
      <CardContent className="p-5 flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{vendor.name}</h3>
        <div className="flex items-center text-gray-500 text-sm mb-4">
          <MapPin className="h-4 w-4 mr-1 text-pink-500" />
          {vendor.city}
        </div>
        <p className="text-gray-600 text-sm line-clamp-2">{vendor.description}</p>
      </CardContent>
      <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-gray-50 bg-gray-50/50 mt-auto">
        <div>
          <span className="text-sm font-medium text-gray-500">Price Range</span>
          <div className="text-lg font-bold text-purple-600">{vendor.priceRange}</div>
        </div>
        <Link href={`/vendors/${vendor.id}`}>
          <Button size="sm" variant="secondary">View Profile</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
