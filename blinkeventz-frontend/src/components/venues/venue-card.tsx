import Link from "next/link";
import { Venue } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Star } from "lucide-react";

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all group h-full flex flex-col">
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={venue.images[0]}
          alt={venue.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-purple-700 flex items-center shadow-sm">
          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
          {venue.rating}
        </div>
      </div>
      <CardContent className="p-5 flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{venue.name}</h3>
        <div className="flex items-center text-gray-500 text-sm mb-4">
          <MapPin className="h-4 w-4 mr-1 text-pink-500" />
          {venue.city}
        </div>
        <div className="flex items-center text-gray-500 text-sm mb-4">
            <Users className="h-4 w-4 mr-1 text-purple-500" />
            Up to {venue.capacity} guests
        </div>
        <p className="text-gray-600 text-sm line-clamp-2">{venue.description}</p>
      </CardContent>
      <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-gray-50 bg-gray-50/50 mt-auto">
        <div>
          <span className="text-lg font-bold text-purple-600">₹{venue.price}</span>
          <span className="text-xs text-gray-500 font-normal"> / {venue.priceUnit === 'per_day' ? 'day' : 'hour'}</span>
        </div>
        <Link href={`/venues/${venue.id}`}>
          <Button size="sm">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
