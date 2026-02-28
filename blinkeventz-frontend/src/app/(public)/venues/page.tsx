"use client";

import { useEffect, useState, Suspense } from "react";
import { VenueCard } from "@/components/venues/venue-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterModal, type FilterState } from "@/components/ui/filter-modal";
import { Search, Building, Hotel, Star, SlidersHorizontal, X, Loader2, AlertCircle, MapPin } from "lucide-react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import type { Venue } from "@/types";
import { motion } from "framer-motion";

// Filter configuration matching Prisma VenueType enum
const VENUE_FILTER_CONFIG: { id: string | 'all'; label: string; icon: any }[] = [
  { id: "all", label: "All", icon: Star },
  { id: "T Nagar", label: "T Nagar", icon: Building },
  { id: "Adyar", label: "Adyar", icon: Hotel },
  { id: "Velachery", label: "Velachery", icon: Building },
  { id: "Anna Nagar", label: "Anna Nagar", icon: Hotel },
  { id: "OMR", label: "OMR", icon: Building },
];

export default function VenuesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-silver-400" />
        <p className="text-silver-400">Loading venues...</p>
      </div>
    }>
      <VenuesContent />
    </Suspense>
  );
}

function VenuesContent() {
  const searchParams = useSearchParams();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    minBudget: "",
    maxBudget: "",
    location: "",
    locations: [],
    useNearMe: false,
    timing: "",
    availability: "any",
    eventDate: "",
    eventTime: "",
  });

  // Get filter params from URL
  const urlType = searchParams.get('type');
  const urlArea = searchParams.get('area');
  const urlEvent = searchParams.get('event');

  // Fetch venues from backend
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);
        const response = await api.get('/venues');
        // Filter only active venues (Prisma: status = ACTIVE)
        const activeVenues = (response.data || []).filter((v: Venue) =>
          v.status === 'ACTIVE'
        );
        setVenues(activeVenues);
      } catch (error: any) {
        console.error("Error fetching venues:", error);
        toast.error(error?.response?.data?.message || "Failed to load venues");
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  // Apply URL filters on mount
  useEffect(() => {
    if (urlType) {
      setCityFilter(urlType);
    }
  }, [urlType]);

  // Filter venues based on search and filters
  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = cityFilter === "all" || venue.area === cityFilter || venue.city === cityFilter;
    const matchesArea = !urlArea || venue.area?.toLowerCase().includes(urlArea.toLowerCase());
    return matchesSearch && matchesCity && matchesArea;
  });

  const handleFilterApply = (filters: FilterState) => {
    setAdvancedFilters(filters);
    if (filters.location) {
      setCityFilter(filters.location);
    }
  };

  const clearFilters = () => {
    setAdvancedFilters({
      minBudget: "",
      maxBudget: "",
      location: "",
      locations: [],
      useNearMe: false,
      timing: "",
      availability: "any",
      eventDate: "",
      eventTime: "",
    });
    setCityFilter("all");
    setSearchTerm("");
  };

  const hasActiveFilters = cityFilter !== "all" || searchTerm || advancedFilters.minBudget || advancedFilters.maxBudget;

  return (
    <motion.div
      className="min-h-screen bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section */}
      <motion.div
        className="relative bg-gradient-to-r from-black via-silver-950 to-black py-12 border-b border-silver-800"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.05]" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold text-white mb-2">
              Find Your Perfect Venue
            </h1>
            <p className="text-silver-300 text-lg">
              Discover stunning spaces for your special events
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <Input
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-neutral-300 text-black placeholder:text-neutral-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilterModal(true)}
              className="border-neutral-300 text-black hover:bg-neutral-50 hover:text-black"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-neutral-600 hover:text-black"
              >
                Clear all
              </Button>
            )}
          </div>
        </motion.div>

        {/* Filter Pills */}
        <motion.div
          className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {VENUE_FILTER_CONFIG.map((filter) => {
            const Icon = filter.icon;
            return (
              <motion.button
                key={filter.id}
                onClick={() => setCityFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                  cityFilter === filter.id
                    ? "bg-gradient-to-r from-black to-silver-800 text-white border-black shadow-lg shadow-black/20"
                    : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 hover:text-black"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Results Count */}
        <motion.div
          className="mb-6 flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-neutral-600">
            <span className="text-black font-semibold">{filteredVenues.length}</span> venues found
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                <div className="h-48 bg-neutral-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-neutral-200 rounded animate-pulse" />
                  <div className="h-4 bg-neutral-200 rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-neutral-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredVenues.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-20 w-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-black mb-2">No venues found</h3>
            <p className="text-silver-400 mb-6">
              Try adjusting your search or filters to find what you&apos;re looking for
            </p>
            <Button variant="premium" onClick={clearFilters}>
              Clear all filters
            </Button>
          </motion.div>
        )}

        {/* Venues Grid */}
        {!loading && filteredVenues.length > 0 && (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {filteredVenues.map((venue, index) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <VenueCard venue={venue} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
        type="venues"
        currentFilters={advancedFilters}
      />
    </motion.div>
  );
}
