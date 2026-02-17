import { MOCK_VENUES } from "@/services/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Star, Check, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface VenueDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VenueDetailPage({ params }: VenueDetailPageProps) {
  const { id } = await params;
  const venue = MOCK_VENUES.find((v) => v.id === id);

  if (!venue) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/venues" className="inline-flex items-center text-sm text-gray-500 hover:text-purple-600 mb-6">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Venues
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image Gallery */}
          <div className="overflow-hidden rounded-2xl bg-gray-100">
            <img
              src={venue.images[0]}
              alt={venue.name}
              className="h-[400px] w-full object-cover"
            />
          </div>

          {/* Title and Info */}
          <div>
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
                <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="font-bold text-yellow-700">{venue.rating}</span>
                </div>
            </div>
            
            <div className="flex items-center text-gray-500 mb-6">
              <MapPin className="h-5 w-5 mr-2 text-pink-500" />
              {venue.address}, {venue.city}
            </div>

            <p className="text-gray-700 leading-relaxed text-lg">
              {venue.description}
            </p>
          </div>

          {/* Amenities */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Amenities</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {venue.amenities.map((amenity) => (
                <div key={amenity} className="flex items-center text-gray-600">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                    <Check className="h-4 w-4" />
                  </div>
                  {amenity}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm sticky top-24">
            <div className="mb-6">
              <span className="text-3xl font-bold text-purple-600">₹{venue.price}</span>
              <span className="text-gray-500"> / {venue.priceUnit === 'per_day' ? 'day' : 'hour'}</span>
            </div>

            <div className="space-y-4 mb-6">
                <div className="flex items-center text-gray-600">
                    <Users className="h-5 w-5 mr-3 text-gray-400" />
                    <span>Capacity: <span className="font-semibold text-gray-900">{venue.capacity} guests</span></span>
                </div>
                <div className="flex items-center text-gray-600">
                    <Calendar className="h-5 w-5 mr-3 text-gray-400" />
                    <span>Availability: <span className="font-semibold text-green-600">Available Now</span></span>
                </div>
            </div>

            <div className="space-y-3">
              <Button className="w-full h-12 text-lg">Book Now</Button>
              <Button variant="outline" className="w-full">Add to Event Plan</Button>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500">
              You won&apos;t be charged yet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
