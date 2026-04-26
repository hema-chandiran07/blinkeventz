"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { venuesApi } from "@/lib/api-endpoints";
import { VenueCard, type Venue } from "@/components/venues/venue-card";

type VenueArray = Venue[];

function VenueCardSkeleton() {
  return (
    <div className="rounded-2xl border border-silver-800 bg-card overflow-hidden">
      <div className="aspect-[4/3] animate-pulse bg-silver-900" />
      <div className="p-5 space-y-4">
        <div className="h-6 bg-silver-800 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-silver-800 rounded w-1/2 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 bg-silver-800 rounded w-16 animate-pulse" />
          <div className="h-6 bg-silver-800 rounded w-16 animate-pulse" />
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-silver-800">
          <div className="h-8 bg-silver-800 rounded w-24 animate-pulse" />
          <div className="h-9 w-9 bg-silver-800 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

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
      <div className="w-20 h-20 rounded-full bg-silver-900 flex items-center justify-center mb-6 border border-silver-800">
        <MapPin className="h-10 w-10 text-silver-500" />
      </div>
      <h3 className="text-xl font-semibold text-card-foreground mb-2">{title}</h3>
      <p className="text-silver-400 text-center max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export default function FeaturedVenues() {
  const [venues, setVenues] = useState<VenueArray>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchVenues = async () => {
    try {
      setIsLoading(true);
      setError(false);
      const response = await venuesApi.getAll();
    // handle both array and object responses
const venuesArray = Array.isArray(response.data)
  ? response.data
  : response.data.venues || response.data.data || [];

// take first 3 venues and map properly
const featuredVenues = venuesArray
  .slice(0, 3)
  .map((v: Record<string, unknown>) => ({
    ...v,
    id: String(v.id),
  }));
      setVenues(featuredVenues);
    } catch (err) {
      console.error("Error fetching venues:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-card-foreground">Featured Venues</h2>
            <div className="w-20 h-1 bg-silver-600 mt-3 rounded-full" />
          </div>
          <Link 
            href="/venues" 
            className="flex items-center text-silver-400 hover:text-white font-medium transition-colors"
          >
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <VenueCardSkeleton />
            <VenueCardSkeleton />
            <VenueCardSkeleton />
          </div>
        ) : error ? (
          <FallbackState
            title="Unable to Load Venues"
            message="We encountered an issue while fetching venues. Please check your connection and try again."
            onRetry={fetchVenues}
          />
        ) : venues.length === 0 ? (
          <FallbackState
            title="No Venues Available"
            message="There are currently no featured venues. Check back soon or browse all available venues."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 lg:px-8">
            {venues.slice(0, 3).map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}