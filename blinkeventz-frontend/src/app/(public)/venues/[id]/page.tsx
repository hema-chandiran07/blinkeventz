import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Star, Check, ArrowLeft, Calendar, Award, Shield, Heart, Zap, Clock, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_VENUES } from "@/services/mock-data";
import { VenueBookingSidebar } from "./venue-booking-sidebar";
import { ReviewsSection } from "./reviews-section";

interface VenueDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

const getVenueStats = () => {
  return [
    { label: "Capacity", value: "2000+", icon: Users },
    { label: "Events Hosted", value: "300+", icon: TrendingUp },
    { label: "Happy Clients", value: "280+", icon: Heart },
    { label: "Response Time", value: "~1hr", icon: Zap },
  ];
};

export default async function VenueDetailPage({ params }: VenueDetailPageProps) {
  const { id } = await params;
  const venue = MOCK_VENUES.find((v) => v.id === id);

  if (!venue) {
    notFound();
  }

  const priceUnit = venue.priceUnit === 'per_day' ? 'day' : 'hour';
  const stats = getVenueStats();

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <Link href="/venues" className="inline-flex items-center text-sm text-gray-500 hover:text-purple-600 mb-6 transition-colors">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Venues
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* MAIN CONTENT */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <div className="overflow-hidden rounded-2xl bg-gray-100 relative h-[400px]">
            <Image
              src={venue.images[0]}
              alt={venue.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold text-purple-700 flex items-center shadow-lg">
              <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
              {venue.rating}
            </div>
          </div>

          {/* Venue Info Header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{venue.name}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-purple-50 text-purple-700 border border-purple-200">
                    Premium Venue
                  </Badge>
                  <div className="flex items-center text-gray-500 text-sm">
                    <MapPin className="h-4 w-4 mr-1 text-pink-500" />
                    {venue.area}, {venue.address}, {venue.city}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600">₹{venue.price.toLocaleString("en-IN")}</div>
                <div className="text-sm text-gray-500">per {priceUnit}</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center text-center">
                  <stat.icon className="h-5 w-5 text-purple-500 mb-1" />
                  <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* About Venue */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">About the Venue</h2>
            <p className="text-gray-700 leading-relaxed">
              {venue.description || "A premium venue perfect for weddings, corporate events, and special celebrations. Our dedicated team ensures every detail is taken care of to make your event memorable."}
            </p>
            
            {/* Why Choose This Venue */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
                <Shield className="h-6 w-6 text-purple-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Prime Location</h4>
                  <p className="text-sm text-gray-600">Easily accessible location</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                <Award className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Premium Amenities</h4>
                  <p className="text-sm text-gray-600">World-class facilities</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Flexible Timing</h4>
                  <p className="text-sm text-gray-600">Extended hours available</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-pink-50 rounded-xl">
                <Heart className="h-6 w-6 text-pink-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Expert Staff</h4>
                  <p className="text-sm text-gray-600">Professional event support</p>
                </div>
              </div>
            </div>
          </div>

          {/* Capacity & Pricing */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Capacity & Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2 text-purple-700 mb-2">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">Capacity</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{venue.capacity}</div>
                <div className="text-sm text-purple-500">Maximum guests</div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold">Availability</span>
                </div>
                <div className="text-lg font-bold text-green-600">Available Now</div>
                <div className="text-sm text-green-500">Book your date</div>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Amenities & Features</h2>
            <div className="grid grid-cols-2 gap-3">
              {venue.amenities.map((amenity) => (
                <div key={amenity} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews & Ratings */}
          <ReviewsSection 
            venueId={venue.id}
            venueName={venue.name}
            initialRating={venue.rating}
          />
        </div>

        {/* SIDEBAR - Sticky Booking Card */}
        <VenueBookingSidebar venue={venue} />
      </div>
    </div>
  );
}
