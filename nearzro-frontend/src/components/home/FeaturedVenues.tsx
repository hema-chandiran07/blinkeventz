"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, Star, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { venuesApi } from "@/lib/api-endpoints";

// Type definition based on Prisma schema
interface Venue {
  id: number;
  name: string;
  type: string;
  description?: string;
  address: string;
  city: string;
  area: string;
  pincode: string;
  capacityMin: number;
  capacityMax: number;
  basePriceMorning?: number;
  basePriceEvening?: number;
  basePriceFullDay?: number;
  amenities?: string;
  policies?: string;
  status: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Skeleton loader component for venue cards
function VenueCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-200 ring-2 ring-zinc-300/60 inset rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(192,192,192,0.3)]">
      <div className="h-52 bg-gradient-to-r from-zinc-300 via-zinc-200 to-zinc-300 animate-pulse" />
      <div className="p-5 space-y-4">
        <div className="h-6 bg-zinc-300 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-zinc-300 rounded w-1/2 animate-pulse" />
        <div className="flex justify-between items-center">
          <div className="h-8 bg-zinc-300 rounded w-1/3 animate-pulse" />
          <div className="h-9 bg-zinc-300 rounded w-24 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Elegant error/empty state component
function FallbackState({ 
  title, 
  message, 
  onRetry 
}: { 
  title: string; 
  message: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-8">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-200 ring-2 ring-zinc-300/60 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(192,192,192,0.3)]">
        <MapPin className="h-10 w-10 text-zinc-600" />
      </div>
      <h3 className="text-xl font-semibold text-black mb-2">{title}</h3>
      <p className="text-zinc-600 text-center max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          className="bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 border-2 border-zinc-400 text-white hover:from-zinc-600 hover:via-zinc-500 hover:to-zinc-600 hover:border-zinc-300 shadow-[0_0_20px_rgba(192,192,192,0.2)] hover:shadow-[0_0_30px_rgba(192,192,192,0.4)] transition-all duration-300"
          onClick={onRetry}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * FeaturedVenues Component - CRED-Inspired Dark Theme
 * Real data fetching with elegant loading and error states
 */
export default function FeaturedVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch featured venues from API
  const fetchVenues = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await venuesApi.getAll();
      // Handle both array and object responses
      const venuesArray = Array.isArray(response.data) 
        ? response.data 
        : response.data.venues || response.data.data || [];
      // Get first 3 venues as featured
      const featuredVenues = venuesArray.slice(0, 3);
      setVenues(featuredVenues);
    } catch (err) {
      console.error("Error fetching venues:", err);
      setError("Failed to load venues");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  // Format price in Indian currency
  const formatPrice = (price?: number) => {
    if (!price) return "Price on request";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get venue image or fallback
  const getVenueImage = (venue: Venue) => {
    if (venue.images && venue.images.length > 0) {
      return venue.images[0];
    }
    return "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80";
  };

  return (
    <motion.section
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeInUp}
      transition={{ duration: 0.7 }}
    >
      <motion.div
        className="flex items-center justify-between mb-8"
        variants={fadeInLeft}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h2 className="text-3xl font-bold text-white">Featured Venues</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-600 mt-2 rounded-full" />
        </div>
        <Link href="/venues" className="group flex items-center text-zinc-400 hover:text-white font-medium transition-colors">
          View all
          <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>

      <motion.div
        className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {/* Loading state */}
        {isLoading && (
          <>
            <VenueCardSkeleton />
            <VenueCardSkeleton />
            <VenueCardSkeleton />
          </>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <FallbackState
            title="Unable to Load Venues"
            message="We encountered an issue while fetching venues. Please check your connection and try again."
            onRetry={fetchVenues}
          />
        )}

        {/* Empty state */}
        {!isLoading && !error && venues.length === 0 && (
          <FallbackState
            title="No Venues Available"
            message="There are currently no featured venues. Check back soon or browse all available venues."
          />
        )}

        {/* Venue cards */}
        {!isLoading && !error && venues.map((venue) => (
          <motion.div
            key={venue.id}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
          >
            <Link href={`/venues/${venue.id}`}>
              <Card className="group bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-200 ring-2 ring-zinc-300/60 inset overflow-hidden cursor-pointer hover:ring-zinc-200 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] shadow-[0_0_30px_rgba(192,192,192,0.3)] hover:shadow-[0_0_40px_rgba(192,192,192,0.5)]">
                <div className="relative h-52 overflow-hidden">
                  <div
                    className="h-full w-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                    style={{ backgroundImage: `url(${getVenueImage(venue)})` }}
                  />
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                  {/* Rating badge with liquid gold star */}
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-3 py-1.5 rounded-full text-xs font-semibold text-black flex items-center ring-2 ring-amber-300/50 shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                    <Star className="h-3.5 w-3.5 mr-1 fill-current text-amber-600" />
                    4.8
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="text-xl font-bold text-black mb-2 group-hover:text-zinc-800 transition-colors">
                    {venue.name}
                  </h3>
                  <p className="text-zinc-600 text-sm mb-4 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-zinc-500" /> {venue.area}, {venue.city}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-black">
                        {formatPrice(venue.basePriceFullDay)}
                      </span>
                      <span className="text-sm text-zinc-500"> / day</span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 border-2 border-zinc-400 text-white hover:from-zinc-600 hover:via-zinc-500 hover:to-zinc-600 hover:border-zinc-300 font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(192,192,192,0.2)] hover:shadow-[0_0_25px_rgba(192,192,192,0.4)]"
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
